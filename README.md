# Lite ATS

Lite ATS is a Vite, React, and TypeScript admin dashboard for local applicant
tracking workflows. It extends the shadcn-admin dashboard with local
email/password authentication, SQLite-backed RBAC, resume upload and preview,
and MinIO-backed PDF storage with expiring public share links.

![Lite ATS dashboard](public/images/shadcn-admin.png)

## Features

- Resume upload, metadata editing, preview, deletion, and expiring share links.
- Local Express API with SQLite persistence for resumes, users, roles,
  permissions, and sessions.
- MinIO object storage for uploaded PDF files.
- Local email/password authentication with bearer-session API authorization.
- RBAC-protected navigation for resume, user, and permission management.
- Dashboard, users table, permissions management, settings, auth, and error
  pages.
- Responsive shadcn/ui interface with light/dark mode, RTL-capable primitives,
  and English / Simplified Chinese localization.

## Tech Stack

- React 19, TypeScript, Vite, and TanStack Router.
- shadcn/ui, Radix UI, Tailwind CSS, Lucide icons, and Recharts.
- Zustand for client auth/session state.
- Express 5 API with multer uploads.
- SQLite through better-sqlite3 and Kysely migrations.
- MinIO for local resume object storage.
- Vitest with Playwright browser mode for frontend tests.
- Vitest Node mode for server tests.

## Project Structure

```text
src/
  components/       shared UI, layout, tables, and app chrome
  context/          theme, layout, language, search, and direction providers
  features/         auth, dashboard, permissions, resumes, settings, users
  hooks/            shared React hooks
  lib/              utilities, i18n, permissions, cookies, error handling
  routes/           TanStack file-based routes
  stores/           Zustand stores
  styles/           global CSS and theme tokens

server/
  app.ts            Express app and API routes
  index.ts          API bootstrap, migrations, local admin seed
  auth/             local auth, password hashing, sessions, RBAC repository
  resumes/          MinIO storage, resume service, SQLite migrations
```

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Start MinIO locally. One simple option is Docker:

```bash
docker run --rm \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  quay.io/minio/minio server /data --console-address ":9001"
```

Start the API:

```bash
pnpm run dev:api
```

Start the frontend in another terminal:

```bash
pnpm run dev
```

Open the Vite URL, usually `http://localhost:5173`. The Vite dev server proxies
`/api` requests to `http://localhost:3001`, so `VITE_RESUME_API_BASE_URL` can
stay empty for normal local development.

With the default `.env.example` values, the API creates a local admin user on
first startup:

```text
Email: admin@example.com
Password: password123
```

Change those credentials before sharing a local database or deploying the API.

## Docker Compose

Build the application image and start Lite ATS with MinIO:

```bash
docker compose up --build -d
```

Open `http://localhost:3001`. The MinIO console is available at
`http://localhost:9001`. Compose stores SQLite and MinIO data in named volumes,
so both survive container restarts.

Compose reads `.env` automatically. Change `LOCAL_ADMIN_PASSWORD` and the
MinIO credentials before exposing the deployment. If you set `APP_PORT` to a
port other than `3001`, set `RESUME_API_PUBLIC_URL` to the matching public URL
so generated resume links remain reachable.

Check the deployment or stop it with:

```bash
docker compose ps
docker compose logs -f app
docker compose down
```

## Environment Variables

| Variable                     | Default                       | Purpose                                                             |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `VITE_RESUME_API_BASE_URL`   | empty                         | Optional browser API origin. Leave empty when using the Vite proxy. |
| `VITE_CLERK_PUBLISHABLE_KEY` | empty                         | Optional Clerk publishable key for the separate Clerk demo routes.  |
| `APP_PORT`                   | `3001`                        | Host port published by Docker Compose.                              |
| `APP_STATIC_DIRECTORY`       | empty                         | Built frontend directory served by Express in production.           |
| `RESUME_API_PORT`            | `3001`                        | Express API port.                                                   |
| `RESUME_API_PUBLIC_URL`      | `http://localhost:3001`       | Public URL used when generating resume preview and share links.     |
| `RESUME_DATABASE_PATH`       | `server/.data/resumes.sqlite` | SQLite database path.                                               |
| `RESUME_SHARE_TTL_MINUTES`   | `60`                          | Lifetime for public resume share links.                             |
| `LOCAL_ADMIN_EMAIL`          | empty                         | Admin seed email. No admin is seeded when empty.                    |
| `LOCAL_ADMIN_NAME`           | `Local Admin`                 | Admin seed display name.                                            |
| `LOCAL_ADMIN_PASSWORD`       | empty                         | Admin seed password. No admin is seeded when empty.                 |
| `MINIO_ENDPOINT`             | `localhost`                   | MinIO endpoint hostname.                                            |
| `MINIO_PORT`                 | `9000`                        | MinIO API port.                                                     |
| `MINIO_USE_SSL`              | `false`                       | Whether the MinIO client uses SSL.                                  |
| `MINIO_ACCESS_KEY`           | `minioadmin`                  | MinIO access key.                                                   |
| `MINIO_SECRET_KEY`           | `minioadmin`                  | MinIO secret key.                                                   |
| `MINIO_ROOT_USER`            | unset                         | Alternative MinIO root username if API-specific keys are absent.    |
| `MINIO_ROOT_PASSWORD`        | unset                         | Alternative MinIO root password if API-specific keys are absent.    |
| `MINIO_BUCKET`               | `resumes`                     | Bucket used for uploaded resume PDFs.                               |

## API Overview

The local API is mounted under `/api`.

- `GET /api/health` checks API health.
- `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`
  manage local sessions.
- `GET /api/resumes`, `POST /api/resumes`, `PATCH /api/resumes/:id`,
  `DELETE /api/resumes/:id`, `GET /api/resumes/:id/file`, and
  `POST /api/resumes/:id/share` manage protected resume workflows.
- `GET /api/resume-shares/:token` streams a shared PDF without requiring auth
  until the token expires.
- `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`,
  `DELETE /api/users/:id`, and `PUT /api/users/:id/roles` manage local users.
- `GET /api/roles`, `POST /api/roles`, `PATCH /api/roles/:id`,
  `DELETE /api/roles/:id`, `PUT /api/roles/:id/permissions`, and
  `GET /api/permissions` manage RBAC.

Protected API routes require an `Authorization: Bearer <sessionToken>` header.
System roles are seeded by migration: `admin` has all permissions, and
`normal` has read-only resume access.

## Scripts

```bash
pnpm run dev              # Start the Vite dev server
pnpm run dev:api          # Start the local Express API
pnpm run build            # Type-check and build the frontend
pnpm run preview          # Serve the production build locally
pnpm run lint             # Run ESLint
pnpm run format:check     # Check Prettier formatting
pnpm run format           # Format files with Prettier
pnpm run test             # Run frontend Vitest browser tests headlessly
pnpm run test:server      # Run server tests in Node mode
pnpm run test:coverage    # Run frontend tests with V8 coverage
pnpm run knip             # Report unused files, exports, and dependencies
```

If browser tests fail because Chromium is missing, install the browser runtime:

```bash
pnpm run test:browser:install
```

## Notes

- Uploaded resume files must be PDFs and are limited to 10 MB.
- API migrations run automatically when `pnpm run dev:api` starts.
- SQLite data defaults to `server/.data/resumes.sqlite`; remove or change that
  file when you need a clean local database.
- Do not commit `.env`, local databases, MinIO data, or other secrets.

## License

Licensed under the [MIT License](LICENSE).

This project is based on the shadcn-admin dashboard by Sat Naing and retains
the upstream MIT license.
