// Equivalente a UsersController.cs + UserService + UserRepository

import { route, intParam } from "../router.js";
import { db, save, nextId } from "../db.js";
import { empty, json, problem, text, validate, validationProblem } from "../http.js";

// DTOs (qué datos del usuario se devuelven: nunca la contraseña)
const toUserDto = (u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, state: u.state });
const toGetUserByIdDto = (u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, userName: u.email, state: u.state });

const userSchema = {
  firstName: { required: true },
  lastName: { required: true },
  password: { required: true },
  email: { required: true },
};

// GET /api/users -> todos los usuarios
route("GET", "/api/users", ({ res }) => {
  json(res, 200, db.users.map(toUserDto));
});

// GET /api/users/me -> datos del usuario logueado
route("GET", "/api/users/me", ({ res, userId }) => {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return empty(res, 204);
  json(res, 200, toGetUserByIdDto(user));
});

// GET /api/users/:id
route("GET", "/api/users/:id", ({ res, params }) => {
  const id = intParam(res, params, "id");
  if (id === null) return;
  if (id === 0) return text(res, 400, "El ID ingresado debe ser distinto de 0");

  const user = db.users.find((u) => u.id === id);
  if (!user) return problem(res, 404);
  json(res, 200, toGetUserByIdDto(user));
});

// POST /api/users -> registro (no requiere token)
route("POST", "/api/users", ({ res, body }) => {
  const { errors, value } = validate(body, userSchema);
  if (errors) return validationProblem(res, errors);

  const user = {
    id: nextId("users"),
    firstName: value.firstName,
    lastName: value.lastName,
    password: value.password,
    email: value.email,
    state: "Active",
  };
  db.users.push(user);
  save();
  json(res, 201, toUserDto(user), { Location: "Created" });
}, { anonymous: true });

// PUT /api/users/:userId -> actualiza nombre, apellido y contraseña (el email no cambia)
route("PUT", "/api/users/:userId", ({ res, params, body }) => {
  const userId = intParam(res, params, "userId");
  if (userId === null) return;

  const { errors, value } = validate(body, userSchema);
  if (errors) return validationProblem(res, errors);

  const user = db.users.find((u) => u.id === userId);
  if (!user) return problem(res, 404);

  user.firstName = value.firstName;
  user.lastName = value.lastName;
  user.password = value.password;
  save();
  empty(res, 204);
});

// DELETE /api/users?id=5
// Si el usuario se llama "Admin" se archiva en vez de borrarse (igual que en .NET)
route("DELETE", "/api/users", ({ res, query }) => {
  const id = Number(query.get("id") ?? query.get("Id") ?? 0);
  const user = db.users.find((u) => u.id === id);

  if (user) {
    if (user.firstName === "Admin") {
      user.state = "Archived";
    } else {
      // Borrado en cascada: sus grupos y sus contactos
      const contactIds = new Set(db.contacts.filter((c) => c.userId === id).map((c) => c.id));
      db.groups = db.groups.filter((g) => g.ownerId !== id);
      db.groups.forEach((g) => (g.contactIds = g.contactIds.filter((cid) => !contactIds.has(cid))));
      db.contacts = db.contacts.filter((c) => c.userId !== id);
      db.users = db.users.filter((u) => u.id !== id);
    }
    save();
  }
  empty(res, 204);
});
