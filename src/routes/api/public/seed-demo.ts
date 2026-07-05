/**
 * Idempotent demo-account seeder.
 * DISABLED IN PRODUCTION unless `ALLOW_DEMO_SEED=true` is explicitly set.
 * Without the flag, exposing this endpoint would let anyone reset the demo
 * credentials on a live deployment.
 */

import { createFileRoute } from "@tanstack/react-router";

type DemoAccount = {
  email: string;
  password: string;
  role: "admin" | "expert" | "vendeur" | "acheteur";
  nom: string;
  telephone: string;
};

const DEMO: DemoAccount[] = [
  { email: "admin@bidlik.ma", password: "Admin1234!", role: "admin", nom: "Admin Bidlik", telephone: "+212 600 000 001" },
  { email: "expert@bidlik.ma", password: "Expert1234!", role: "expert", nom: "Youssef El Amrani", telephone: "+212 600 000 002" },
  { email: "vendeur@bidlik.ma", password: "Vendeur1234!", role: "vendeur", nom: "Karim Bennani", telephone: "+212 600 000 003" },
  { email: "acheteur@bidlik.ma", password: "Acheteur1234!", role: "acheteur", nom: "Salma Idrissi", telephone: "+212 600 000 004" },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type SupabaseAdmin = typeof import("@/integrations/supabase/client.server")["supabaseAdmin"];

async function findUserByEmail(admin: SupabaseAdmin, email: string) {
  // Paginate — listUsers defaults to page 1, 50 per page.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}


export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async () => {
        // Hard gate: only runs when ALLOW_DEMO_SEED is explicitly set to "true".
        // No NODE_ENV fallback — an unset/missing env var must NOT enable seeding,
        // otherwise anyone could reset the admin password to a public value.
        if (process.env.ALLOW_DEMO_SEED !== "true") {
          return json({ ok: false, error: "Not found" }, 404);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        for (const acc of DEMO) {
          const existing = await findUserByEmail(supabaseAdmin, acc.email);
          let userId = existing?.id;
          if (!userId) {
            const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
              email: acc.email,
              password: acc.password,
              email_confirm: true,
              user_metadata: { nom: acc.nom, telephone: acc.telephone, role: acc.role },
            });
            if (error) {
              return json({ ok: false, error: `create ${acc.email}: ${error.message}` }, 500);
            }
            userId = created.user.id;
          } else {
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              password: acc.password,
              email_confirm: true,
              user_metadata: { nom: acc.nom, telephone: acc.telephone, role: acc.role },
            });
          }

          await supabaseAdmin.from("profiles").upsert(
            {
              user_id: userId,
              nom: acc.nom,
              email: acc.email,
              telephone: acc.telephone,
              actif: true,
              caution_validee: acc.role === "acheteur",
            },
            { onConflict: "user_id" },
          );

          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role: acc.role }, { onConflict: "user_id,role" });
        }

        return json({ ok: true });
      },
    },
  },
});
