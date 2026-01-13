import jwt from "jsonwebtoken";
import { unauthorized, forbidden } from "../lib/httpErrors.js";

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(unauthorized("NO_TOKEN", "No autenticado"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = payload;
    next();
  } catch {
    next(unauthorized("INVALID_TOKEN", "Token inválido o expirado"));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    const role = req.user?.role;
    if (!role) return next(unauthorized("NO_USER", "No autenticado"));
    if (!roles.includes(role)) return next(forbidden("FORBIDDEN", "No tiene permisos"));
    next();
  };
}
