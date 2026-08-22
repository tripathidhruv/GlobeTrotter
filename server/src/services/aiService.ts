import type db from "../db.js";

type DbClient = typeof db;

export interface CatalogueCity {
  id: string;
  name: string;
  country: string;
  region: string | null;
  costIndex: number;
  popularityScore: number;
}

export interface CatalogueActivity {
  id: string;
  cityId: string;
  name: string;
  category: string;
}

export interface AiSuggestion {
  cityId: string;
  cityName: string;
  country: string;
  reason: string;
  suggestedNights: number;
  activityNames: string[];
  activityIds: string[];
}

export interface AiSuggestResult {
  summary: string;
  suggestions: AiSuggestion[];
}

export class AiServiceError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
    this.name = "AiServiceError";
  }
}

interface RawSuggestion {
  cityName?: unknown;
  reason?: unknown;
  suggestedNights?: unknown;
  activityNames?: unknown;
}

interface RawResponse {
  summary?: unknown;
  suggestions?: unknown;
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_TOKENS = 1200;

function buildCataloguePrompt(cities: CatalogueCity[], activities: CatalogueActivity[]): string {
  const cityLines = cities
    .map(
      (c) =>
        `- ${c.name}, ${c.country}${c.region ? ` (${c.region})` : ""} | costIndex=${c.costIndex} | popularity=${c.popularityScore}`
    )
    .join("\n");

  const activitiesByCity = new Map<string, string[]>();
  for (const a of activities) {
    const list = activitiesByCity.get(a.cityId) ?? [];
    list.push(`${a.name} (${a.category})`);
    activitiesByCity.set(a.cityId, list);
  }
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const activityLines: string[] = [];
  for (const [cityId, names] of activitiesByCity) {
    const city = cityById.get(cityId);
    if (!city) continue;
    activityLines.push(`${city.name}: ${names.join(", ")}`);
  }

  return [
    "CATALOGUE OF CITIES (you may ONLY suggest cities from this exact list, using the exact name shown):",
    cityLines,
    "",
    "CATALOGUE OF ACTIVITIES BY CITY (suggest activity names ONLY from this list, matching the city):",
    activityLines.join("\n"),
  ].join("\n");
}

async function callOpenAi(messages: Array<{ role: string; content: string }>): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiServiceError("AI suggestions are not configured on the server.", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiServiceError("The AI suggestion request timed out. Please try again.", 504);
    }
    throw new AiServiceError("Could not reach the AI suggestion service.", 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AiServiceError(
      `AI suggestion service returned an error (${response.status}).`,
      502
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AiServiceError("AI suggestion service returned an unreadable response.", 502);
  }

  const content = (payload as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]
    ?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new AiServiceError("AI suggestion service returned an empty response.", 502);
  }
  return content;
}

function parseAndValidate(
  raw: string,
  cities: CatalogueCity[],
  activities: CatalogueActivity[]
): AiSuggestResult {
  let parsed: RawResponse;
  try {
    parsed = JSON.parse(raw) as RawResponse;
  } catch {
    throw new AiServiceError("AI suggestion service returned invalid JSON.", 502);
  }

  const citiesByName = new Map(cities.map((c) => [c.name.toLowerCase(), c]));
  const activitiesByCity = new Map<string, CatalogueActivity[]>();
  for (const a of activities) {
    const list = activitiesByCity.get(a.cityId) ?? [];
    list.push(a);
    activitiesByCity.set(a.cityId, list);
  }

  const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  const suggestions: AiSuggestion[] = [];

  for (const item of rawSuggestions as RawSuggestion[]) {
    if (!item || typeof item.cityName !== "string") continue;
    const normalized = item.cityName.trim().toLowerCase();
    // The model sometimes returns "City, Country" even though we ask for the
    // bare catalogue name — fall back to matching on the part before the comma.
    const city =
      citiesByName.get(normalized) ??
      citiesByName.get(normalized.split(",")[0]?.trim() ?? "");
    if (!city) continue; // Drop suggestions for cities not in our catalogue.

    const cityActivities = activitiesByCity.get(city.id) ?? [];
    const activityNamesByLower = new Map(cityActivities.map((a) => [a.name.toLowerCase(), a]));

    const requestedNames = Array.isArray(item.activityNames)
      ? item.activityNames.filter((n): n is string => typeof n === "string")
      : [];

    const matchedActivities = requestedNames
      .map((name) => activityNamesByLower.get(name.trim().toLowerCase()))
      .filter((a): a is CatalogueActivity => !!a);

    const nightsRaw = item.suggestedNights;
    const suggestedNights =
      typeof nightsRaw === "number" && Number.isFinite(nightsRaw) && nightsRaw > 0
        ? Math.round(nightsRaw)
        : 2;

    suggestions.push({
      cityId: city.id,
      cityName: city.name,
      country: city.country,
      reason: typeof item.reason === "string" ? item.reason : "",
      suggestedNights,
      activityNames: matchedActivities.map((a) => a.name),
      activityIds: matchedActivities.map((a) => a.id),
    });
  }

  const summary = typeof parsed.summary === "string" ? parsed.summary : "";

  if (suggestions.length === 0) {
    throw new AiServiceError(
      "The AI didn't return any suggestions matching our catalogue. Please try again.",
      502
    );
  }

  return { summary, suggestions };
}

export interface SuggestParams {
  prompt: string;
  days?: number;
  interests?: string[];
  excludeCityIds?: string[];
}

export async function getAiSuggestions(
  db: DbClient,
  params: SuggestParams
): Promise<AiSuggestResult> {
  const [cities, activities] = await Promise.all([
    db.city.findMany({
      select: {
        id: true,
        name: true,
        country: true,
        region: true,
        costIndex: true,
        popularityScore: true,
      },
      orderBy: { popularityScore: "desc" },
    }),
    db.activity.findMany({
      select: { id: true, cityId: true, name: true, category: true },
    }),
  ]);

  const excludeIds = new Set(params.excludeCityIds ?? []);
  const availableCities = cities.filter((c) => !excludeIds.has(c.id));
  const availableActivities = activities.filter((a) => !excludeIds.has(a.cityId));

  const catalogue = buildCataloguePrompt(availableCities, availableActivities);

  const userInstructions = [
    params.prompt,
    params.days ? `Trip length: about ${params.days} days.` : "",
    params.interests && params.interests.length > 0
      ? `Interests: ${params.interests.join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemMessage = [
    "You are a travel planning assistant for GlobeTrotter, an itinerary builder.",
    "You must suggest ONLY cities and activities that appear in the catalogue provided below.",
    "Never invent a city or activity name that is not in the catalogue.",
    "Respond with STRICT JSON only, matching this shape exactly:",
    '{ "summary": string, "suggestions": [ { "cityName": string, "reason": string, "suggestedNights": number, "activityNames": string[] } ] }',
    "cityName must be the bare city name exactly as it appears in the catalogue below (do not append the country, e.g. use \"Lisbon\" not \"Lisbon, Portugal\"). activityNames must exactly match activity names that belong to that city in the catalogue.",
    "Suggest between 2 and 5 cities.",
    "",
    catalogue,
  ].join("\n");

  const content = await callOpenAi([
    { role: "system", content: systemMessage },
    { role: "user", content: userInstructions || "Suggest a great trip itinerary." },
  ]);

  return parseAndValidate(content, availableCities, availableActivities);
}
