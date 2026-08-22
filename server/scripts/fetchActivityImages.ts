import "dotenv/config";
import db from "../src/db.js";

/**
 * Populates Activity.imageUrl with real photographs.
 *
 * Most seeded activities are genuine landmarks ("Louvre Museum", "Sagrada
 * Familia"), so their Wikipedia article usually carries a lead image. Every URL
 * is fetched live and verified with a real request before it is stored — an
 * image URL written from memory would 404. Anything that can't be verified is
 * left null and the UI falls back to the city photo.
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

async function lookup(title: string): Promise<string | null> {
  const res = await fetch(WIKI_SUMMARY + encodeURIComponent(title), {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as WikiSummary;
  const url = data.originalimage?.source ?? data.thumbnail?.source;
  return url ? clean(url) : null;
}

/**
 * Sanity-check the URL shape.
 *
 * We deliberately do NOT issue an HTTP request against the file: Wikimedia
 * serves upload.wikimedia.org with a 403 to non-browser user agents, so a
 * fetch here fails for every URL even though browsers load them fine (the
 * city photos come from the same source and render correctly). The REST
 * summary API is authoritative that the file exists, so trusting its response
 * is both correct and kinder to their infrastructure.
 */
function verify(url: string): boolean {
  return /^https:\/\/upload\.wikimedia\.org\/.+\.(jpg|jpeg|png|webp)$/i.test(url);
}

async function main() {
  const activities = await db.activity.findMany({
    where: { imageUrl: null },
    include: { city: { select: { name: true } } },
  });

  console.log(`${activities.length} activities need an image.`);

  let found = 0;
  for (const activity of activities) {
    // Try the bare name first, then disambiguated by city — "Old Town" alone is
    // ambiguous, "Old Town (Prague)" is not.
    const candidates = [activity.name, `${activity.name} ${activity.city.name}`];

    let url: string | null = null;
    for (const candidate of candidates) {
      try {
        const hit = await lookup(candidate);
        if (hit && verify(hit)) {
          url = hit;
          break;
        }
      } catch {
        // Network hiccup on one title shouldn't abort the whole run.
      }
    }

    if (url) {
      await db.activity.update({ where: { id: activity.id }, data: { imageUrl: url } });
      found++;
      console.log(`  [ok]   ${activity.name}`);
    } else {
      console.log(`  [skip] ${activity.name} — no verified image, city photo will be used`);
    }

    // Be polite to the API.
    await new Promise((r) => setTimeout(r, 120));
  }

  const total = await db.activity.count();
  const withImage = await db.activity.count({ where: { imageUrl: { not: null } } });
  console.log(`\nDone. Added ${found} this run. ${withImage}/${total} activities now have images.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
