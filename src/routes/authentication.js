// Equivalente a AuthenticationController.cs
// POST /api/authentication/authenticate  { email, password }  ->  token (texto plano)

import { route } from "../router.js";
import { db } from "../db.js";
import { createToken } from "../jwt.js";
import { problem, text, validate, validationProblem } from "../http.js";

route("POST", "/api/authentication/authenticate", ({ res, body }) => {
  const { errors, value } = validate(body, {
    email: { required: true },
    password: { required: true },
  });
  if (errors) return validationProblem(res, errors);

  // Paso 1: validamos las credenciales
  const user = db.users.find((u) => u.email === value.email && u.password === value.password);
  if (!user) return problem(res, 401);

  // Paso 2: creamos el token y lo devolvemos como texto
  text(res, 200, createToken(user));
}, { anonymous: true });
