export function GET(): Response {
  return Response.json({ ok: true, service: 'king-web', status: 'scaffold' });
}
