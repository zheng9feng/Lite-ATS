# Repository Guidelines

## Project Structure & Module Organization

This is a Vite, React, TypeScript admin dashboard with a small local Express
API for resume storage and sharing. Application code lives in `src/`.
File-based routes are under `src/routes/`, shared UI primitives in
`src/components/ui/`, layout in `src/components/layout/`, and feature modules
in `src/features/<domain>/`. Shared utilities are in `src/lib/`, hooks in
`src/hooks/`, stores in `src/stores/`, providers in `src/context/`, styles in
`src/styles/`, and static assets in `public/`.

The local API lives in `server/`. Resume uploads are stored in MinIO through
the Express API, with in-memory metadata and share tokens for local
development. Frontend tests are colocated as `*.test.ts` or `*.test.tsx` under
`src/`; server tests live under `server/` and use `vitest.server.config.ts`.

## Build, Test, and Development Commands

- `pnpm install` installs dependencies from `pnpm-lock.yaml`.
- `pnpm run dev` starts the Vite development server.
- `pnpm run dev:api` starts the local Express resume API.
- `pnpm run build` type-checks with `tsc -b` and builds the app.
- `pnpm run preview` serves the production build locally.
- `pnpm run lint` runs ESLint across the repository.
- `pnpm run format:check` checks Prettier formatting.
- `pnpm run test` runs Vitest browser tests headlessly.
- `pnpm run test:server` runs Node-based server tests.
- `pnpm run test:coverage` runs tests with V8 coverage.
- `pnpm run knip` reports unused files, exports, and dependencies.

Use pnpm for all scripts. If browser tests fail because Chromium is missing, run
`pnpm run test:browser:install`.

For local resume upload and share-link flows, run MinIO on `localhost:9000`,
start the API with `pnpm run dev:api`, then start the app with
`pnpm run dev`. The API reads `.env` and supports either
`MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` or MinIO's standard
`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` names. Keep `RESUME_API_PUBLIC_URL`
aligned with the URL users should open for public share links.

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
server tests when changing Express handlers, MinIO storage behavior, filename
encoding, share-token expiry, or server configuration parsing.

## Commit & Pull Request Guidelines

This repository uses Commitizen conventional commits via `cz.yaml`; format
commits like `feat: add task import dialog` or `fix: handle empty auth state`.
Keep changes scoped and include tests or a clear reason when tests are not
applicable.

Pull requests should describe the change, list verification commands, link
related issues, and include screenshots or short recordings for visible UI
changes. Note route, auth, or configuration impacts explicitly.

## Security & Configuration Tips

Do not commit secrets or local environment files. Clerk-related auth code is
present, so keep keys local and document new required variables in PRs. MinIO
credentials must stay local; update `.env.example` when adding or renaming
resume API configuration.
