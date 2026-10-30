// Helpers para responder igual que ASP.NET Core:
// - JSON con propiedades en camelCase e indentado
// - Strings como text/plain (por eso el front usa res.text() para el token y el CSV)
// - Errores 4xx sin cuerpo como "ProblemDetails"

import crypto from "node:crypto";

export function json(res, status, data, extraHeaders = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...extraHeaders });
  res.end(JSON.stringify(data, null, 2));
}

export function text(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

/** Respuesta sin cuerpo (ej: 204 No Content, 401 del middleware de autenticación) */
export function empty(res, status, extraHeaders = {}) {
  res.writeHead(status, extraHeaders);
  res.end();
}

const PROBLEMS = {
  400: ["Bad Request", "https://tools.ietf.org/html/rfc9110#section-15.5.1"],
  401: ["Unauthorized", "https://tools.ietf.org/html/rfc9110#section-15.5.2"],
  404: ["Not Found", "https://tools.ietf.org/html/rfc9110#section-15.5.5"],
  500: ["Internal Server Error", "https://tools.ietf.org/html/rfc9110#section-15.6.1"],
};

/** Igual a lo que devuelve un controller .NET con return NotFound(), Unauthorized(), etc. */
export function problem(res, status, extra = {}) {
  const [title, type] = PROBLEMS[status] ?? ["Error", undefined];
  json(res, status, { type, title, status, ...extra, traceId: traceId() }, { "Content-Type": "application/problem+json; charset=utf-8" });
}

/** Igual al 400 automático de [ApiController] cuando falla la validación del DTO */
export function validationProblem(res, errors) {
  json(res, 400, {
    type: PROBLEMS[400][1],
    title: "One or more validation errors occurred.",
    status: 400,
    errors,
    traceId: traceId(),
  }, { "Content-Type": "application/problem+json; charset=utf-8" });
}

function traceId() {
  return `00-${crypto.randomBytes(16).toString("hex")}-${crypto.randomBytes(8).toString("hex")}-00`;
}

/**
 * Valida un body según un esquema simple: { campo: { required: bool } }.
 * Todos los campos son strings (como en los DTOs de .NET).
 * Devuelve { errors } si hay errores o { value } con el objeto limpio.
 */
export function validate(body, schema) {
  if (body === undefined || body === null || typeof body !== "object" || Array.isArray(body)) {
    return { errors: { "": ["A non-empty request body is required."] } };
  }
  const errors = {};
  const value = {};
  for (const [field, rules] of Object.entries(schema)) {
    const pascal = field[0].toUpperCase() + field.slice(1);
    // ASP.NET no distingue mayúsculas en las propiedades del JSON
    const key = Object.keys(body).find((k) => k.toLowerCase() === field.toLowerCase());
    const raw = key === undefined ? undefined : body[key];

    if (raw !== undefined && raw !== null && typeof raw !== "string") {
      errors[`$.${field}`] = [`The JSON value could not be converted to System.String. Path: $.${field}`];
      continue;
    }
    if (rules.required && (raw === undefined || raw === null || raw.trim() === "")) {
      errors[pascal] = [`The ${pascal} field is required.`];
      continue;
    }
    value[field] = raw ?? null;
  }
  return Object.keys(errors).length ? { errors } : { value };
}
