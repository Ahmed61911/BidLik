// Placeholder Edge Function — unused by the application, kept only so the
// edge-runtime container always has at least one function to serve. Exports
// a handler (rather than calling Deno.serve itself) so it can be mounted by
// supabase/functions/main/index.ts alongside real functions like send-push.
export async function handleHello(_req: Request): Promise<Response> {
  return new Response(
    JSON.stringify({ ok: true, message: "Bidlik edge runtime is up (unused placeholder)" }),
    { headers: { "Content-Type": "application/json" } },
  );
}
