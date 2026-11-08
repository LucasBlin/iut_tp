import { setTimeout as sleep } from 'node:timers/promises';
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';

export interface GeoPoint {
  lat: number;
  lon: number;
  label: string;
}

export interface MapPoint extends GeoPoint {
  order: number;
  name: string;
  day: number | null;
  note: string;
}

export interface TripMap {
  center: GeoPoint | null;
  points: MapPoint[];
  missing: string[];
}

export const tripMapRequestSchema = z.object({
  destination: z.string().trim().min(1).max(100),
  itinerary: z.string().max(20_000).optional(),
});

const MAX_PLACES = 10;
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
// Politique d'usage Nominatim : au plus 1 requête par seconde et un User-Agent identifiant l'application.
const NOMINATIM_MIN_INTERVAL_MS = 1100;
const USER_AGENT = 'tp-voyage-mastra/1.0 (outil pedagogique, usage ponctuel)';

const placesSchema = z.object({
  places: z.array(
    z.object({
      name: z.string(),
      day: z.number().int().nullable(),
      note: z.string(),
    }),
  ),
});

const geocodeCache = new Map<string, GeoPoint | null>();
let nominatimQueue: Promise<unknown> = Promise.resolve();

function withNominatimSlot<T>(task: () => Promise<T>): Promise<T> {
  const run = nominatimQueue.then(task);
  const pause = () => sleep(NOMINATIM_MIN_INTERVAL_MS);
  nominatimQueue = run.then(pause, pause);
  return run;
}

async function geocode(query: string): Promise<GeoPoint | null> {
  const key = query.toLocaleLowerCase('fr');
  const cached = geocodeCache.get(key);
  if (cached !== undefined) return cached;

  const found = await withNominatimSlot(async () => {
    const url = `${NOMINATIM_URL}?${new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', 'accept-language': 'fr' })}`;
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) throw new Error(`Géocodage Nominatim indisponible (HTTP ${response.status}).`);
    const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const [first] = results;
    return first ? { lat: Number(first.lat), lon: Number(first.lon), label: first.display_name } : null;
  });
  geocodeCache.set(key, found);
  return found;
}

function createPlaceExtractor() {
  if (!process.env.OPENAI_API_KEY) throw new Error('Ajoutez OPENAI_API_KEY dans .env pour extraire les lieux.');
  return new Agent({
    id: 'extracteur-lieux',
    name: 'Extracteur de lieux',
    model: process.env.MASTRA_MODEL?.trim() || 'openai/gpt-4o-mini',
    instructions:
      'Tu extrais les lieux d’un itinéraire de voyage pour les placer sur une carte. Ne garde que des lieux précis et localisables (monument, musée, quartier, parc, gare, restaurant nommé…), dans l’ordre de visite. N’invente aucun lieu absent du texte.',
  });
}

async function extractPlaces(destination: string, itinerary: string) {
  const response = await createPlaceExtractor().generate(
    `Destination : ${destination}\nListe au plus ${MAX_PLACES} lieux, avec le jour de visite s'il est indiqué (sinon null) et une note de quelques mots.\n\nItinéraire :\n${itinerary}`,
    { structuredOutput: { schema: placesSchema } },
  );
  return response.object.places.slice(0, MAX_PLACES);
}

export async function buildTripMap({ destination, itinerary }: z.infer<typeof tripMapRequestSchema>): Promise<TripMap> {
  const center = await geocode(destination);
  if (!itinerary) return { center, points: [], missing: [] };

  const places = await extractPlaces(destination, itinerary);
  const points: MapPoint[] = [];
  const missing: string[] = [];
  for (const place of places) {
    const found = await geocode(`${place.name}, ${destination}`);
    if (found) points.push({ ...found, order: points.length + 1, name: place.name, day: place.day, note: place.note });
    else missing.push(place.name);
  }
  return { center, points, missing };
}
