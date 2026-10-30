// Creación y validación de tokens JWT (HS256) usando solo el módulo crypto de Node.
// Hace lo mismo que JwtSecurityTokenHandler + AddJwtBearer en el proyecto .NET.

import crypto from "node:crypto";
import { config } from "./config.js";

const { secretForKey, issuer, audience, expiresInDays } = config.authentication;
const CLOCK_SKEW_SECONDS = 5 * 60; // .NET tolera 5 minutos de diferencia de reloj

const base64url = (input) => Buffer.from(input).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", secretForKey).update(data).digest("base64url");

export function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: String(user.id),         // id del usuario
    given_name: user.firstName,   // nombre
    family_name: user.lastName,   // apellido
    nbf: now,
    exp: now + expiresInDays * 24 * 60 * 60,
    iss: issuer,
    aud: audience,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  return `${unsigned}.${sign(unsigned)}`;
}

/** Devuelve el payload si el token es válido, o null si no lo es. */
export function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header64, payload64, signature] = parts;

  const expected = Buffer.from(sign(`${header64}.${payload64}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;

  try {
    const header = JSON.parse(Buffer.from(header64, "base64url").toString());
    const payload = JSON.parse(Buffer.from(payload64, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    if (header.alg !== "HS256") return null;
    if (payload.iss !== issuer || payload.aud !== audience) return null;
    if (typeof payload.exp !== "number" || payload.exp + CLOCK_SKEW_SECONDS < now) return null;
    if (typeof payload.nbf === "number" && payload.nbf - CLOCK_SKEW_SECONDS > now) return null;
    return payload;
  } catch {
    return null;
  }
}
