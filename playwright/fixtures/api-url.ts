// The app's Express API runs as its own server, separate from the Vite dev
// server that serves the frontend on baseURL (port 3000) — see
// src/utils/portUtils.ts and cypress.config.ts's `expose.apiUrl`, which the
// browser and Cypress both call directly for this reason.
const BACKEND_PORT = process.env.VITE_BACKEND_PORT ?? "3001";

export const API_URL = process.env.PLAYWRIGHT_API_URL ?? `http://localhost:${BACKEND_PORT}`;
