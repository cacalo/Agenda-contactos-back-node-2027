// Documentación OpenAPI + página de Scalar (la misma herramienta que usa el proyecto .NET).
// La página carga Scalar desde un CDN, así que necesita internet para verse.

const str = { type: "string" };
const strNull = { type: "string", nullable: true };
const int = { type: "integer" };
const state = { type: "string", enum: ["Active", "Archived", "Confirmed"] };
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (name) => ({ type: "array", items: ref(name) });
const jsonBody = (name) => ({ required: true, content: { "application/json": { schema: ref(name) } } });
const jsonRes = (description, schema) => ({ description, content: { "application/json": { schema } } });
const textRes = (description) => ({ description, content: { "text/plain": { schema: str } } });
const noContent = { description: "No Content" };
const idParam = (name, where = "path") => ({ name, in: where, required: where === "path", schema: int });

const contactProps = {
  id: int, firstName: str, lastName: str, address: strNull, number: strNull, email: strNull,
  image: strNull, company: strNull, description: str, userId: int, isFavorite: { type: "boolean" },
};

const schemas = {
  AuthenticationRequestDto: { type: "object", required: ["email", "password"], properties: { email: str, password: str }, example: { email: "karenbailapiola@gmail.com", password: "Pa$$w0rd" } },
  CreateAndUpdateUserDto: { type: "object", required: ["firstName", "lastName", "password", "email"], properties: { firstName: str, lastName: str, password: str, email: str } },
  UserDto: { type: "object", properties: { id: int, firstName: str, lastName: str, email: str, state } },
  GetUserByIdDto: { type: "object", properties: { id: int, firstName: str, lastName: str, userName: str, state } },
  CreateAndUpdateContactDto: {
    type: "object", required: ["firstName"],
    properties: { firstName: str, lastName: strNull, address: strNull, number: strNull, email: strNull, image: strNull, company: strNull, description: strNull },
  },
  ContactDto: { type: "object", properties: contactProps },
  ContactWithGroupIdsDto: { type: "object", properties: { ...contactProps, groupIds: { type: "array", items: int } } },
  CreateAndUpdateGroupDto: { type: "object", required: ["name"], properties: { name: str, description: strNull } },
  GroupDto: { type: "object", properties: { id: int, name: str, description: strNull, ownerId: int } },
  GroupWithContactsDto: { type: "object", properties: { id: int, name: str, description: strNull, ownerId: int, contacts: arrayOf("ContactDto") } },
};

const paths = {
  "/api/authentication/authenticate": {
    post: { tags: ["Authentication"], summary: "Login: devuelve el token como texto", security: [], requestBody: jsonBody("AuthenticationRequestDto"), responses: { 200: textRes("Token JWT"), 401: { description: "Credenciales incorrectas" } } },
  },
  "/api/Users": {
    get: { tags: ["Users"], summary: "Todos los usuarios", responses: { 200: jsonRes("OK", arrayOf("UserDto")) } },
    post: { tags: ["Users"], summary: "Registro de usuario (no requiere token)", security: [], requestBody: jsonBody("CreateAndUpdateUserDto"), responses: { 201: jsonRes("Created", ref("UserDto")) } },
    delete: { tags: ["Users"], summary: "Elimina un usuario (?id=)", parameters: [idParam("id", "query")], responses: { 204: noContent } },
  },
  "/api/Users/me": {
    get: { tags: ["Users"], summary: "Usuario logueado", responses: { 200: jsonRes("OK", ref("GetUserByIdDto")) } },
  },
  "/api/Users/{id}": {
    get: { tags: ["Users"], summary: "Usuario por id", parameters: [idParam("id")], responses: { 200: jsonRes("OK", ref("GetUserByIdDto")), 404: { description: "Not Found" } } },
  },
  "/api/Users/{userId}": {
    put: { tags: ["Users"], summary: "Actualiza nombre, apellido y contraseña", parameters: [idParam("userId")], requestBody: jsonBody("CreateAndUpdateUserDto"), responses: { 204: noContent, 404: { description: "Not Found" } } },
  },
  "/api/Contacts": {
    get: { tags: ["Contacts"], summary: "Contactos del usuario logueado", responses: { 200: jsonRes("OK", arrayOf("ContactWithGroupIdsDto")) } },
    post: { tags: ["Contacts"], summary: "Crea un contacto", requestBody: jsonBody("CreateAndUpdateContactDto"), responses: { 201: jsonRes("Created", ref("ContactDto")) } },
  },
  "/api/Contacts/{contactId}": {
    get: { tags: ["Contacts"], summary: "Un contacto (204 si no existe)", parameters: [idParam("contactId")], responses: { 200: jsonRes("OK", ref("ContactWithGroupIdsDto")), 204: noContent } },
    put: { tags: ["Contacts"], summary: "Actualiza un contacto", parameters: [idParam("contactId")], requestBody: jsonBody("CreateAndUpdateContactDto"), responses: { 204: noContent } },
    delete: { tags: ["Contacts"], summary: "Elimina un contacto", parameters: [idParam("contactId")], responses: { 204: noContent } },
  },
  "/api/Contacts/export": {
    get: { tags: ["Contacts"], summary: "Exporta los contactos en CSV", responses: { 200: textRes("CSV"), 400: textRes("El usuario no tiene ningún contacto") } },
  },
  "/api/Contacts/{contactId}/favorite": {
    post: { tags: ["Contacts"], summary: "Marca/desmarca favorito", parameters: [idParam("contactId")], responses: { 200: textRes("Mensaje con el nuevo estado") } },
  },
  "/api/Groups": {
    get: { tags: ["Groups"], summary: "Grupos del usuario logueado", responses: { 200: jsonRes("OK", arrayOf("GroupDto")) } },
    post: { tags: ["Groups"], summary: "Crea un grupo", requestBody: jsonBody("CreateAndUpdateGroupDto"), responses: { 201: jsonRes("Created", ref("GroupDto")) } },
  },
  "/api/Groups/{groupId}": {
    get: { tags: ["Groups"], summary: "Un grupo con sus contactos", parameters: [idParam("groupId")], responses: { 200: jsonRes("OK", ref("GroupWithContactsDto")), 404: { description: "Not Found" } } },
    put: { tags: ["Groups"], summary: "Actualiza un grupo", parameters: [idParam("groupId")], requestBody: jsonBody("CreateAndUpdateGroupDto"), responses: { 204: noContent } },
    delete: { tags: ["Groups"], summary: "Elimina un grupo", parameters: [idParam("groupId")], responses: { 204: noContent } },
  },
  "/api/Groups/{groupId}/contact/{contactId}": {
    put: { tags: ["Groups"], summary: "Agrega o quita un contacto del grupo", parameters: [idParam("groupId"), idParam("contactId")], responses: { 204: noContent } },
  },
  "/api/Groups/export/{groupId}": {
    get: { tags: ["Groups"], summary: "Exporta los contactos del grupo en CSV", parameters: [idParam("groupId")], responses: { 200: textRes("CSV"), 404: { description: "Not Found" } } },
  },
};

export function openApiDocument(port) {
  return {
    openapi: "3.0.1",
    info: { title: "AgendaApi (Node)", version: "v1", description: "Copia en Node.js de AgendaApi. Primero hacé login en /api/authentication/authenticate y pegá el token en Authentication." },
    servers: [{ url: `http://localhost:${port}` }],
    security: [{ AgendaApiBearerAuth: [] }],
    components: {
      securitySchemes: { AgendaApiBearerAuth: { type: "http", scheme: "bearer", description: "Acá pegar el token generado al loguearse." } },
      schemas,
    },
    paths,
  };
}

export const docsPage = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>AgendaApi (Node) — Documentación</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script id="api-reference" data-url="/openapi/v1.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <noscript>La documentación necesita JavaScript. El JSON está en <a href="/openapi/v1.json">/openapi/v1.json</a>.</noscript>
</body>
</html>`;
