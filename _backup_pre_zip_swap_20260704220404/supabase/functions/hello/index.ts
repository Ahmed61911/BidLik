// Placeholder Edge Function.
//
// Bidlik does not currently use Supabase Edge Functions anywhere in the
// application (confirmed: no supabase/functions/ directory existed before
// this local self-hosting migration). This file exists only so the
// edge-runtime container in docker/docker-compose.yml has at least one
// function to serve — the official Supabase Edge Runtime image expects a
// non-empty functions volume to boot cleanly. Deploy real functions here
// the same way you would against a hosted project (supabase functions new
// <name>); nothing in the frontend calls this endpoint.
Deno.serve(() => new Response(JSON.stringify({ ok: true, message: "Bidlik edge runtime is up (unused placeholder)" }), {
  headers: { "Content-Type": "application/json" },
}));
