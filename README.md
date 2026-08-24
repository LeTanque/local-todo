# local-todo

Personal todo app: a Next.js / Electron client plus a local Express + Postgres API.

This repo combines [cyberpunk2044-todo-client](https://github.com/LeTanque/cyberpunk2044-todo-client) and [cyberpunk2044-todo-be](https://github.com/LeTanque/cyberpunk2044-todo-be).

## Prerequisites

- Node.js 20+
- Postgres running locally (Homebrew `postgresql@16` is fine)

## Setup

```bash
cp server/.env.example server/.env
# create the database and role once
psql -d postgres -c "CREATE USER todo WITH PASSWORD 'todo';"
psql -d postgres -c "CREATE DATABASE todo OWNER todo;"
npm install
npm run db:migrate
```

Local Postgres with `trust` auth still needs `DB_PASSWORD` set because the API requires the variable.

## Run

Desktop app. Electron starts the API and Next.js itself, so you do not need a second terminal:

```bash
npm run dev
```

You can also double-click `client/dist/mac-arm64/cyberpunk2077-todo.app` (or the copy in `/Applications`). Postgres still needs to be running.

Web-only (no Electron window):

```bash
npm run dev:web
```

Packaged Electron app:

```bash
npm run dist -w client
```

Then copy `./client/dist/mac-arm64/cyberpunk2077-todo.app` into `/Applications`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API + Next.js + Electron |
| `npm run dev:web` | API + Next.js in the browser |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run test:api` | API integration tests |
