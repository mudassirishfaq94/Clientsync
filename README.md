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

## Project structure

```
server/src/
  db.js              schema + connection
  auth.js            JWT issue/verify, requireAuth, projectAccess guard
  util.js            id generation, zod validation helper, activity log
  routes/            auth, projects, work (milestones/tasks/messages/approvals), files, admin
client/src/
  lib/               api client (typed errors), auth + toast + fetch hooks
  components/ui.jsx  reusable Card, Button, Field, Modal, Badge, Empty, Loading, ErrorState…
  components/project/ Overview, Tasks, Milestones, Files, Messages, Approvals
  pages/             Landing, Login, Register, Dashboard, ProjectPage, Admin
```

## Notes

- All core data is persisted in SQLite; nothing product-critical lives in localStorage.
- Uploads are capped at 20 MB and stored outside the web root, served only through an
  access-checked download route.
- The database ships empty apart from the admin account you create — there is no seeded demo data.
