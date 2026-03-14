import { logger } from "../utils/logger.js";

export function errorHandler(err, _req, res, _next) {
  logger.error(err.message, { stack: err.stack });

  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || "Internal server error",
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    },
  });
}
