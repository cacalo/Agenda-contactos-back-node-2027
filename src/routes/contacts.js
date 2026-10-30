// Equivalente a ContactsController.cs + ContactService + ContactRepository
// Todas las rutas requieren token.

import { route, intParam } from "../router.js";
import { db, save, nextId } from "../db.js";
import { empty, json, problem, text, validate, validationProblem } from "../http.js";

// DTOs
export const toContactDto = (c) => ({
  id: c.id,
  firstName: c.firstName,
  lastName: c.lastName,
  address: c.address,
  number: c.number,
  email: c.email,
  image: c.image,
  company: c.company,
  description: c.description,
  userId: c.userId,
  isFavorite: c.isFavorite,
});

const groupIdsOf = (contactId) => db.groups.filter((g) => g.contactIds.includes(contactId)).map((g) => g.id);
const toContactWithGroupIdsDto = (c) => ({ ...toContactDto(c), groupIds: groupIdsOf(c.id) });

const contactSchema = {
  firstName: { required: true },
  lastName: {},
  address: {},
  number: {},
  email: {},
  image: {},
  company: {},
  description: {},
};

const findOwnContact = (userId, contactId) => db.contacts.find((c) => c.id === contactId && c.userId === userId);

// Misma lógica de CSV que el Export de .NET
export function toCsv(contacts) {
  const header = "FirstName,LastName,Address,Number,Email,Image,Company,Description\n";
  return contacts.reduce(
    (result, c) =>
      result +
      [c.firstName, c.lastName, c.address, c.number, c.email, c.image, c.company, c.description]
        .map((v) => v ?? "")
        .join(",") + "\n",
    header,
  );
}

// GET /api/contacts -> contactos del usuario logueado (con los ids de sus grupos)
route("GET", "/api/contacts", ({ res, userId }) => {
  json(res, 200, db.contacts.filter((c) => c.userId === userId).map(toContactWithGroupIdsDto));
});

// GET /api/contacts/export -> CSV con los contactos del usuario
route("GET", "/api/contacts/export", ({ res, userId }) => {
  const contacts = db.contacts.filter((c) => c.userId === userId);
  if (contacts.length === 0) return text(res, 400, "El usuario no tiene ningún contacto");
  text(res, 200, toCsv(contacts));
});

// GET /api/contacts/:contactId -> 204 si no existe o no es del usuario (igual que .NET)
route("GET", "/api/contacts/:contactId", ({ res, params, userId }) => {
  const contactId = intParam(res, params, "contactId");
  if (contactId === null) return;
  const contact = findOwnContact(userId, contactId);
  if (!contact) return empty(res, 204);
  json(res, 200, toContactWithGroupIdsDto(contact));
});

// POST /api/contacts
route("POST", "/api/contacts", ({ res, body, userId }) => {
  const { errors, value } = validate(body, contactSchema);
  if (errors) return validationProblem(res, errors);

  const contact = {
    id: nextId("contacts"),
    ...value,
    lastName: value.lastName ?? "",
    description: value.description ?? "",
    userId,
    isFavorite: false,
  };
  db.contacts.push(contact);
  save();
  json(res, 201, toContactDto(contact), { Location: "Created" });
});

// PUT /api/contacts/:contactId
route("PUT", "/api/contacts/:contactId", ({ res, params, body, userId }) => {
  const contactId = intParam(res, params, "contactId");
  if (contactId === null) return;
  const { errors, value } = validate(body, contactSchema);
  if (errors) return validationProblem(res, errors);

  const contact = findOwnContact(userId, contactId);
  if (!contact) return json(res, 404, { message: "El contacto no se encontró o no pertenece al usuario en sesión" });

  Object.assign(contact, value, {
    lastName: value.lastName ?? "",
    description: value.description ?? "",
  });
  save();
  empty(res, 204);
});

// DELETE /api/contacts/:contactId
route("DELETE", "/api/contacts/:contactId", ({ res, params, userId }) => {
  const contactId = intParam(res, params, "contactId");
  if (contactId === null) return;

  const contact = findOwnContact(userId, contactId);
  if (!contact) return json(res, 404, { message: "El contacto no se encontró o no pertenece al usuario en sesión" });

  db.contacts = db.contacts.filter((c) => c.id !== contactId);
  db.groups.forEach((g) => (g.contactIds = g.contactIds.filter((id) => id !== contactId)));
  save();
  empty(res, 204);
});

// POST /api/contacts/:contactId/favorite -> alterna favorito
route("POST", "/api/contacts/:contactId/favorite", ({ res, params, userId }) => {
  const contactId = intParam(res, params, "contactId");
  if (contactId === null) return;

  const contact = findOwnContact(userId, contactId);
  if (!contact) return json(res, 404, { message: "El contacto no se encontró o no pertenece al usuario en sesión" });

  contact.isFavorite = !contact.isFavorite;
  save();
  // .NET escribe los booleanos como True / False
  text(res, 200, `Contacto actualizado correctamente. El nuevo estado es: ${contact.isFavorite ? "True" : "False"}`);
});
