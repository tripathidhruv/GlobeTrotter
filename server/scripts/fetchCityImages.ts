import "dotenv/config";
import db from "../src/db.js";

/**
 * Populates City.imageUrl with real photographs from Wikipedia.
 *
 * URLs are always taken from a live API response, never written from memory —
 * a remembered image URL is fabricated data and reliably 404s. Cities whose
 * lookup fails keep a null image; the UI renders no frame rather than a
 * placeholder.
 *
 * Idempotent: only fills cities that currently have no image, so re-running
 * after a partial run (or a database restore) is safe and cheap.
 */

const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const UA = "GlobeTrotter/1.0 (hackathon project; contact: dev@example.com)";

interface WikiSummary {
  originalimage?: { source?: string };
  thumbnail?: { source?: string };
}

/** Strip the analytics query string Wikimedia appends to API-sourced URLs. */
function clean(url: string): string {
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
}

/**
 * Shape check only. We deliberately do NOT request the file itself: Wikimedia
 * serves upload.wikimedia.org with a 403 to non-browser user agents, so such a
 * check fails for every URL even though browsers load them fine. The REST
 * summary API is authoritative that the file exists.
 */
function looksLikeImage(url: string): boolean {
  return /^https:\/\/upload\.wikimedia\.org\/.+\.(jpg|jpeg|png|webp)$/i.test(url);
}

async function lookup(title: string): Promise<string | null> {
  const res = await fetch(WIKI_SUMMARY + encodeURIComponent(title), {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as WikiSummary;
  const url = data.originalimage?.source ?? data.thumbnail?.source;
  return url ? clean(url) : null;
}

async function main() {
  const cities = await db.city.findMany({
    where: { imageUrl: null },
    select: { id: true, name: true, country: true },
  });

  console.log(`${cities.length} cities need an image.`);

  let found = 0;
  for (const city of cities) {
    // Bare name first; fall back to a disambiguated title for names that
    // collide with other subjects.
    const candidates = [city.name, `${city.name}, ${city.country}`, `${city.name} (city)`];

    let url: string | null = null;
    for (const candidate of candidates) {
      try {
        const hit = await lookup(candidate);
        if (hit && looksLikeImage(hit)) {
          url = hit;
          break;
        }
      } catch {
        // A single failed title shouldn't abort the run.
      }
    }

    if (url) {
      await db.city.update({ where: { id: city.id }, data: { imageUrl: url } });
      found++;
      console.log(`  [ok]   ${city.name}`);
    } else {
      console.log(`  [skip] ${city.name} — no image found`);
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  const total = await db.city.count();
  const withImage = await db.city.count({ where: { imageUrl: { not: null } } });
  console.log(`\nDone. Added ${found} this run. ${withImage}/${total} cities now have images.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
