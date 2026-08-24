<img width="913" height="318" alt="Screenshot 2026-07-28 at 2 52 44 PM" src="https://github.com/user-attachments/assets/f25f074f-84de-42ba-a363-7ecfaff9b2f9" />

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Concurrent development build mode:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Make sure the backend postgres server is running, locally, at :3001

## Electron framework

Needs to run `dist` to build the .app before running.

```bash
npm run dist
```

Launch the app from `./dist/mac-arm64/todo-electron.app`

## Goal

A todo app for personal use, which I invite you to use, as well! 

I'll build out additional features as I want/need them. Relatively low overhead and eventual portability. Just a simple todo app. 

## TODO

- Containerize the whole thing?
- SQLite db packaged with the front-end to make it more portable?

