# Local RBAC Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build local SQLite email/password authentication with table-backed RBAC and enforce it across the resume API and frontend UX.

**Architecture:** The server owns authentication and authorization through SQLite repositories, an auth service, and Express middleware. The frontend stores the opaque session token plus the `/api/auth/me` snapshot and mirrors permissions for navigation, route guards, and action visibility.

**Tech Stack:** Vite, React, TypeScript, Zustand, TanStack Router, Express, better-sqlite3, Kysely migrations, Vitest, Node `crypto.scrypt`.

---

## File Structure

- Create `server/auth/password.ts` for password hashing and verification.
- Create `server/auth/auth-types.ts` for role, permission, user, session, and principal types.
- Create `server/auth/sqlite-auth-repository.ts` for `t_*` auth/RBAC table access.
- Create `server/auth/auth-service.ts` for login, logout, session lookup, and user/RBAC management.
- Create `server/auth/auth-middleware.ts` for Express bearer-token resolution and permission checks.
- Create `server/resumes/migrations/20260623000000_create_auth_rbac.ts` for `t_*` tables and seeds.
- Modify `server/index.ts` to mount auth/user/RBAC routes and guard resume routes.
- Modify `src/stores/auth-store.ts` for session token, user, roles, and permissions.
- Create `src/lib/permissions.ts` and `src/hooks/use-permission.ts`.
- Modify `src/features/auth/sign-in/components/user-auth-form.tsx` to call `/api/auth/login`.
- Modify `src/features/resumes/data/resume-api.ts` to attach bearer tokens and parse 401/403.
- Modify sidebar/layout/user-management/resume components to filter and guard by permissions.

## Task 1: Auth/RBAC Persistence

**Files:**
- Create: `server/auth/auth-types.ts`
- Create: `server/auth/password.ts`
- Create: `server/auth/sqlite-auth-repository.ts`
- Create: `server/resumes/migrations/20260623000000_create_auth_rbac.ts`
- Test: `server/auth/sqlite-auth-repository.test.ts`
- Test: `server/auth/password.test.ts`

- [ ] **Step 1: Write failing repository and password tests**

```ts
it('seeds admin and normal roles with the required permissions', () => {
  const repository = createSqliteAuthRepository({ databasePath })
  expect(repository.listRoles().map((role) => role.name)).toEqual([
    'admin',
    'normal',
  ])
  expect(repository.listRolePermissions('admin')).toEqual(
    expect.arrayContaining([
      'resumes:read',
      'resumes:create',
      'resumes:update',
      'resumes:delete',
      'resumes:share',
      'users:manage',
      'rbac:manage',
    ])
  )
  expect(repository.listRolePermissions('normal')).toEqual(['resumes:read'])
})

it('verifies a password hash created by hashPassword', async () => {
  const hash = await hashPassword('correct horse battery staple')
  await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true)
  await expect(verifyPassword('wrong password', hash)).resolves.toBe(false)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run --config vitest.server.config.ts server/auth/sqlite-auth-repository.test.ts server/auth/password.test.ts`

Expected: fail because the files and functions do not exist.

- [ ] **Step 3: Implement migration, repository, and password helpers**

Create `t_users`, `t_sessions`, `t_roles`, `t_permissions`, `t_user_roles`, and `t_role_permissions`; seed `admin`, `normal`, and the permission matrix. Implement `hashPassword` and `verifyPassword` with `crypto.scrypt`, random salt, and timing-safe comparison.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run --config vitest.server.config.ts server/auth/sqlite-auth-repository.test.ts server/auth/password.test.ts`

Expected: pass.

## Task 2: Auth Service and Middleware

**Files:**
- Create: `server/auth/auth-service.ts`
- Create: `server/auth/auth-middleware.ts`
- Test: `server/auth/auth-service.test.ts`
- Test: `server/auth/auth-middleware.test.ts`

- [ ] **Step 1: Write failing service and middleware tests**

```ts
it('logs in with a valid password and returns roles and permissions', async () => {
  const service = createAuthService({ repository, getNow, createToken })
  const result = await service.login({
    email: 'admin@example.com',
    password: 'password123',
  })
  expect(result.user.email).toBe('admin@example.com')
  expect(result.roles).toEqual(['admin'])
  expect(result.permissions).toContain('rbac:manage')
  expect(result.sessionToken).toBe('raw-session-token')
})

it('rejects missing sessions with 401 and missing permissions with 403', () => {
  expect(requirePermission('resumes:delete', undefined)).toEqual({
    status: 401,
  })
  expect(
    requirePermission('resumes:delete', {
      permissions: ['resumes:read'],
    })
  ).toEqual({ status: 403 })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run --config vitest.server.config.ts server/auth/auth-service.test.ts server/auth/auth-middleware.test.ts`

Expected: fail because service and middleware do not exist.

- [ ] **Step 3: Implement service and middleware**

Implement login, logout, session lookup, principal construction, user CRUD, role assignment, role-permission updates, bearer parsing, optional auth, and permission guard helpers.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run --config vitest.server.config.ts server/auth/auth-service.test.ts server/auth/auth-middleware.test.ts`

Expected: pass.

## Task 3: Express API Integration

**Files:**
- Modify: `server/index.ts`
- Test: `server/auth/auth-api.test.ts`

- [ ] **Step 1: Write failing API tests**

```ts
it('keeps public share links unauthenticated but protects resume mutation', async () => {
  const api = createTestApi()
  const unauthenticatedDelete = await api.delete('/api/resumes/resume-1')
  expect(unauthenticatedDelete.status).toBe(401)
  const share = await api.get('/api/resume-shares/share-token')
  expect(share.status).not.toBe(401)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run --config vitest.server.config.ts server/auth/auth-api.test.ts`

Expected: fail because route integration is not implemented.

- [ ] **Step 3: Integrate auth routes and guards**

Refactor Express setup into an exported `createServerApp` for tests and use it from `server/index.ts`. Mount `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/users`, `/api/roles`, and `/api/permissions`. Add permission middleware to resume routes and leave health/share-token routes public.

- [ ] **Step 4: Run integration tests**

Run: `pnpm exec vitest run --config vitest.server.config.ts server/auth/auth-api.test.ts`

Expected: pass.

## Task 4: Frontend Auth and Permission Model

**Files:**
- Modify: `src/stores/auth-store.ts`
- Create: `src/lib/permissions.ts`
- Create: `src/hooks/use-permission.ts`
- Modify: `src/features/auth/sign-in/components/user-auth-form.tsx`
- Modify: `src/features/resumes/data/resume-api.ts`
- Test: `src/stores/auth-store.test.ts`
- Test: `src/lib/permissions.test.ts`
- Test: `src/features/resumes/data/resume-api.test.ts`

- [ ] **Step 1: Write failing frontend tests**

```ts
it('allows admin mutating actions and denies normal mutating actions', () => {
  expect(hasPermission(['resumes:delete'], 'resumes:delete')).toBe(true)
  expect(hasPermission(['resumes:read'], 'resumes:delete')).toBe(false)
})

it('sends bearer tokens with resume API requests', async () => {
  useAuthStore.getState().auth.setSessionToken('session-token')
  await listResumes()
  expect(fetch).toHaveBeenCalledWith('/api/resumes', {
    headers: { Authorization: 'Bearer session-token' },
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/stores/auth-store.test.ts src/lib/permissions.test.ts src/features/resumes/data/resume-api.test.ts`

Expected: fail because the new auth model and permission helpers are missing.

- [ ] **Step 3: Implement frontend auth helpers**

Update the store to persist `sessionToken`, `user`, `roles`, and `permissions`; add permission helpers; update sign-in to call login; add bearer headers to resume API calls.

- [ ] **Step 4: Run frontend tests**

Run: `pnpm exec vitest run src/stores/auth-store.test.ts src/lib/permissions.test.ts src/features/resumes/data/resume-api.test.ts`

Expected: pass.

## Task 5: Frontend Guards and RBAC UX

**Files:**
- Modify: `src/components/layout/types.ts`
- Modify: `src/components/layout/data/sidebar-data.ts`
- Modify: `src/components/layout/nav-group.tsx`
- Modify: `src/components/layout/authenticated-layout.tsx`
- Modify: `src/features/users/index.tsx`
- Modify: `src/features/resumes/components/resume-upload-page.tsx`
- Modify: `src/features/resumes/components/resume-preview-page.tsx`
- Test: `src/components/layout/data/sidebar-data.test.ts`
- Test: `src/features/resumes/components/resume-preview-page.test.tsx`

- [ ] **Step 1: Write failing guard tests**

```ts
it('filters admin-only sidebar items for normal users', () => {
  const filtered = filterNavGroupsByPermissions(sidebarData.navGroups, [
    'resumes:read',
  ])
  expect(flattenTitles(filtered)).not.toContain('Users')
  expect(flattenTitles(filtered)).not.toContain('Resume Upload')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/components/layout/data/sidebar-data.test.ts`

Expected: fail because permission-aware filtering does not exist.

- [ ] **Step 3: Implement guards and filtering**

Add `requiredPermissions` metadata to nav items, filter sidebar items using current permissions, and show 401/403 views for protected sections. Hide or disable resume mutation controls without the matching permission.

- [ ] **Step 4: Run guard tests**

Run: `pnpm exec vitest run src/components/layout/data/sidebar-data.test.ts`

Expected: pass.

## Task 6: Full Verification

**Files:**
- All changed files.

- [ ] **Step 1: Run server tests**

Run: `pnpm run test:server`

Expected: all server tests pass.

- [ ] **Step 2: Run frontend tests**

Run: `pnpm run test`

Expected: all frontend browser tests pass.

- [ ] **Step 3: Run build**

Run: `pnpm run build`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 4: Run lint and format check**

Run: `pnpm run lint`

Expected: no lint errors.

Run: `pnpm run format:check`

Expected: no formatting differences.
