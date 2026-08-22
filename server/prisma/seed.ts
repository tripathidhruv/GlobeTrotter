import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Category = "sightseeing" | "food" | "leisure" | "adventure";

interface ActivitySeed {
  name: string;
  category: Category;
  estCost: number;
  estDurationMinutes: number;
}

interface CitySeed {
  name: string;
  country: string;
  region: string;
  costIndex: number;
  popularityScore: number;
  activities: ActivitySeed[];
}

// Real cities, countries, and attractions/experiences. Cost index and popularity
// score are plausible relative estimates (0-100 scale), not sourced from a single
// external dataset. Image URLs are intentionally omitted (left null) rather than
// invented or pulled from a placeholder service — the UI renders no frame when
// imageUrl is absent, which is the correct honest state.
const CATALOG: CitySeed[] = [
  // --- Europe ---
  {
    name: "Paris",
    country: "France",
    region: "Europe",
    costIndex: 82,
    popularityScore: 98,
    activities: [
      { name: "Louvre Museum", category: "sightseeing", estCost: 20, estDurationMinutes: 180 },
      { name: "Eiffel Tower Summit", category: "sightseeing", estCost: 28, estDurationMinutes: 120 },
      { name: "Seine River Cruise", category: "leisure", estCost: 15, estDurationMinutes: 60 },
      { name: "Le Marais Food Walk", category: "food", estCost: 45, estDurationMinutes: 150 },
    ],
  },
  {
    name: "Rome",
    country: "Italy",
    region: "Europe",
    costIndex: 70,
    popularityScore: 96,
    activities: [
      { name: "Colosseum & Roman Forum", category: "sightseeing", estCost: 24, estDurationMinutes: 180 },
      { name: "Vatican Museums & Sistine Chapel", category: "sightseeing", estCost: 30, estDurationMinutes: 210 },
      { name: "Trastevere Food Tour", category: "food", estCost: 55, estDurationMinutes: 150 },
      { name: "Trevi Fountain Evening Walk", category: "leisure", estCost: 0, estDurationMinutes: 60 },
    ],
  },
  {
    name: "Barcelona",
    country: "Spain",
    region: "Europe",
    costIndex: 68,
    popularityScore: 93,
    activities: [
      { name: "Sagrada Familia", category: "sightseeing", estCost: 26, estDurationMinutes: 90 },
      { name: "Park Guell", category: "sightseeing", estCost: 10, estDurationMinutes: 90 },
      { name: "Tapas & Wine Tasting", category: "food", estCost: 50, estDurationMinutes: 150 },
      { name: "La Boqueria Market Visit", category: "leisure", estCost: 0, estDurationMinutes: 60 },
    ],
  },
  {
    name: "Amsterdam",
    country: "Netherlands",
    region: "Europe",
    costIndex: 75,
    popularityScore: 88,
    activities: [
      { name: "Anne Frank House", category: "sightseeing", estCost: 16, estDurationMinutes: 60 },
      { name: "Canal Cruise", category: "leisure", estCost: 20, estDurationMinutes: 75 },
      { name: "Van Gogh Museum", category: "sightseeing", estCost: 22, estDurationMinutes: 120 },
      { name: "Cycling Tour", category: "adventure", estCost: 30, estDurationMinutes: 180 },
    ],
  },
  {
    name: "Lisbon",
    country: "Portugal",
    region: "Europe",
    costIndex: 55,
    popularityScore: 88,
    activities: [
      { name: "Belem Tower", category: "sightseeing", estCost: 6, estDurationMinutes: 60 },
      { name: "Tram 28 Ride", category: "leisure", estCost: 3, estDurationMinutes: 45 },
      { name: "Fado Night & Dinner", category: "food", estCost: 45, estDurationMinutes: 150 },
      { name: "Sintra Day Trip", category: "adventure", estCost: 40, estDurationMinutes: 480 },
    ],
  },
  {
    name: "Prague",
    country: "Czech Republic",
    region: "Europe",
    costIndex: 55,
    popularityScore: 85,
    activities: [
      { name: "Prague Castle", category: "sightseeing", estCost: 15, estDurationMinutes: 150 },
      { name: "Charles Bridge Walk", category: "leisure", estCost: 0, estDurationMinutes: 45 },
      { name: "Old Town Beer Tasting", category: "food", estCost: 25, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Vienna",
    country: "Austria",
    region: "Europe",
    costIndex: 72,
    popularityScore: 82,
    activities: [
      { name: "Schonbrunn Palace", category: "sightseeing", estCost: 22, estDurationMinutes: 150 },
      { name: "Vienna State Opera Show", category: "leisure", estCost: 60, estDurationMinutes: 180 },
      { name: "Naschmarkt Food Tour", category: "food", estCost: 35, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Berlin",
    country: "Germany",
    region: "Europe",
    costIndex: 65,
    popularityScore: 84,
    activities: [
      { name: "Brandenburg Gate & Reichstag", category: "sightseeing", estCost: 0, estDurationMinutes: 90 },
      { name: "Berlin Wall Memorial", category: "sightseeing", estCost: 0, estDurationMinutes: 90 },
      { name: "East Side Gallery Walk", category: "leisure", estCost: 0, estDurationMinutes: 60 },
    ],
  },
  {
    name: "London",
    country: "United Kingdom",
    region: "Europe",
    costIndex: 88,
    popularityScore: 97,
    activities: [
      { name: "British Museum", category: "sightseeing", estCost: 0, estDurationMinutes: 150 },
      { name: "Tower of London", category: "sightseeing", estCost: 33, estDurationMinutes: 150 },
      { name: "Thames River Cruise", category: "leisure", estCost: 20, estDurationMinutes: 90 },
      { name: "Borough Market Food Tour", category: "food", estCost: 40, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Athens",
    country: "Greece",
    region: "Europe",
    costIndex: 58,
    popularityScore: 80,
    activities: [
      { name: "Acropolis & Parthenon", category: "sightseeing", estCost: 20, estDurationMinutes: 150 },
      { name: "Plaka Old Town Walk", category: "leisure", estCost: 0, estDurationMinutes: 90 },
      { name: "Greek Cooking Class", category: "food", estCost: 50, estDurationMinutes: 180 },
    ],
  },
  {
    name: "Istanbul",
    country: "Turkey",
    region: "Europe",
    costIndex: 45,
    popularityScore: 87,
    activities: [
      { name: "Hagia Sophia", category: "sightseeing", estCost: 0, estDurationMinutes: 90 },
      { name: "Grand Bazaar Shopping", category: "leisure", estCost: 0, estDurationMinutes: 120 },
      { name: "Bosphorus Cruise", category: "leisure", estCost: 25, estDurationMinutes: 90 },
      { name: "Turkish Street Food Tour", category: "food", estCost: 35, estDurationMinutes: 150 },
    ],
  },
  {
    name: "Reykjavik",
    country: "Iceland",
    region: "Europe",
    costIndex: 90,
    popularityScore: 70,
    activities: [
      { name: "Golden Circle Day Tour", category: "adventure", estCost: 90, estDurationMinutes: 480 },
      { name: "Blue Lagoon Spa", category: "leisure", estCost: 70, estDurationMinutes: 180 },
      { name: "Northern Lights Tour", category: "adventure", estCost: 80, estDurationMinutes: 240 },
    ],
  },
  {
    name: "Copenhagen",
    country: "Denmark",
    region: "Europe",
    costIndex: 85,
    popularityScore: 75,
    activities: [
      { name: "Tivoli Gardens", category: "leisure", estCost: 20, estDurationMinutes: 120 },
      { name: "Nyhavn Harbor Walk", category: "sightseeing", estCost: 0, estDurationMinutes: 60 },
      { name: "Christiania Food Market", category: "food", estCost: 30, estDurationMinutes: 90 },
    ],
  },
  {
    name: "Budapest",
    country: "Hungary",
    region: "Europe",
    costIndex: 50,
    popularityScore: 78,
    activities: [
      { name: "Szechenyi Thermal Bath", category: "leisure", estCost: 25, estDurationMinutes: 150 },
      { name: "Buda Castle", category: "sightseeing", estCost: 0, estDurationMinutes: 120 },
      { name: "Danube River Cruise", category: "leisure", estCost: 20, estDurationMinutes: 75 },
    ],
  },

  // --- Asia ---
  {
    name: "Tokyo",
    country: "Japan",
    region: "Asia",
    costIndex: 75,
    popularityScore: 95,
    activities: [
      { name: "Senso-ji Temple", category: "sightseeing", estCost: 0, estDurationMinutes: 90 },
      { name: "Tsukiji Food Tour", category: "food", estCost: 40, estDurationMinutes: 120 },
      { name: "Shibuya Crossing & Shopping", category: "leisure", estCost: 0, estDurationMinutes: 90 },
      { name: "Mt. Fuji Day Trip", category: "adventure", estCost: 90, estDurationMinutes: 600 },
    ],
  },
  {
    name: "Kyoto",
    country: "Japan",
    region: "Asia",
    costIndex: 65,
    popularityScore: 88,
    activities: [
      { name: "Fushimi Inari Shrine", category: "sightseeing", estCost: 0, estDurationMinutes: 90 },
      { name: "Arashiyama Bamboo Grove", category: "sightseeing", estCost: 0, estDurationMinutes: 60 },
      { name: "Gion District Walk", category: "leisure", estCost: 0, estDurationMinutes: 90 },
      { name: "Kaiseki Dinner Experience", category: "food", estCost: 80, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Bangkok",
    country: "Thailand",
    region: "Asia",
    costIndex: 40,
    popularityScore: 90,
    activities: [
      { name: "Grand Palace & Wat Phra Kaew", category: "sightseeing", estCost: 15, estDurationMinutes: 150 },
      { name: "Chao Phraya River Cruise", category: "leisure", estCost: 20, estDurationMinutes: 90 },
      { name: "Street Food Night Tour", category: "food", estCost: 25, estDurationMinutes: 150 },
      { name: "Floating Market Day Trip", category: "adventure", estCost: 35, estDurationMinutes: 300 },
    ],
  },
  {
    name: "Singapore",
    country: "Singapore",
    region: "Asia",
    costIndex: 82,
    popularityScore: 89,
    activities: [
      { name: "Gardens by the Bay", category: "sightseeing", estCost: 20, estDurationMinutes: 120 },
      { name: "Marina Bay Sands SkyPark", category: "leisure", estCost: 23, estDurationMinutes: 60 },
      { name: "Hawker Center Food Crawl", category: "food", estCost: 20, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Seoul",
    country: "South Korea",
    region: "Asia",
    costIndex: 62,
    popularityScore: 85,
    activities: [
      { name: "Gyeongbokgung Palace", category: "sightseeing", estCost: 3, estDurationMinutes: 90 },
      { name: "Bukchon Hanok Village", category: "sightseeing", estCost: 0, estDurationMinutes: 90 },
      { name: "Myeongdong Street Food", category: "food", estCost: 20, estDurationMinutes: 90 },
      { name: "DMZ Day Tour", category: "adventure", estCost: 60, estDurationMinutes: 480 },
    ],
  },
  {
    name: "Denpasar",
    country: "Indonesia",
    region: "Asia",
    costIndex: 35,
    popularityScore: 87,
    activities: [
      { name: "Tanah Lot Temple", category: "sightseeing", estCost: 5, estDurationMinutes: 90 },
      { name: "Ubud Rice Terrace Trek", category: "adventure", estCost: 15, estDurationMinutes: 180 },
      { name: "Balinese Cooking Class", category: "food", estCost: 30, estDurationMinutes: 150 },
    ],
  },
  {
    name: "Hong Kong",
    country: "China",
    region: "Asia",
    costIndex: 85,
    popularityScore: 86,
    activities: [
      { name: "Victoria Peak Tram", category: "sightseeing", estCost: 12, estDurationMinutes: 90 },
      { name: "Star Ferry Harbor Crossing", category: "leisure", estCost: 3, estDurationMinutes: 30 },
      { name: "Dim Sum Food Tour", category: "food", estCost: 35, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Beijing",
    country: "China",
    region: "Asia",
    costIndex: 55,
    popularityScore: 84,
    activities: [
      { name: "Great Wall of China Day Trip", category: "adventure", estCost: 45, estDurationMinutes: 480 },
      { name: "Forbidden City", category: "sightseeing", estCost: 10, estDurationMinutes: 180 },
      { name: "Peking Duck Dinner", category: "food", estCost: 30, estDurationMinutes: 90 },
    ],
  },
  {
    name: "Shanghai",
    country: "China",
    region: "Asia",
    costIndex: 60,
    popularityScore: 80,
    activities: [
      { name: "The Bund Waterfront Walk", category: "sightseeing", estCost: 0, estDurationMinutes: 60 },
      { name: "Yu Garden", category: "sightseeing", estCost: 5, estDurationMinutes: 90 },
      { name: "Xiaolongbao Food Tour", category: "food", estCost: 25, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Mumbai",
    country: "India",
    region: "Asia",
    costIndex: 38,
    popularityScore: 76,
    activities: [
      { name: "Gateway of India", category: "sightseeing", estCost: 0, estDurationMinutes: 45 },
      { name: "Elephanta Caves Boat Trip", category: "adventure", estCost: 15, estDurationMinutes: 240 },
      { name: "Street Food Tour, Mohammed Ali Road", category: "food", estCost: 15, estDurationMinutes: 150 },
    ],
  },
  {
    name: "Delhi",
    country: "India",
    region: "Asia",
    costIndex: 35,
    popularityScore: 78,
    activities: [
      { name: "Red Fort", category: "sightseeing", estCost: 5, estDurationMinutes: 120 },
      { name: "Humayun's Tomb", category: "sightseeing", estCost: 5, estDurationMinutes: 90 },
      { name: "Old Delhi Food Walk", category: "food", estCost: 20, estDurationMinutes: 150 },
    ],
  },
  {
    name: "Hanoi",
    country: "Vietnam",
    region: "Asia",
    costIndex: 30,
    popularityScore: 74,
    activities: [
      { name: "Old Quarter Walking Tour", category: "leisure", estCost: 0, estDurationMinutes: 120 },
      { name: "Ha Long Bay Day Cruise", category: "adventure", estCost: 60, estDurationMinutes: 600 },
      { name: "Vietnamese Street Food Tour", category: "food", estCost: 20, estDurationMinutes: 120 },
    ],
  },

  // --- Middle East ---
  {
    name: "Dubai",
    country: "United Arab Emirates",
    region: "Middle East",
    costIndex: 88,
    popularityScore: 90,
    activities: [
      { name: "Burj Khalifa Observation Deck", category: "sightseeing", estCost: 45, estDurationMinutes: 90 },
      { name: "Desert Safari & BBQ Dinner", category: "adventure", estCost: 70, estDurationMinutes: 300 },
      { name: "Dubai Mall & Fountain Show", category: "leisure", estCost: 0, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Jerusalem",
    country: "Israel",
    region: "Middle East",
    costIndex: 65,
    popularityScore: 80,
    activities: [
      { name: "Old City & Western Wall", category: "sightseeing", estCost: 0, estDurationMinutes: 150 },
      { name: "Church of the Holy Sepulchre", category: "sightseeing", estCost: 0, estDurationMinutes: 60 },
      { name: "Mahane Yehuda Market Food Tour", category: "food", estCost: 30, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Petra",
    country: "Jordan",
    region: "Middle East",
    costIndex: 50,
    popularityScore: 82,
    activities: [
      { name: "Petra Archaeological Park", category: "sightseeing", estCost: 70, estDurationMinutes: 300 },
      { name: "Wadi Rum Desert Camp", category: "adventure", estCost: 90, estDurationMinutes: 600 },
    ],
  },
  {
    name: "Doha",
    country: "Qatar",
    region: "Middle East",
    costIndex: 80,
    popularityScore: 65,
    activities: [
      { name: "Museum of Islamic Art", category: "sightseeing", estCost: 0, estDurationMinutes: 90 },
      { name: "Souq Waqif Evening Walk", category: "leisure", estCost: 0, estDurationMinutes: 90 },
      { name: "Desert Dune Bashing", category: "adventure", estCost: 60, estDurationMinutes: 240 },
    ],
  },

  // --- Africa ---
  {
    name: "Marrakech",
    country: "Morocco",
    region: "Africa",
    costIndex: 40,
    popularityScore: 83,
    activities: [
      { name: "Jardin Majorelle", category: "sightseeing", estCost: 8, estDurationMinutes: 60 },
      { name: "Djemaa el-Fna Night Market", category: "leisure", estCost: 0, estDurationMinutes: 120 },
      { name: "Atlas Mountains Day Trip", category: "adventure", estCost: 45, estDurationMinutes: 480 },
      { name: "Moroccan Cooking Class", category: "food", estCost: 35, estDurationMinutes: 150 },
    ],
  },
  {
    name: "Cairo",
    country: "Egypt",
    region: "Africa",
    costIndex: 35,
    popularityScore: 85,
    activities: [
      { name: "Pyramids of Giza & Sphinx", category: "sightseeing", estCost: 25, estDurationMinutes: 180 },
      { name: "Egyptian Museum", category: "sightseeing", estCost: 15, estDurationMinutes: 120 },
      { name: "Nile River Dinner Cruise", category: "food", estCost: 40, estDurationMinutes: 150 },
    ],
  },
  {
    name: "Cape Town",
    country: "South Africa",
    region: "Africa",
    costIndex: 48,
    popularityScore: 84,
    activities: [
      { name: "Table Mountain Cable Car", category: "sightseeing", estCost: 25, estDurationMinutes: 120 },
      { name: "Robben Island Tour", category: "sightseeing", estCost: 35, estDurationMinutes: 240 },
      { name: "Cape Winelands Tasting Tour", category: "food", estCost: 60, estDurationMinutes: 300 },
      { name: "Shark Cage Diving", category: "adventure", estCost: 150, estDurationMinutes: 300 },
    ],
  },
  {
    name: "Nairobi",
    country: "Kenya",
    region: "Africa",
    costIndex: 42,
    popularityScore: 70,
    activities: [
      { name: "Nairobi National Park Safari", category: "adventure", estCost: 50, estDurationMinutes: 240 },
      { name: "Giraffe Centre Visit", category: "sightseeing", estCost: 15, estDurationMinutes: 90 },
      { name: "David Sheldrick Elephant Orphanage", category: "sightseeing", estCost: 10, estDurationMinutes: 60 },
    ],
  },
  {
    name: "Zanzibar City",
    country: "Tanzania",
    region: "Africa",
    costIndex: 38,
    popularityScore: 72,
    activities: [
      { name: "Stone Town Walking Tour", category: "sightseeing", estCost: 15, estDurationMinutes: 120 },
      { name: "Spice Farm Tour", category: "food", estCost: 20, estDurationMinutes: 150 },
      { name: "Snorkeling at Mnemba Atoll", category: "adventure", estCost: 60, estDurationMinutes: 240 },
    ],
  },

  // --- North America ---
  {
    name: "New York City",
    country: "United States",
    region: "North America",
    costIndex: 92,
    popularityScore: 96,
    activities: [
      { name: "Statue of Liberty & Ellis Island", category: "sightseeing", estCost: 24, estDurationMinutes: 240 },
      { name: "Central Park Bike Tour", category: "leisure", estCost: 30, estDurationMinutes: 120 },
      { name: "Broadway Show", category: "leisure", estCost: 120, estDurationMinutes: 150 },
      { name: "Chelsea Market Food Tour", category: "food", estCost: 45, estDurationMinutes: 120 },
    ],
  },
  {
    name: "San Francisco",
    country: "United States",
    region: "North America",
    costIndex: 88,
    popularityScore: 85,
    activities: [
      { name: "Golden Gate Bridge Walk", category: "sightseeing", estCost: 0, estDurationMinutes: 90 },
      { name: "Alcatraz Island Tour", category: "sightseeing", estCost: 45, estDurationMinutes: 150 },
      { name: "Fisherman's Wharf Food Crawl", category: "food", estCost: 35, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Mexico City",
    country: "Mexico",
    region: "North America",
    costIndex: 42,
    popularityScore: 80,
    activities: [
      { name: "Teotihuacan Pyramids Day Trip", category: "adventure", estCost: 40, estDurationMinutes: 360 },
      { name: "Frida Kahlo Museum", category: "sightseeing", estCost: 15, estDurationMinutes: 90 },
      { name: "Street Taco Food Tour", category: "food", estCost: 20, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Toronto",
    country: "Canada",
    region: "North America",
    costIndex: 70,
    popularityScore: 76,
    activities: [
      { name: "CN Tower EdgeWalk", category: "adventure", estCost: 200, estDurationMinutes: 90 },
      { name: "Royal Ontario Museum", category: "sightseeing", estCost: 20, estDurationMinutes: 120 },
      { name: "Kensington Market Food Tour", category: "food", estCost: 30, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Cancun",
    country: "Mexico",
    region: "North America",
    costIndex: 55,
    popularityScore: 82,
    activities: [
      { name: "Chichen Itza Day Trip", category: "adventure", estCost: 90, estDurationMinutes: 600 },
      { name: "Xcaret Eco Park", category: "leisure", estCost: 100, estDurationMinutes: 300 },
      { name: "Snorkeling at the Reef", category: "adventure", estCost: 60, estDurationMinutes: 180 },
    ],
  },
  {
    name: "Las Vegas",
    country: "United States",
    region: "North America",
    costIndex: 75,
    popularityScore: 88,
    activities: [
      { name: "Bellagio Fountain Show", category: "leisure", estCost: 0, estDurationMinutes: 30 },
      { name: "Grand Canyon Helicopter Tour", category: "adventure", estCost: 250, estDurationMinutes: 240 },
      { name: "The Strip Food Crawl", category: "food", estCost: 60, estDurationMinutes: 150 },
    ],
  },

  // --- South America ---
  {
    name: "Rio de Janeiro",
    country: "Brazil",
    region: "South America",
    costIndex: 45,
    popularityScore: 88,
    activities: [
      { name: "Christ the Redeemer", category: "sightseeing", estCost: 20, estDurationMinutes: 120 },
      { name: "Sugarloaf Mountain Cable Car", category: "sightseeing", estCost: 25, estDurationMinutes: 90 },
      { name: "Copacabana Beach Day", category: "leisure", estCost: 0, estDurationMinutes: 180 },
      { name: "Feijoada & Samba Night", category: "food", estCost: 40, estDurationMinutes: 150 },
    ],
  },
  {
    name: "Buenos Aires",
    country: "Argentina",
    region: "South America",
    costIndex: 42,
    popularityScore: 78,
    activities: [
      { name: "Recoleta Cemetery", category: "sightseeing", estCost: 0, estDurationMinutes: 60 },
      { name: "Tango Show & Dinner", category: "food", estCost: 60, estDurationMinutes: 180 },
      { name: "La Boca Neighborhood Walk", category: "leisure", estCost: 0, estDurationMinutes: 90 },
    ],
  },
  {
    name: "Lima",
    country: "Peru",
    region: "South America",
    costIndex: 40,
    popularityScore: 76,
    activities: [
      { name: "Historic Center Walking Tour", category: "sightseeing", estCost: 0, estDurationMinutes: 120 },
      { name: "Ceviche Cooking Class", category: "food", estCost: 45, estDurationMinutes: 150 },
      { name: "Paragliding over Miraflores", category: "adventure", estCost: 70, estDurationMinutes: 60 },
    ],
  },
  {
    name: "Cusco",
    country: "Peru",
    region: "South America",
    costIndex: 48,
    popularityScore: 85,
    activities: [
      { name: "Machu Picchu Day Trip", category: "adventure", estCost: 120, estDurationMinutes: 600 },
      { name: "Sacred Valley Tour", category: "sightseeing", estCost: 40, estDurationMinutes: 480 },
      { name: "Peruvian Cooking Class", category: "food", estCost: 40, estDurationMinutes: 150 },
    ],
  },
  {
    name: "Cartagena",
    country: "Colombia",
    region: "South America",
    costIndex: 38,
    popularityScore: 74,
    activities: [
      { name: "Walled City Walking Tour", category: "sightseeing", estCost: 0, estDurationMinutes: 120 },
      { name: "Rosario Islands Boat Trip", category: "leisure", estCost: 60, estDurationMinutes: 300 },
      { name: "Colombian Street Food Tour", category: "food", estCost: 20, estDurationMinutes: 120 },
    ],
  },

  // --- Oceania ---
  {
    name: "Sydney",
    country: "Australia",
    region: "Oceania",
    costIndex: 80,
    popularityScore: 90,
    activities: [
      { name: "Sydney Opera House Tour", category: "sightseeing", estCost: 42, estDurationMinutes: 60 },
      { name: "Sydney Harbour Bridge Climb", category: "adventure", estCost: 200, estDurationMinutes: 210 },
      { name: "Bondi to Coogee Coastal Walk", category: "leisure", estCost: 0, estDurationMinutes: 120 },
      { name: "Seafood Market Food Tour", category: "food", estCost: 35, estDurationMinutes: 120 },
    ],
  },
  {
    name: "Auckland",
    country: "New Zealand",
    region: "Oceania",
    costIndex: 68,
    popularityScore: 68,
    activities: [
      { name: "Sky Tower Observation Deck", category: "sightseeing", estCost: 25, estDurationMinutes: 60 },
      { name: "Waiheke Island Wine Tour", category: "food", estCost: 90, estDurationMinutes: 300 },
      { name: "Hobbiton Movie Set Day Trip", category: "adventure", estCost: 100, estDurationMinutes: 480 },
    ],
  },
  {
    name: "Queenstown",
    country: "New Zealand",
    region: "Oceania",
    costIndex: 70,
    popularityScore: 75,
    activities: [
      { name: "Milford Sound Cruise", category: "adventure", estCost: 90, estDurationMinutes: 480 },
      { name: "Bungy Jumping at Kawarau Bridge", category: "adventure", estCost: 150, estDurationMinutes: 60 },
      { name: "Queenstown Gardens Walk", category: "leisure", estCost: 0, estDurationMinutes: 60 },
    ],
  },
  {
    name: "Nadi",
    country: "Fiji",
    region: "Oceania",
    costIndex: 55,
    popularityScore: 65,
    activities: [
      { name: "Sabeto Hot Springs & Mud Pool", category: "leisure", estCost: 30, estDurationMinutes: 120 },
      { name: "Coral Reef Snorkeling Tour", category: "adventure", estCost: 60, estDurationMinutes: 180 },
    ],
  },
];

async function main() {
  for (const cityData of CATALOG) {
    const city = await prisma.city.upsert({
      where: { name_country: { name: cityData.name, country: cityData.country } },
      update: {
        region: cityData.region,
        costIndex: cityData.costIndex,
        popularityScore: cityData.popularityScore,
      },
      create: {
        name: cityData.name,
        country: cityData.country,
        region: cityData.region,
        costIndex: cityData.costIndex,
        popularityScore: cityData.popularityScore,
      },
    });

    for (const activity of cityData.activities) {
      await prisma.activity.upsert({
        where: { cityId_name: { cityId: city.id, name: activity.name } },
        update: {
          category: activity.category,
          estCost: activity.estCost,
          estDurationMinutes: activity.estDurationMinutes,
        },
        create: {
          cityId: city.id,
          name: activity.name,
          category: activity.category,
          estCost: activity.estCost,
          estDurationMinutes: activity.estDurationMinutes,
        },
      });
    }
  }

  const cityCount = await prisma.city.count();
  const activityCount = await prisma.activity.count();
  console.log(`Seeded catalog: ${cityCount} cities, ${activityCount} activities.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
