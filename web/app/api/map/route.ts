import { buildTripMap, tripMapRequestSchema } from '@/lib/trip-map';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  const parsed = tripMapRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Destination ou itinéraire invalide.' }, { status: 400 });

  try {
    return Response.json(await buildTripMap(parsed.data));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
