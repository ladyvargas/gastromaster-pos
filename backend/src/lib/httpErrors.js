export function httpError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}
export const badRequest = (code, message, details) => httpError(400, code, message, details);
export const unauthorized = (code, message) => httpError(401, code, message);
export const forbidden = (code, message) => httpError(403, code, message);
export const notFound = (code, message) => httpError(404, code, message);
