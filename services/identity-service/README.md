# Identity Service

Authentication, account, password, Google OAuth, and profile APIs.

The service is private inside Compose. Use the API gateway for its interactive
Swagger UI at `http://localhost:8088/docs/identity`; raw OpenAPI documents are
available at `/docs/identity/openapi.json` and `/docs/identity/openapi.yaml`.

The runtime API remains under `/auth/*`. The documentation supports the existing
HttpOnly cookie session and bearer-token authentication schemes.
