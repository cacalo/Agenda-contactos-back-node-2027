// Equivalente a GroupsController.cs + GroupService + GroupRepository
// Todas las rutas requieren token.

import { route, intParam } from "../router.js";
import { db, save, nextId } from "../db.js";
import { empty, json, problem, text, validate, validationProblem } from "../http.js";
import { toContactDto, toCsv } from "./contacts.js";

// DTOs
const toGroupDto = (g) => ({ id: g.id, name: g.name, description: g.description, ownerId: g.ownerId });
const toGroupWithContactsDto = (g) => ({
  ...toGroupDto(g),
  contacts: g.contactIds
    .map((id) => db.contacts.find((c) => c.id === id))
    .filter(Boolean)
    .map(toContactDto),
});

const groupSchema = { name: { required: true }, description: {} };
const NOT_FOUND = { message: "El grupo no se encontró o no pertenece al usuario en sesión" };

const findOwnGroup = (userId, groupId) => db.groups.find((g) => g.id === groupId && g.ownerId === userId);

// GET /api/groups -> grupos del usuario logueado
route("GET", "/api/groups", ({ res, userId }) => {
  json(res, 200, db.groups.filter((g) => g.ownerId === userId).map(toGroupDto));
});

// GET /api/groups/:groupId -> grupo con sus contactos
route("GET", "/api/groups/:groupId", ({ res, params, userId }) => {
  const groupId = intParam(res, params, "groupId");
  if (groupId === null) return;
  const group = findOwnGroup(userId, groupId);
  if (!group) return json(res, 404, NOT_FOUND);
  json(res, 200, toGroupWithContactsDto(group));
});

// POST /api/groups
route("POST", "/api/groups", ({ res, body, userId }) => {
  const { errors, value } = validate(body, groupSchema);
  if (errors) return validationProblem(res, errors);

  const group = { id: nextId("groups"), name: value.name, description: value.description, ownerId: userId, contactIds: [] };
  db.groups.push(group);
  save();
  json(res, 201, toGroupDto(group), { Location: "Created" });
});

// PUT /api/groups/:groupId
route("PUT", "/api/groups/:groupId", ({ res, params, body, userId }) => {
  const groupId = intParam(res, params, "groupId");
  if (groupId === null) return;
  const { errors, value } = validate(body, groupSchema);
  if (errors) return validationProblem(res, errors);

  const group = findOwnGroup(userId, groupId);
  if (!group) return json(res, 404, NOT_FOUND);

  group.name = value.name;
  group.description = value.description;
  save();
  empty(res, 204);
});

// PUT /api/groups/:groupId/contact/:contactId -> agrega el contacto si no está, lo saca si está
route("PUT", "/api/groups/:groupId/contact/:contactId", ({ res, params, userId }) => {
  const groupId = intParam(res, params, "groupId");
  if (groupId === null) return;
  const contactId = intParam(res, params, "contactId");
  if (contactId === null) return;

  const group = findOwnGroup(userId, groupId);
  const contact = db.contacts.find((c) => c.id === contactId && c.userId === userId);
  if (group && contact) {
    group.contactIds = group.contactIds.includes(contactId)
      ? group.contactIds.filter((id) => id !== contactId)
      : [...group.contactIds, contactId];
    save();
  }
  empty(res, 204); // .NET devuelve 204 siempre, aunque no haya hecho nada
});

// DELETE /api/groups/:groupId
route("DELETE", "/api/groups/:groupId", ({ res, params, userId }) => {
  const groupId = intParam(res, params, "groupId");
  if (groupId === null) return;

  const group = findOwnGroup(userId, groupId);
  if (!group) return json(res, 404, NOT_FOUND);

  db.groups = db.groups.filter((g) => g.id !== groupId);
  save();
  empty(res, 204);
});

// GET /api/groups/export/:groupId -> CSV con los contactos del grupo
route("GET", "/api/groups/export/:groupId", ({ res, params, userId }) => {
  const groupId = intParam(res, params, "groupId");
  if (groupId === null) return;

  const group = findOwnGroup(userId, groupId);
  if (!group) return problem(res, 404);

  const contacts = group.contactIds.map((id) => db.contacts.find((c) => c.id === id)).filter(Boolean);
  text(res, 200, toCsv(contacts));
});
