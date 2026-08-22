// Standalone offline script — NOT part of the server app.
// Fetches a small curated set of city background videos from Pexels
// and saves them into client/public/video/<slug>.mp4.
//
// Run with: npx tsx server/scripts/fetchVideos.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(envPath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return out;
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = loadEnv(path.join(__dirname, "..", ".env"));
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || env.PEXELS_API_KEY;

if (!PEXELS_API_KEY) {
  console.error("PEXELS_API_KEY not found in server/.env — aborting.");
  process.exit(1);
}

const CITIES = ["Paris", "Tokyo", "New York City", "Rome", "Barcelona", "Lisbon", "Istanbul", "Marrakesh", "Reykjavik", "Kyoto"];

const OUT_DIR = path.join(__dirname, "..", "..", "client", "public", "video");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface VideoFile {
  quality: string;
  width: number;
  height: number;
  file_type: string;
  link: string;
}

interface PexelsVideo {
  id: number;
  duration: number;
  video_files: VideoFile[];
}

interface PexelsSearchResponse {
  videos: PexelsVideo[];
}

function pickRendition(files: VideoFile[]): VideoFile | undefined {
  const mp4s = files.filter((f) => f.file_type === "video/mp4");
  return (
    mp4s.find((f) => f.width === 960) ??
    mp4s.find((f) => f.width === 640) ??
    mp4s.sort((a, b) => a.width - b.width)[0]
  );
}

async function downloadFile(url: string, destPath: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status}) for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const results: { city: string; slug: string; bytes: number; skipped: boolean }[] = [];

  for (const city of CITIES) {
    const slug = slugify(city);
    const destPath = path.join(OUT_DIR, `${slug}.mp4`);

    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);
      console.log(`[skip] ${city} -> ${slug}.mp4 already exists (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
      results.push({ city, slug, bytes: stat.size, skipped: true });
      continue;
    }

    const searchUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(
      city,
    )}&per_page=1&orientation=landscape`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: PEXELS_API_KEY ?? "" },
    });

    if (!res.ok) {
      console.error(`[fail] ${city}: search request failed with ${res.status}`);
      continue;
    }

    const data = (await res.json()) as PexelsSearchResponse;
    const video = data.videos?.[0];
    if (!video) {
      console.error(`[fail] ${city}: no videos found`);
      continue;
    }

    const rendition = pickRendition(video.video_files);
    if (!rendition) {
      console.error(`[fail] ${city}: no mp4 rendition found`);
      continue;
    }

    console.log(`[fetch] ${city} -> ${slug}.mp4 (${rendition.width}x${rendition.height})`);
    const bytes = await downloadFile(rendition.link, destPath);
    console.log(`[done] ${city} -> ${slug}.mp4 (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
    results.push({ city, slug, bytes, skipped: false });
  }

  const totalBytes = results.reduce((sum, r) => sum + r.bytes, 0);
  console.log("\nSummary:");
  for (const r of results) {
    console.log(`  ${r.skipped ? "skipped" : "downloaded"}: ${r.city} (${r.slug}.mp4) — ${(r.bytes / 1024 / 1024).toFixed(2)} MB`);
  }
  console.log(`Total: ${results.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
