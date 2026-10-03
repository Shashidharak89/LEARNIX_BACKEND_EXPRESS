import { WebSocketServer, WebSocket } from "ws";
import { getUserFromToken } from "../../../../common/utils/auth.helper.js";
import { UpdateWebSocketService } from "./websocket-upload.service.js";

/**
 * Send a structured JSON event to a WebSocket client.
 * @param {WebSocket} ws
 * @param {string} event
 * @param {object} data
 */
function sendEvent(ws, event, data = {}) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, ...data, timestamp: new Date().toISOString() }));
  }
}

/**
 * Initializes the WebSocket server for chunked updates upload.
 * Attached to the shared HTTP server on paths:
 *   - /ws/updates/upload
 *   - /ws/updates
 *
 * @param {import("http").Server} httpServer
 * @returns {WebSocketServer}
 */
export function initUpdatesWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP Upgrade request with strict Authorization check
  httpServer.on("upgrade", async (request, socket, head) => {
    try {
      const host = request.headers.host || "localhost";
      const url = new URL(request.url, `http://${host}`);
      const pathname = url.pathname;

      if (pathname === "/ws/updates/upload" || pathname === "/ws/updates") {
        // Extract Bearer token from Authorization header or URL query parameter
        let token = null;
        const authHeader = request.headers.authorization || request.headers.Authorization;
        if (authHeader && typeof authHeader === "string") {
          token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
        }
        if (!token) {
          token = url.searchParams.get("token") || url.searchParams.get("jwt");
        }

        // Strict authorization requirement: reject with 401 Unauthorized if token missing
        if (!token) {
          const errorPayload = JSON.stringify({
            success: false,
            statusCode: 401,
            message: "Unauthorized: Missing Authorization header (Bearer <token>) or token parameter",
          });
          socket.write(
            `HTTP/1.1 401 Unauthorized\r\n` +
            `Content-Type: application/json\r\n` +
            `Content-Length: ${Buffer.byteLength(errorPayload)}\r\n` +
            `Connection: close\r\n\r\n` +
            errorPayload
          );
          socket.destroy();
          return;
        }

        // Validate token against database
        const authResult = await getUserFromToken(token);
        if (!authResult.valid || !authResult.user) {
          const errorPayload = JSON.stringify({
            success: false,
            statusCode: 401,
            message: authResult.error || "Unauthorized: Invalid or expired Bearer token",
          });
          socket.write(
            `HTTP/1.1 401 Unauthorized\r\n` +
            `Content-Type: application/json\r\n` +
            `Content-Length: ${Buffer.byteLength(errorPayload)}\r\n` +
            `Connection: close\r\n\r\n` +
            errorPayload
          );
          socket.destroy();
          return;
        }

        // Upgrade connection with authenticated user attached
        request.user = authResult.user;
        request.token = token;

        wss.handleUpgrade(request, socket, head, (ws) => {
          ws.user = authResult.user;
          ws.token = token;
          wss.emit("connection", ws, request);
        });
      }
    } catch (err) {
      console.error("[WebSocket Upgrade Error]:", err.message);
      socket.destroy();
    }
  });

  // Client connection handler
  wss.on("connection", async (ws, request) => {
    ws.isAlive = true;
    ws.user = ws.user || request.user;
    ws.activeSessionIds = new Set();

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Notify client that connection is authenticated and ready
    sendEvent(ws, "authenticated", {
      data: {
        userId: ws.user._id,
        name: ws.user.name,
        usn: ws.user.usn,
        message: "WebSocket successfully authenticated with Bearer token",
      },
    });

    sendEvent(ws, "connected", {
      data: {
        message: "Connected to Learnix Updates Upload WebSocket (Authorized)",
        authenticated: true,
      },
    });

    // Handle incoming messages
    ws.on("message", async (rawMessage) => {
      let payload;
      try {
        payload = JSON.parse(rawMessage.toString());
      } catch (e) {
        return sendEvent(ws, "upload_error", {
          error: "Invalid JSON format. Expected { event, data }",
        });
      }

      const { event, data = {} } = payload;

      try {
        switch (event) {
          // 1. Explicit Authentication message (if token rotated)
          case "auth": {
            const token = data.token || data.jwt;
            if (!token) {
              return sendEvent(ws, "upload_error", {
                error: "Token missing in auth event payload",
              });
            }

            const authResult = await getUserFromToken(token);
            if (!authResult.valid || !authResult.user) {
              return sendEvent(ws, "upload_error", {
                error: authResult.error || "Authentication failed",
              });
            }

            ws.user = authResult.user;
            return sendEvent(ws, "authenticated", {
              data: {
                userId: ws.user._id,
                name: ws.user.name,
                usn: ws.user.usn,
              },
            });
          }

          // 2. Initialize chunked upload session
          case "upload_init": {
            if (!ws.user) {
              return sendEvent(ws, "upload_error", {
                error: "Authentication required before initiating upload.",
              });
            }

            const { title, content, links, visibility, files = [] } = data;

            // If no files attached, create update directly
            if (!Array.isArray(files) || files.length === 0) {
              const sessionInfo = UpdateWebSocketService.createSession({
                userId: ws.user._id,
                title,
                content,
                links,
                visibility,
                files: [],
              });

              const update = await UpdateWebSocketService.finalizeWithoutFiles(
                sessionInfo.sessionId
              );

              return sendEvent(ws, "upload_completed", {
                data: {
                  message: "Update created successfully (no files attached)",
                  update,
                },
              });
            }

            const sessionInfo = UpdateWebSocketService.createSession({
              userId: ws.user._id,
              title,
              content,
              links,
              visibility,
              files,
            });

            ws.activeSessionIds.add(sessionInfo.sessionId);

            return sendEvent(ws, "upload_initialized", {
              data: {
                sessionId: sessionInfo.sessionId,
                totalFiles: sessionInfo.totalFiles,
                totalExpectedChunks: sessionInfo.totalExpectedChunks,
                message: "Session created. Ready to receive file chunks.",
              },
            });
          }

          // 3. Receive individual chunk
          case "upload_chunk": {
            if (!ws.user) {
              return sendEvent(ws, "upload_error", {
                error: "Authentication required",
              });
            }

            const { sessionId, fileId, chunkIndex, totalChunks, chunkData } = data;

            if (!sessionId || !fileId || chunkIndex === undefined || !chunkData) {
              return sendEvent(ws, "upload_error", {
                error: "Missing required chunk fields: sessionId, fileId, chunkIndex, totalChunks, chunkData",
              });
            }

            // Process chunk
            const result = await UpdateWebSocketService.handleChunk({
              sessionId,
              fileId,
              chunkIndex,
              totalChunks,
              chunkData,
            });

            // Emit real-time progress update back to client
            sendEvent(ws, "upload_progress", {
              data: {
                sessionId,
                fileId,
                chunkIndex,
                totalChunks,
                fileProgress: result.fileProgress,
                overallProgress: result.overallProgress,
                status: "uploading",
              },
            });

            // If a file just finished assembling and uploading to Cloudinary
            if (result.isFileComplete && result.uploadedFile) {
              sendEvent(ws, "file_completed", {
                data: {
                  sessionId,
                  fileId,
                  file: result.uploadedFile,
                  message: `File '${result.uploadedFile.name}' uploaded to Cloudinary successfully`,
                },
              });
            }

            // If all files in the session are finished and DB update record is saved
            if (result.isSessionComplete && result.update) {
              ws.activeSessionIds.delete(sessionId);
              sendEvent(ws, "upload_completed", {
                data: {
                  sessionId,
                  message: "Update and all files uploaded and stored successfully",
                  update: result.update,
                },
              });
            }

            break;
          }

          // 4. Client cancels/aborts upload
          case "cancel_upload": {
            const { sessionId } = data;
            if (sessionId) {
              await UpdateWebSocketService.cleanupSession(sessionId, true);
              ws.activeSessionIds.delete(sessionId);
              sendEvent(ws, "upload_cancelled", {
                data: { sessionId, message: "Upload session cancelled and cleaned up" },
              });
            }
            break;
          }

          // 5. Ping / Keepalive
          case "ping": {
            sendEvent(ws, "pong", { data: { timestamp: Date.now() } });
            break;
          }

          default: {
            sendEvent(ws, "upload_error", {
              error: `Unknown event '${event}'`,
            });
          }
        }
      } catch (handlerErr) {
        console.error("[WebSocket Handler Error]:", handlerErr);
        sendEvent(ws, "upload_error", {
          error: handlerErr.message || "Internal WebSocket server error",
          statusCode: handlerErr.statusCode || 500,
        });
      }
    });

    // Cleanup when client disconnects
    ws.on("close", () => {
      // Abort active unfinished sessions for this client
      if (ws.activeSessionIds && ws.activeSessionIds.size > 0) {
        for (const sessionId of ws.activeSessionIds) {
          UpdateWebSocketService.cleanupSession(sessionId, true);
        }
      }
    });

    ws.on("error", (err) => {
      console.warn("[WebSocket Client Error]:", err.message);
    });
  });

  // Heartbeat interval to check alive connections every 30s
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      if (!client.isAlive) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  console.log("🔌 WebSocket server mounted at ws://<host>:<port>/ws/updates/upload");

  return wss;
}
