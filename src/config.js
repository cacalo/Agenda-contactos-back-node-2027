// Equivalente al appsettings.json del proyecto .NET.
// Se puede cambiar el puerto con la variable de entorno PORT (ej: PORT=5000 node server.js).

export const config = {
  port: Number(process.env.PORT) || 3000,

  authentication: {
    secretForKey: "thisisthesecretforgeneratingakey(mustbeatleast32bitlong)",
    issuer: "https://localhost:52852", // Quién creó el token
    audience: "agendaapi",              // Para quién se creó el token
    expiresInDays: 7,
  },

  // Archivo donde se guardan los datos (reemplaza a la base SQLite).
  // Es un JSON común: se puede abrir para ver qué hay guardado.
  dbFile: "data/agenda-db.json",
};
