import app from "./src/app.js";
import { connectDB } from "./src/config/database.js";
import { env } from "./src/config/env.js";

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Learnix Express API running on port ${PORT} in ${env.NODE_ENV} mode`);
      console.log(`👉 Health check: http://localhost:${PORT}/health`);
      console.log(`👉 Updates API: http://localhost:${PORT}/api/updates/getupdates`);
      console.log(`👉 Resources API: http://localhost:${PORT}/api/resources/getresources`);
    });

    // Graceful Shutdown
    const shutdown = (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Global Exception Handlers
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startServer();
