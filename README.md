# ClientSync

One shared workspace for freelancers and their clients — from requirements through tasks,
milestones, files, messages and approvals, to completion.

## Stack

- **Frontend:** React 19 + Vite + React Router (no UI framework, hand-rolled design system)
- **Backend:** Express + SQLite (better-sqlite3, WAL mode)
- **Auth:** httpOnly JWT cookies, bcrypt password hashing
- **Validation:** Zod on the server, mirrored inline validation on the client

## Running locally

```bash
npm install
npm run dev          # API on :3001, Vite dev server on :5173 (proxies /api)
```

Production:

```bash
npm run build        # builds client/dist
npm start            # Express serves the API and the built SPA on :3001
```

Create the system owner account:

```bash
npm run create-admin -- owner@example.com yourpassword "System Owner"
```

### Environment variables

| Variable     | Default                     | Purpose                                     |
| ------------ | --------------------------- | ------------------------------------------- |
| `PORT`       | `3001`                      | API / production server port                 |
| `JWT_SECRET` | dev fallback                | **Set this in production.**                  |
| `DATA_DIR`   | `./data`                    | SQLite database and uploaded files location  |

## Roles and permissions

| Capability                     | Freelancer | Client | Admin |
| ------------------------------ | :--------: | :----: | :---: |
| Create / edit / delete project |     ✅      |   ❌    |  read |
| Manage tasks & milestones      |     ✅      |   ❌    |  read |
| Add / remove project members   |     ✅      |   ❌    |   ❌   |
| Upload & download files        |     ✅      |   ✅    |  read |
| Post messages                  |     ✅      |   ✅    |  read |
| Request approval               |     ✅      |   ❌    |   ❌   |
| Approve / request changes      |     ❌      |   ✅    |   ❌   |
| Platform-wide metrics          |     ❌      |   ❌    |  ✅    |

Authorization is enforced server-side by the `projectAccess()` middleware. Non-members receive
`404` rather than `403`, so the existence of another user's project is never disclosed.

## Core workflow

1. **Requirements** — freelancer creates a project with a description and brief, and adds the client.
2. **Milestones & tasks** — work is broken into phases and tasks on a four-column board.
3. **Files & messages** — deliverables and conversation stay attached to the project.
4. **Approvals** — the freelancer requests sign-off; only the client can approve or request changes
   (change requests require an explanation). Approving a milestone-linked request completes that milestone.
5. **Completion** — a project can only be marked complete when no approvals are pending and every
   task is done. Every action is written to a per-project activity log.

## Routes

| Path | Purpose |
| ---- | ------- |
| `/` | Marketing landing page |
| `/auth/login`, `/auth/register` | Authentication (`/login`, `/register` redirect here) |
| `/dashboard` | Real-data metrics + recent projects |
| `/projects` | Project list with search and status filter |
| `/projects/:id` | Project overview (requirements, status, people, activity) |
| `/projects/:id/tasks` | Kanban board |
| `/projects/:id/milestones` | Phases |
| `/projects/:id/files` | Uploads and downloads |
| `/projects/:id/messages` | Project conversation |
| `/projects/:id/approvals` | Approval requests and decisions |
| `/client/:projectId` | Simplified client portal (clients only) |
| `/settings`, `/settings/security`, `/settings/notifications` | Account settings |
| `/admin` | Platform metrics (admin only) |
| `*` | Not-found page |

## Database

13 tables, all with `created_at`; mutable tables also carry `updated_at` kept current by SQLite triggers.

`users` · `profiles` · `workspaces` · `workspace_members` · `projects` · `project_members`
`tasks` · `milestones` · `messages` · `files` · `approvals` · `notifications` · `activity_logs`

Foreign keys are enforced (`PRAGMA foreign_keys = ON`) and cascade on delete, so removing a user or
project leaves no orphan rows. The canonical DDL is `server/src/schema.sql`; `server/src/migrate.js`
applies it idempotently at boot and upgrades older databases in place.

## Component library

`client/src/components/ui/primitives.jsx` exports the shared kit, re-exported from `components/ui.jsx`:

Button · Input · Textarea · Select · Field · Modal · ConfirmDialog · Dropdown · Avatar · Badge
Card / CardHead · Tabs · Alert · Progress · Empty · Skeleton / SkeletonCard / Loading · ErrorState

Toasts come from `ToastProvider` (`lib/hooks.jsx`); `useConfirm()` (`lib/useConfirm.jsx`) provides
an async confirm dialog with its own loading and error states, replacing `window.confirm`.

## Project structure

```
server/src/
  schema.sql         canonical DDL
  migrate.js         idempotent migrations + updated_at triggers
  db.js              connection, pragmas, upload dir
  auth.js            JWT issue/verify, requireAuth, requireAdmin, projectAccess guard
  util.js            ids, zod validation helper, activity log, notification fan-out
  routes/            auth, projects (+stats), work, files, me (profile/notifications), admin
client/src/
  lib/               api client, auth + toast + fetch hooks, useConfirm
  components/ui/     primitives.jsx — the reusable component kit
  components/project/ Overview, Tasks, Milestones, Files, Messages, Approvals
  pages/             Landing, Login, Register, Dashboard, ProjectsList, Settings,
                     ClientPortal, Admin, NotFound
  pages/project/     ProjectLayout + one page per nested section
```

## Notes

- All core data is persisted in SQLite; nothing product-critical lives in localStorage.
- Uploads are capped at 20 MB and stored outside the web root, served only through an
  access-checked download route.
- The database ships empty apart from the admin account you create — there is no seeded demo data.
- Dashboard and admin statistics are computed from real rows with SQL aggregates, scoped to the
  projects the caller belongs to. Nothing is hard-coded or mocked.
- Notifications are generated server-side on messages, uploads, approval requests and decisions,
  fanned out to project members except the actor, and respect each user's preference.
