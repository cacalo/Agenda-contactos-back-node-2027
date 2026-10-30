// "Base de datos" en un archivo JSON. Reemplaza a Entity Framework + SQLite.
// Cada vez que se modifica algo se llama a save() y se escribe el archivo.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.join(rootDir, config.dbFile);

// Datos iniciales: los mismos que el OnModelCreating de AgendaContext.cs
function seed() {
  return {
    nextIds: { users: 3, contacts: 4, groups: 1 },
    users: [
      { id: 1, firstName: "Karen", lastName: "Lasot", password: "Pa$$w0rd", email: "karenbailapiola@gmail.com", state: "Active" },
      { id: 2, firstName: "Luis Gonzalez", lastName: "Gonzales", password: "lamismadesiempre", email: "elluismidetotoras@gmail.com", state: "Active" },
    ],
    contacts: [
      { id: 1, firstName: "Jaimito", lastName: "Perez", address: null, number: "341457896", email: "jpreze@pwc.com", image: null, company: "PwC", description: "Plomero", userId: 1, isFavorite: false },
      { id: 2, firstName: "Pepe", lastName: "Ramirez", address: null, number: "34156978", email: "pramirez@austral.com", image: null, company: "Austral", description: "Papa", userId: 2, isFavorite: false },
      { id: 3, firstName: "Maria", lastName: "paez", address: null, number: "341457896", email: "mpaez@google.com", image: null, company: "google", description: "Jefa", userId: 1, isFavorite: false },
    ],
    // Cada grupo guarda los ids de sus contactos (relación muchos a muchos)
    groups: [],
  };
}

export const db = load();

function load() {
  if (process.argv.includes("--reset") || !fs.existsSync(dbPath)) {
    const data = seed();
    write(data);
    console.log(`Base de datos inicializada con los datos de ejemplo en ${config.dbFile}`);
    return data;
  }
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch {
    console.error(`No se pudo leer ${config.dbFile}. Ejecutá "npm run reset" para regenerarla.`);
    process.exit(1);
  }
}

function write(data) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const tmp = dbPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, dbPath);
}

export function save() {
  write(db);
}

export function nextId(table) {
  return db.nextIds[table]++;
}
