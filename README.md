# Pyramid Task Workspace

Full-stack technical assessment for AbleSpace. The project implements a responsive task-management workspace inspired by the supplied Figma design, backed by a NestJS API and PostgreSQL.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS, Lucide, and dnd-kit
- NestJS, JWT guest authentication, Prisma, and PostgreSQL/Neon
- Vercel for the web application and Render for the API

## Product Capabilities

- Guest login with a durable local guest key and short-lived JWT
- Seeded workspace with a functional kanban board
- Create, edit, delete, search, filter, and drag tasks between columns
- Validated NestJS REST API and durable Postgres persistence
- Responsive board, task detail drawer, field visibility controls, filters, and settings drawer
- Persistent light/dark theme and color preference

The Google login control is intentionally demo-only because OAuth credentials were not supplied for this assessment. The guest flow is the required functional authentication path.

## Local Development

1. Copy `apps/api/.env.example` to `apps/api/.env` and set a PostgreSQL `DATABASE_URL` plus a secure `JWT_SECRET`.
2. Copy `apps/web/.env.example` to `apps/web/.env.local` if the API is not at `http://localhost:4000/api`.
3. Install packages with `npm install`.
4. Generate the Prisma client with `npm run prisma:generate --workspace=@ablespace/api`.
5. Apply migrations with `npm run prisma:migrate --workspace=@ablespace/api`.
6. Start the API using `npm run dev:api` and the web app using `npm run dev:web`.

## API Surface

- `GET /api/health`
- `POST /api/auth/guest`
- `GET /api/workspaces/current`
- `GET|POST /api/tasks`
- `PATCH|DELETE /api/tasks/:id`
- `PATCH /api/tasks/:id/status`

All workspace and task endpoints require the guest JWT returned by `POST /api/auth/guest`.

## Deployment

1. Create a Neon PostgreSQL database and set `DATABASE_URL` in Render.
2. Deploy this repository to Render using `render.yaml`; set `WEB_ORIGIN` to the final Vercel URL.
3. Create a Vercel project with `apps/web` as the root directory and set `NEXT_PUBLIC_API_URL` to `https://<render-service>/api`.
4. Verify `https://<render-service>/api/health`, the guest flow, task creation, a drag-and-drop update, and a page refresh before sharing the live URL.

## Part 2 Product Review

`docs/ablespace-take-data-review.md` is a deliberately empty evidence template. Complete it only after personally inspecting AbleSpace's Caseload > Take Data screen and redacting sensitive information. The assessment should not be submitted while that document is incomplete.

## Figma Fidelity

The shared Figma file is the visual reference. The app preserves the login, workspace navigation, task board, cards, profile settings, theme, and color controls. Figma's prototype does not cover the complete task-board flow, so the written brief governs functional scope.
