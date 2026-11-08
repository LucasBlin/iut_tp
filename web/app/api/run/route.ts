import { runWorkflow } from '@/lib/run-workflow';
import type { RunEvent } from '@/lib/pipeline';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: RunEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await runWorkflow(input, emit);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emit({ type: 'done', outcome: { status: 'failed', error: message, steps: {}, durationMs: 0 } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}
