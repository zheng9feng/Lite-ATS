# Repository Guidelines

## Project Structure & Module Organization

This is a Vite, React, TypeScript admin dashboard for local applicant tracking,
with an Express API for authentication, RBAC, job positions, and resume
management. Application code lives in `src/`.
File-based routes are under `src/routes/`, shared UI primitives in
`src/components/ui/`, layout in `src/components/layout/`, and feature modules
in `src/features/<domain>/`. Shared utilities are in `src/lib/`, hooks in
`src/hooks/`, stores in `src/stores/`, providers in `src/context/`, styles in
`src/styles/`, and static assets in `public/`.

The local API lives in `server/`. Local email/password authentication, users,
roles, permissions, sessions, job positions, resume metadata, and share tokens
are persisted in SQLite. Uploaded PDFs are stored in MinIO. Server modules are
grouped under `server/auth/`, `server/job-positions/`, and `server/resumes/`;
database migrations live under `server/resumes/migrations/`. Frontend tests are
colocated as `*.test.ts` or `*.test.tsx` under `src/`; server tests live under
`server/` and use `vitest.server.config.ts`. Production container files live
under `docker/`; the Express server can serve the built SPA when
`APP_STATIC_DIRECTORY` is configured.

## Build, Test, and Development Commands

- `pnpm install` installs dependencies from `pnpm-lock.yaml`.
- `pnpm run dev` starts the Vite development server.
- `pnpm run dev:api` starts the local Express API in watch mode.
- `pnpm run build` type-checks with `tsc -b` and builds the app.
- `pnpm run preview` serves the production build locally.
- `pnpm run start` starts the Express API without watch mode and serves the SPA
  when `APP_STATIC_DIRECTORY` points to the built `dist/` directory.
- `pnpm run lint` runs ESLint across the repository.
- `pnpm run format:check` checks Prettier formatting; `pnpm run format` writes
  formatting changes.
- `pnpm run test` runs Vitest browser tests headlessly.
- `pnpm run test:server` runs Node-based server tests.
- `pnpm run test:coverage` runs tests with V8 coverage.
- `pnpm run knip` reports unused files, exports, and dependencies.

Use pnpm for all scripts. If browser tests fail because Chromium is missing, run
`pnpm run test:browser:install`.

For local development, copy `.env.example` to `.env`, run MinIO on
`localhost:9000`, start the API with `pnpm run dev:api`, then start the app
with `pnpm run dev`. The API runs SQLite migrations automatically and seeds a
local admin when `LOCAL_ADMIN_EMAIL` and `LOCAL_ADMIN_PASSWORD` are set. The
Vite server proxies `/api` to `http://localhost:3001`, so
`VITE_RESUME_API_BASE_URL` can stay empty for normal local development.

For a container deployment, use
`docker compose --env-file .env -f docker/docker-compose.yml up --build -d`.
The Compose stack builds the app image, serves the SPA and API from one Express
origin, and starts MinIO with persistent named volumes. Keep the explicit
`--env-file .env` because the Compose file is below the repository root.
Rebuild the image after changing `VITE_TURNSTILE_SITE_KEY`, because Vite embeds
that public key at build time; `TURNSTILE_SECRET_KEY` remains a runtime-only
server secret. Both keys are required by Compose.

The API accepts either `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` or MinIO's
standard `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` names. Keep
`RESUME_API_PUBLIC_URL` aligned with the public API origin used for resume
preview and share links when it differs from the browser origin; leave it empty
for the normal same-origin deployment. Loopback public URLs are intentionally
normalized to same-origin paths. SQLite defaults to
`server/.data/resumes.sqlite`; use `RESUME_DATABASE_PATH` to change it.

## Coding Style & Naming Conventions

Prettier enforces 2-space indentation, single quotes, no semicolons, LF line
endings, 80-column wrapping, sorted imports, and sorted Tailwind classes. ESLint
forbids `console` calls, duplicate imports, and unused variables unless prefixed
with `_`. Use type-only imports for TypeScript types.

Name React components in PascalCase, hooks as `useSomething`, and feature files
with descriptive kebab-case names such as `users-delete-dialog.tsx`.

## Testing Guidelines

Vitest uses Playwright browser mode with Chromium for frontend tests. Keep
tests close to the code they cover, using `*.test.ts` for logic and
`*.test.tsx` for React UI. Prefer user-visible assertions for components and
add focused tests when changing shared hooks, stores, providers, utilities, or
dialogs. Coverage excludes generated routes, Shadcn UI primitives, assets, and
test helpers by default.

Server tests use Node mode through `vitest.server.config.ts`. Add focused
server tests when changing Express handlers, authentication or authorization,
SQLite repositories or migrations, job-position behavior, MinIO storage,
filename encoding, bulk PDF/ZIP uploads, share-token expiry, or server
configuration parsing. Authentication changes should cover registration,
Cloudflare Turnstile verification, login/session behavior, and RBAC cases.
Permission-protected endpoints should cover
unauthenticated, unauthorized, and authorized cases where applicable.

When changing the Dockerfile or Compose configuration, validate with
`docker compose --env-file .env -f docker/docker-compose.yml config` and, when
Docker is available, build the image and smoke-test `/api/health`, SPA fallback
routes, authentication, and MinIO-backed upload behavior.

## Commit & Pull Request Guidelines

This repository uses Commitizen conventional commits via `cz.yaml`; format
commits like `feat: add task import dialog` or `fix: handle empty auth state`.
Keep changes scoped and include tests or a clear reason when tests are not
applicable.

Pull requests should describe the change, list verification commands, link
related issues, and include screenshots or short recordings for visible UI
changes. Note route, auth, or configuration impacts explicitly.

## Security & Configuration Tips

Do not commit secrets, local environment files, SQLite databases, or MinIO
data. Local email/password authentication is the primary auth path; Clerk code
remains for separate demo routes. Keep Clerk keys, local-admin credentials, and
MinIO credentials local, and do not share the default development admin
password outside a disposable local environment. The Turnstile site key is
public and uses the `VITE_` prefix; the Turnstile secret must never use that
prefix or be included in the frontend build. Update `.env.example` when adding
or renaming API configuration, and document new required variables in PRs.
