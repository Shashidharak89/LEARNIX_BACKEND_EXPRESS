import { WebSocketServer, WebSocket } from "ws";
import { getUserFromToken } from "../../../../common/utils/auth.helper.js";
import { UpdateWebSocketService } from "./websocket-upload.service.js";
import Update from "../../../../models/updates/Update.js";

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

  // Handle HTTP Upgrade request with flexible Authorization check
  httpServer.on("upgrade", async (request, socket, head) => {
    try {
      const host = request.headers.host || "localhost";
      const url = new URL(request.url, `http://${host}`);
      const cleanPath = url.pathname.replace(/\/+$/, "") || "/";

      const isUpdatesWs =
        cleanPath === "/ws/updates/upload" ||
        cleanPath === "/ws/updates" ||
        cleanPath === "/api/updates/upload" ||
        cleanPath === "/api/updates/ws" ||
        cleanPath === "/ws";

      if (isUpdatesWs) {
        // Extract Bearer token from Authorization header or URL query parameter
        let token = null;
        const authHeader = request.headers.authorization || request.headers.Authorization;
        if (authHeader && typeof authHeader === "string") {
          token = authHeader.replace(/^Bearer\s+/i, "").trim();
        }
        if (!token) {
          token = url.searchParams.get("token") || url.searchParams.get("jwt");
          if (token && typeof token === "string") {
            token = token.replace(/^Bearer\s+/i, "").trim();
          }
        }

        if (token && typeof token === "string") {
          token = token.replace(/^["']|["']$/g, "").trim();
        }

        let authenticatedUser = null;

        // If token provided during upgrade, validate it
        if (token) {
          const authResult = await getUserFromToken(token);
          if (authResult.valid && authResult.user) {
            authenticatedUser = authResult.user;
          } else {
            // Reject with 401 Unauthorized if invalid token was explicitly supplied
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
        }

        // Upgrade connection
        request.user = authenticatedUser;
        request.token = token || null;

        wss.handleUpgrade(request, socket, head, (ws) => {
          ws.user = authenticatedUser;
          ws.token = token || null;
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
    ws.user = ws.user || request.user || null;
    ws.activeSessionIds = new Set();

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    if (ws.user) {
      sendEvent(ws, "authenticated", {
        data: {
          userId: ws.user._id,
          name: ws.user.name,
          usn: ws.user.usn,
          message: "WebSocket successfully authenticated with Bearer token",
        },
      });
    }

    sendEvent(ws, "connected", {
      data: {
        message: "Connected to Learnix Updates Upload WebSocket",
        authenticated: Boolean(ws.user),
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
          // 1. Explicit Authentication message (if token rotated or provided on connect)
          case "auth": {
            let token = data.token || data.jwt;
            if (!token) {
              return sendEvent(ws, "upload_error", {
                error: "Token missing in auth event payload",
              });
            }

            token = token.toString().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "").trim();

            const authResult = await getUserFromToken(token);
            if (!authResult.valid || !authResult.user) {
              return sendEvent(ws, "upload_error", {
                error: authResult.error || "Authentication failed",
              });
            }

            ws.user = authResult.user;
            ws.token = token;
            return sendEvent(ws, "authenticated", {
              data: {
                userId: ws.user._id,
                name: ws.user.name,
                usn: ws.user.usn,
              },
            });
          }

          // 2. Initialize chunked upload session (create or edit)
          case "edit_update":
          case "edit_init":
          case "upload_init": {
            // Check if token is attached to upload_init data payload as fallback
            if (!ws.user && (data.token || data.jwt)) {
              let token = (data.token || data.jwt).toString().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "").trim();
              const authResult = await getUserFromToken(token);
              if (authResult.valid && authResult.user) {
                ws.user = authResult.user;
                ws.token = token;
                sendEvent(ws, "authenticated", {
                  data: {
                    userId: ws.user._id,
                    name: ws.user.name,
                    usn: ws.user.usn,
                  },
                });
              }
            }

            if (!ws.user) {
              return sendEvent(ws, "upload_error", {
                error: "Authentication required before initiating upload.",
              });
            }

            const {
              title,
              content,
              links,
              visibility,
              files = [],
              updateId,
              existingFiles = [],
            } = data;

            // If editing an existing update, verify ownership
            if (updateId) {
              const existingDoc = await Update.findById(updateId);
              if (!existingDoc) {
                return sendEvent(ws, "upload_error", {
                  error: "Update to edit not found",
                });
              }
              const isOwner = existingDoc.userId.toString() === ws.user._id.toString();
              const isAdmin = ws.user.role === "admin" || ws.user.role === "superadmin";
              if (!isOwner && !isAdmin) {
                return sendEvent(ws, "upload_error", {
                  error: "Forbidden: You are not authorized to edit this update",
                });
              }
            }

            // If no files attached, create or edit update directly
            if (!Array.isArray(files) || files.length === 0) {
              const sessionInfo = UpdateWebSocketService.createSession({
                userId: ws.user._id,
                userRole: ws.user.role || "user",
                title,
                content,
                links,
                visibility,
                files: [],
                updateId,
                existingFiles,
              });

              const update = await UpdateWebSocketService.finalizeWithoutFiles(
                sessionInfo.sessionId
              );

              return sendEvent(ws, "upload_completed", {
                data: {
                  sessionId: sessionInfo.sessionId,
                  message: updateId
                    ? "Update edited successfully"
                    : "Update created successfully (no files attached)",
                  update,
                },
              });
            }

            const sessionInfo = UpdateWebSocketService.createSession({
              userId: ws.user._id,
              userRole: ws.user.role || "user",
              title,
              content,
              links,
              visibility,
              files,
              updateId,
              existingFiles,
            });

            ws.activeSessionIds.add(sessionInfo.sessionId);

            return sendEvent(ws, "upload_initialized", {
              data: {
                sessionId: sessionInfo.sessionId,
                totalFiles: sessionInfo.totalFiles,
                totalExpectedChunks: sessionInfo.totalExpectedChunks,
                message: updateId
                  ? "Edit session created. Ready to receive file chunks."
                  : "Session created. Ready to receive file chunks.",
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
