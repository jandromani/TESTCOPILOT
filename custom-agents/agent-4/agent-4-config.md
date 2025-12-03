api_endpoints:
  - endpoint: /auth/login
    method: POST
    description: Autentica al usuario y devuelve un token JWT.
  - endpoint: /users
    method: GET
    description: Obtiene la lista de usuarios.
  - endpoint: /users/{id}
    method: GET
    description: Obtiene información detallada de un usuario.

security:
  auth_type: jwt
  roles: [admin, user]
