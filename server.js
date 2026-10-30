// AgendaApi en Node.js — copia del backend .NET, sin dependencias externas.
// Iniciar con:  node server.js   (o npm start)
// Reiniciar los datos de ejemplo:  node server.js --reset   (o npm run reset)

import http from "node:http";
import { config } from "./src/config.js";
import { findRoute, authenticate, unauthorized } from "./src/router.js";
import { empty, json, problem } from "./src/http.js";
import { openApiDocument, docsPage } from "./src/docs.js";
import "./src/db.js";

// Registramos las rutas (cada archivo equivale a un Controller de .NET)
import "./src/routes/authentication.js";
import "./src/routes/users.js";
import "./src/routes/contacts.js";
import "./src/routes/groups.js";

// CORS abierto, igual que AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
  res.on("finish", () => log(req, res, Date.now() - start));

  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] ?? "*");
      return empty(res, 204);
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    // Documentación interactiva (como Scalar en .NET)
    if (req.method === "GET" && ["/", "/docs", "/scalar", "/scalar/v1"].includes(pathname.toLowerCase())) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(docsPage);
    }
    if (req.method === "GET" && pathname.toLowerCase() === "/openapi/v1.json") {
      return json(res, 200, openApiDocument(config.port));
    }

    const match = findRoute(req.method, pathname);
    if (!match) return empty(res, 404);
    if (match.methodNotAllowed) return empty(res, 405);

    // [Authorize]: si la ruta no es anónima, exigimos un token válido
    let userId = null;
    if (!match.route.anonymous) {
      userId = authenticate(req);
      if (userId === null) return unauthorized(res);
    }

    let body;
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const raw = await readBody(req);
      if (raw.trim() !== "") {
        try {
          body = JSON.parse(raw);
        } catch {
          return problem(res, 400, { title: "One or more validation errors occurred.", errors: { $: ["El cuerpo no es un JSON válido."] } });
        }
      }
    }

    await match.route.handler({ req, res, params: match.params, query: url.searchParams, body, userId });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) problem(res, 500);
  }
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function log(req, res, ms) {
  if (req.method === "OPTIONS") return;
  const color = res.statusCode >= 500 ? 31 : res.statusCode >= 400 ? 33 : 32;
  console.log(`\x1b[${color}m${res.statusCode}\x1b[0m ${req.method} ${req.url} (${ms} ms)`);
}

server.listen(config.port, () => {
  console.log(`\nAgendaApi (Node) escuchando en http://localhost:${config.port}`);
  console.log(`  API:            http://localhost:${config.port}/api/`);
  console.log(`  Documentación:  http://localhost:${config.port}/docs\n`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`El puerto ${config.port} ya está en uso. Probá con otro: PORT=3001 node server.js`);
    process.exit(1);
  }
  throw err;
});
