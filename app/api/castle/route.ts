import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function serve(request: Request, head = false) {
  const gzip = /(?:^|,)\s*gzip\s*(?:;\s*q=(?!0(?:\.0*)?(?:\s|,|$))[\d.]+)?\s*(?:,|$)/i.test(request.headers.get('accept-encoding') || '');
  if (gzip) {
    // Next 16.4 strips Content-Encoding from route-handler Responses. Its static
    // server preserves configured headers, so redirect to that representation.
    const representation = new URL('/assets/models/castle.glb.gz', request.url);
    representation.search = new URL(request.url).search;
    return new Response(null, { status: 307, headers: { Location: representation.pathname + representation.search, Vary: 'Accept-Encoding' } });
  }
  const filename = 'castle.glb';
  try {
    const bytes = await readFile(join(process.cwd(), 'public', 'assets', 'models', filename));
    return new Response(head ? null : new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Length': String(bytes.length),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        Vary: 'Accept-Encoding',
      },
    });
  } catch {
    return Response.json({ error: 'The world is temporarily unavailable. Please use Lite view.' }, { status: 503 });
  }
}

export async function GET(request: Request) { return serve(request); }
export async function HEAD(request: Request) { return serve(request, true); }
