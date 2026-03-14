import { logger } from "../utils/logger.js";

export function httpLogger(req, _res, next) {
  logger.debug(`${req.method} ${req.url}`);
  next();
}
