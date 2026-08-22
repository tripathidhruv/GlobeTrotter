// Vercel serverless entry point.
//
// This wraps the whole Express app (server/src/app.ts) as a single serverless
// function. Express apps are directly callable as (req, res) => void, which is
// exactly the signature Vercel's Node.js runtime expects, so no adapter
// library is needed.
//
// IMPORTANT: this imports the exported `app` from server/src/app.js (the
// configured Express app, no routes/middleware attached at request time),
// NOT server/src/index.ts (the local dev entry, which calls app.listen()).
// Calling app.listen() here would break serverless — each invocation must
// just hand the request/response pair to Express and return.
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../server/src/app.js";

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req, res);
}
