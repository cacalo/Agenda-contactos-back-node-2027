// Mini router: registra rutas tipo "/api/contacts/:contactId" y las resuelve.
// Igual que en ASP.NET, las rutas no distinguen mayúsculas (/api/Contacts = /api/contacts)
// y los segmentos fijos ("export", "me") tienen prioridad sobre los parámetros.

import { verifyToken } from "./jwt.js";
import { empty, validationProblem } from "./http.js";

const routes = [];

/**
 * @param {string} method  GET, POST, PUT, DELETE
 * @param {string} pattern ej: "/api/groups/:groupId/contact/:contactId"
 * @param {Function} handler (ctx) => void. ctx = { req, res, params, query, body, userId }
 * @param {{ anonymous?: boolean }} options anonymous = true equivale a [AllowAnonymous]
 */
export function route(method, pattern, handler, options = {}) {
  const segments = pattern
    .split("/")
    .filter(Boolean)
    .map((s) => (s.startsWith(":") ? s : s.toLowerCase()));
  const literalCount = segments.filter((s) => !s.startsWith(":")).length;
  routes.push({ method, segments, literalCount, handler, anonymous: !!options.anonymous });
  // Más segmentos fijos primero, para que "/me" le gane a "/:id"
  routes.sort((a, b) => b.literalCount - a.literalCount);
}

export function findRoute(method, pathname) {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  let methodMismatch = false;

  for (const r of routes) {
    if (r.segments.length !== parts.length) continue;
    const params = {};
    const ok = r.segments.every((seg, i) => {
      if (seg.startsWith(":")) {
        params[seg.slice(1)] = parts[i];
        return true;
      }
      return seg === parts[i].toLowerCase();
    });
    if (!ok) continue;
    if (r.method !== method) {
      methodMismatch = true;
      continue;
    }
    return { route: r, params };
  }
  return methodMismatch ? { methodNotAllowed: true } : null;
}

/** Equivalente a [Authorize]: lee el header "Authorization: Bearer <token>" */
export function authenticate(req) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  const payload = verifyToken(token.trim());
  return payload ? Number(payload.sub) : null;
}

export function unauthorized(res) {
  empty(res, 401, { "WWW-Authenticate": "Bearer" });
}

/**
 * Convierte un parámetro de ruta a entero, como hace el model binding de .NET.
 * Si no es un número responde 400 y devuelve null.
 */
export function intParam(res, params, name) {
  const value = params[name];
  if (!/^-?\d+$/.test(value ?? "")) {
    validationProblem(res, { [name]: [`The value '${value}' is not valid.`] });
    return null;
  }
  return Number(value);
}
