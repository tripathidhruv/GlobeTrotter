import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  buildCommand: "npm run build --workspace client",
  outputDirectory: "client/dist",
  rewrites: [{ source: "/api/(.*)", destination: "/api" }],
};
