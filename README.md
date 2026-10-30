# AgendaApi (Node.js)

Copia en Node.js del backend `.NET` de la Agenda. Tiene los **mismos endpoints, las mismas respuestas y los mismos usuarios de prueba**, así que el front funciona igual con cualquiera de los dos.

Usuario de prueba: 
user: test@test.com
pass: testtest

**No hace falta instalar nada más que Node** (el mismo que ya usan para Angular). No tiene dependencias: no hace falta `npm install`.

## Cómo iniciarlo

```bash
cd "Back node"
node server.js
```

Y queda escuchando en **http://localhost:3000**.

| Comando           | Qué hace                                                          |
| ----------------- | ----------------------------------------------------------------- |
| `npm start`       | Inicia la API                                                     |
| `npm run dev`     | Inicia la API y la reinicia sola si se modifica el código         |
| `npm run reset`   | Borra todo lo que se cargó y vuelve a los datos de ejemplo        |

Para usar otro puerto: `PORT=5000 node server.js` (en PowerShell: `$env:PORT=5000; node server.js`).

## Conectar el front de Angular

En `src/environments/environment.development.ts`:

```ts
export const environment = {
  API_URL: "http://localhost:3000/api/"
};
```

## Documentación interactiva

Con la API corriendo, entrar a **http://localhost:3000/docs** (necesita internet para cargar la interfaz de Scalar).
Ahí se pueden probar todos los endpoints: primero hacer login, copiar el token y pegarlo en *Authentication*.

## Usuarios de prueba

| Email                          | Contraseña         |
| ------------------------------ | ------------------ |
| `karenbailapiola@gmail.com`    | `Pa$$w0rd`         |
| `elluismidetotoras@gmail.com`  | `lamismadesiempre` |

## Dónde se guardan los datos

En `data/agenda-db.json`. Es un JSON común: se puede abrir para ver qué se guardó después de cada request. Si se rompe o se quiere empezar de cero: `npm run reset`.

## Endpoints

Todos menos el login y el registro requieren el header `Authorization: Bearer <token>`.
Las rutas no distinguen mayúsculas (`/api/Contacts` = `/api/contacts`).

### Authentication

| Método | Endpoint                           | Body                  | Respuesta                    |
| ------ | ---------------------------------- | --------------------- | ---------------------------- |
| POST   | `/api/authentication/authenticate` | `{ email, password }` | `200` token en **texto plano** / `401` |

### Users

| Método | Endpoint               | Respuesta                                                     |
| ------ | ---------------------- | ------------------------------------------------------------- |
| GET    | `/api/Users`           | `200` lista de `{ id, firstName, lastName, email, state }`    |
| GET    | `/api/Users/me`        | `200` `{ id, firstName, lastName, userName, state }`          |
| GET    | `/api/Users/{id}`      | `200` igual que `/me` / `404`                                 |
| POST   | `/api/Users`           | `201` usuario creado (**no requiere token**, es el registro). Body: `{ firstName, lastName, email, password }` |
| PUT    | `/api/Users/{userId}`  | `204` (actualiza nombre, apellido y contraseña)               |
| DELETE | `/api/Users?id={id}`   | `204`                                                         |

### Contacts

| Método | Endpoint                             | Respuesta                                                  |
| ------ | ------------------------------------ | ---------------------------------------------------------- |
| GET    | `/api/Contacts`                      | `200` contactos del usuario logueado, cada uno con `groupIds` |
| GET    | `/api/Contacts/{contactId}`          | `200` contacto / `204` si no existe                        |
| POST   | `/api/Contacts`                      | `201` contacto creado                                      |
| PUT    | `/api/Contacts/{contactId}`          | `204`                                                      |
| DELETE | `/api/Contacts/{contactId}`          | `204`                                                      |
| GET    | `/api/Contacts/export`               | `200` CSV en texto plano / `400` si no tiene contactos     |
| POST   | `/api/Contacts/{contactId}/favorite` | `200` texto: `...El nuevo estado es: True` (alterna)       |

Body para crear/editar (solo `firstName` es obligatorio):

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "address": "123 Main St",
  "number": "1234567890",
  "email": "john.doe@example.com",
  "image": "https://...",
  "company": "TechCorp",
  "description": "Compañero de trabajo"
}
```

### Groups

| Método | Endpoint                                     | Respuesta                                         |
| ------ | -------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/Groups`                                | `200` lista de `{ id, name, description, ownerId }` |
| GET    | `/api/Groups/{groupId}`                      | `200` grupo con `contacts` / `404`                |
| POST   | `/api/Groups`                                | `201`. Body: `{ name, description }`              |
| PUT    | `/api/Groups/{groupId}`                      | `204`                                             |
| PUT    | `/api/Groups/{groupId}/contact/{contactId}`  | `204` agrega el contacto, o lo quita si ya estaba |
| DELETE | `/api/Groups/{groupId}`                      | `204`                                             |
| GET    | `/api/Groups/export/{groupId}`               | `200` CSV con los contactos del grupo             |

## Diferencias con la versión .NET

Solo en casos de error, para que sea más fácil de usar en clase:

- Editar, borrar o marcar como favorito un contacto o grupo que **no es del usuario logueado** devuelve `404` con `{ "message": "..." }`. En .NET se podía modificar contactos ajenos, y borrar uno inexistente daba error `500`.
- Exportar un grupo ajeno devuelve `404`.
- Usa `http` (no `https`), así no hay que aceptar certificados en el navegador.

## Estructura del código

```
server.js               -> arranca el servidor (equivale a Program.cs)
src/config.js           -> configuración (equivale a appsettings.json)
src/db.js               -> datos guardados en JSON + datos de ejemplo (equivale a AgendaContext)
src/jwt.js              -> creación y validación del token
src/router.js           -> rutas y [Authorize]
src/http.js             -> helpers de respuestas y validación de DTOs
src/routes/*.js         -> un archivo por Controller
src/docs.js             -> documentación OpenAPI / Scalar
```
