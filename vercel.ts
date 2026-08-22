// NOTE: Vercel only reads `vercel.json` at the project root for deployment
// configuration — it does not load this file. `@vercel/config/v1` (previously
// imported here) is not installed anywhere in this repo, so importing it made
// the whole project fail to type-check. This file is kept only as a typed,
// in-repo mirror of vercel.json for reference; `vercel.json` is the source of
// truth actually used by Vercel, so keep the two in sync by hand.
interface VercelRewrite {
  source: string;
  destination: string;
}

interface VercelConfig {
  buildCommand: string;
  installCommand?: string;
  outputDirectory: string;
  rewrites: VercelRewrite[];
}

export const config: VercelConfig = {
  buildCommand: "npm run vercel-build",
  installCommand: "npm install",
  outputDirectory: "client/dist",
  rewrites: [
    { source: "/api/(.*)", destination: "/api" },
    { source: "/(.*)", destination: "/index.html" },
  ],
};
