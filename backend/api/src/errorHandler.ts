import { STATUS_CODES } from "node:http";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { InvalidRequestError } from "./routes/schemas.js";

/**
 * Validation failures become a 400 with the issue list, other 4xx errors keep their
 * status and message, and anything else is logged and answered with a generic 5xx so
 * database errors (query text, bound params) never reach the client.
 */
export function errorHandler(err: FastifyError, req: FastifyRequest, reply: FastifyReply) {
  if (err instanceof InvalidRequestError) {
    return reply.status(err.statusCode).send(err.toBody());
  }

  const statusCode = typeof err.statusCode === "number" && err.statusCode >= 400 ? err.statusCode : 500;
  if (statusCode >= 500) {
    req.log.error({ err }, "request failed");
    return reply.status(statusCode).send({
      statusCode,
      error: STATUS_CODES[statusCode] ?? "Internal Server Error",
    });
  }

  // Plugins such as @fastify/rate-limit throw plain response objects, send those as they are.
  if (!(err instanceof Error)) return reply.status(statusCode).send(err);
  return reply.status(statusCode).send({
    statusCode,
    code: err.code,
    error: STATUS_CODES[statusCode],
    message: err.message,
  });
}
