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

Web app (API on :3001, Next.js on :3000):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Desktop (Electron + Next + API):

```bash
npm run dev:electron
```

Packaged Electron app:

```bash
npm run dist -w client
```

Then launch `./client/dist/mac-arm64/todo-electron.app`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API + Next.js |
| `npm run dev:electron` | API + Next.js + Electron |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run test:api` | API integration tests |
