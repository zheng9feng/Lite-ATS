# Local Email/Password Auth and RBAC Design

## Context

Lite ATS currently uses a mock frontend auth store and an unauthenticated local
Express resume API. The frontend stores a mock user with a role array, and the
users feature has sample role data, but route access, sidebar visibility, and
resume API endpoints are not protected by real authorization.

The requested design is a local email/password auth system stored in SQLite,
with RBAC data tables and every new table using a `t_*` prefix.

## Goals

- Replace mock sign-in with local email/password authentication.
- Store users, sessions, roles, and permissions in SQLite tables.
- Enforce authorization in the Express API.
- Mirror permissions in the frontend for navigation, route guards, and action
  visibility.
- Keep public resume share links accessible without authentication.

## Non-Goals

- Integrating Clerk or any external identity provider.
- Adding multi-tenant organization support.
- Implementing password reset email delivery.
- Building a full audit log.

## Roles and Permissions

The initial roles are:

- `admin`: all permissions, including user management and delete.
- `normal`: view resumes only.
- unauthenticated: public share links only.

Initial permissions:

- `resumes:read`
- `resumes:create`
- `resumes:update`
- `resumes:delete`
- `resumes:share`
- `users:manage`
- `rbac:manage`

`admin` receives every permission. `normal` receives only `resumes:read`.

## Database Schema

The existing resume SQLite database and Kysely migration flow will be reused.
New auth and RBAC tables will use the required `t_*` prefix:

- `t_users`
  - `id`
  - `email`
  - `name`
  - `password_hash`
  - `status`
  - `created_at`
  - `updated_at`

- `t_sessions`
  - `id`
  - `user_id`
  - `token_hash`
  - `expires_at`
  - `created_at`
  - `last_used_at`

- `t_roles`
  - `id`
  - `name`
  - `description`

- `t_permissions`
  - `id`
  - `name`
  - `description`

- `t_user_roles`
  - `user_id`
  - `role_id`

- `t_role_permissions`
  - `role_id`
  - `permission_id`

The migration seeds the default roles and permissions. A local admin seed user
can be created from environment variables so development has an initial account
without committing credentials.

## Server Auth Flow

`POST /api/auth/login` accepts email and password, verifies the password hash,
creates an opaque session token, stores only a token hash in `t_sessions`, and
returns the raw token once to the client.

`GET /api/auth/me` resolves the bearer token, refreshes `last_used_at`, and
returns the current user, roles, and permissions.

`POST /api/auth/logout` deletes the current session when a valid bearer token is
present. The endpoint remains idempotent so repeated logout attempts are safe.

Session tokens expire based on `expires_at`. Expired sessions are rejected and
can be removed opportunistically during lookup.

## API Authorization

The API uses middleware in this order:

1. Resolve the optional bearer session token.
2. Attach the authenticated principal to the request when present.
3. Require a named permission on protected routes.

Public routes:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/resume-shares/:token`

Protected resume routes:

- `GET /api/resumes`: `resumes:read`
- `GET /api/resumes/:resumeId/file`: `resumes:read`
- `POST /api/resumes`: `resumes:create`
- `PATCH /api/resumes/:resumeId`: `resumes:update`
- `DELETE /api/resumes/:resumeId`: `resumes:delete`
- `POST /api/resumes/:resumeId/share`: `resumes:share`

Protected user and RBAC routes:

- `GET /api/users`: `users:manage`
- `POST /api/users`: `users:manage`
- `PATCH /api/users/:userId`: `users:manage`
- `DELETE /api/users/:userId`: `users:manage`
- `PUT /api/users/:userId/roles`: `rbac:manage`
- `GET /api/roles`: `rbac:manage`
- `GET /api/permissions`: `rbac:manage`
- `PUT /api/roles/:roleId/permissions`: `rbac:manage`

Authorization failures return:

- `401` when no valid session is present.
- `403` when the session is valid but lacks the required permission.

Public share-token access keeps its existing token-expiry behavior and is not
tied to user sessions.

## Frontend Auth Flow

The sign-in form calls `POST /api/auth/login` instead of creating a mock user.
After login, the frontend stores the session token and current user auth
snapshot in `useAuthStore`.

On app startup or authenticated layout entry, the frontend calls
`GET /api/auth/me` when a session token exists. If the token is invalid or
expired, the auth store is reset and protected routes show the unauthorized
state.

All resume API requests include the bearer token from the auth store.

## Frontend Permission UX

Shared permission utilities expose checks such as `can(permission)` or
`useCan(permission)`.

The sidebar filters entries based on permissions:

- Resume upload and mutating resume actions require admin permissions.
- Resume list and preview require `resumes:read`.
- User management requires `users:manage`.

Route guards distinguish:

- no authenticated user: 401 unauthorized view.
- authenticated user without permission: 403 forbidden view.

Buttons and dialogs for upload, edit, delete, and share are hidden or disabled
when the current user lacks the matching permission. The server remains the
source of truth, so hidden controls are only a UX aid.

## Error Handling

Auth responses use stable JSON error payloads:

```json
{ "error": "Invalid email or password." }
```

The frontend maps `401` to sign-in or unauthorized state and `403` to forbidden
state. Other resume API errors continue to flow through the existing resume API
error parser.

## Testing

Server tests:

- migration creates all `t_*` auth and RBAC tables.
- seeded roles and permissions match the required role matrix.
- login succeeds with a valid password and fails with invalid credentials.
- session lookup returns user, roles, and permissions.
- expired sessions are rejected.
- protected resume routes return `401` without a session.
- protected resume routes return `403` for `normal` when mutating resumes.
- public share links remain accessible without a session.

Frontend tests:

- auth store can persist and reset the session token and auth snapshot.
- sign-in form calls the login API and stores the returned session.
- permission utilities allow admin actions and deny normal mutating actions.
- sidebar filtering hides admin-only routes for `normal`.
- route/action guards show 401 or 403 as appropriate.

## Rollout

1. Add auth and RBAC migration with seeded roles and permissions.
2. Add auth repository and service modules.
3. Add Express auth routes and permission middleware.
4. Apply permission middleware to resume routes.
5. Add user and RBAC management API routes.
6. Update frontend auth store and sign-in flow.
7. Add frontend permission utilities, sidebar filtering, and route/action
   guards.
8. Add focused server and frontend tests.
