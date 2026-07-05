#!/usr/bin/env node
/**
 * One-time migration: copies every object out of the OLD Supabase Storage
 * buckets (car-images, payment-proofs) onto the new local filesystem
 * storage volume, preserving each object's exact relative path — so
 * whatever is already stored in cars.images / payments.proof_url /
 * expert_assignments.rapport_url keeps working unchanged, no DB rewrite
 * needed.
 *
 * Run this BEFORE removing/stopping the old `storage` container, against a
 * stack that still has both the Storage API and STORAGE_ROOT available.
 *
 * Usage (from docker/):
 *   SUPABASE_URL=http://localhost:8000 \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   STORAGE_ROOT=./local-storage \
 *   node migrate/migrate-storage-to-local.cjs
 *
 * Caveat: old-style payment-proofs paths (e.g. "cars/{carId}/payments/…" or
 * "users/{userId}/caution/…") don't match the new flat "{userId}/{uuid}.ext"
 * shape that src/lib/storage/server/authorize.server.ts parses a userId out
 * of for WRITE authorization. Migrated files remain fully readable (reads go
 * through the storage_files metadata row, not path-shape parsing) but if you
 * need to re-upload/overwrite one of these old paths, upload it as a new
 * file (fresh UUID path) rather than expecting an old-style path to still
 * pass the write-authorization check.
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("node:fs/promises");
const path = require("node:path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_ROOT = process.env.STORAGE_ROOT || "./local-storage";
const BUCKETS = ["car-images", "payment-proofs"];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Best-effort category guess from the old path shape, for the storage_files
// metadata row. Doesn't need to be perfect — it's only used for admin
// filtering/display, never for authorization.
function guessCategory(bucket, objectPath) {
  if (bucket === "car-images") {
    if (objectPath.includes("/commercial/")) return "commercial";
    if (objectPath.includes("/report")) return "report";
    return "expertise";
  }
  if (objectPath.includes("/caution/")) return "caution";
  if (objectPath.includes("/payments/")) return "car-payment";
  if (objectPath.startsWith("admin/refunds/")) return "admin-refund";
  return "admin-generic";
}

function guessCarId(bucket, objectPath) {
  if (bucket !== "car-images") {
    const m = /^cars\/([^/]+)\//.exec(objectPath);
    return m ? m[1] : null;
  }
  const m = /^cars\/([^/]+)\//.exec(objectPath);
  return m ? m[1] : null;
}

async function listAllObjects(bucket, prefix = "") {
  const out = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  for (const entry of data ?? []) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      // Folder placeholder — recurse.
      out.push(...(await listAllObjects(bucket, fullPath)));
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

async function migrateBucket(bucket) {
  console.log(`\n[${bucket}] listing objects…`);
  const objects = await listAllObjects(bucket);
  console.log(`[${bucket}] found ${objects.length} object(s)`);

  let ok = 0;
  let failed = 0;
  for (const objectPath of objects) {
    try {
      const { data, error } = await supabase.storage.from(bucket).download(objectPath);
      if (error) throw error;
      const bytes = Buffer.from(await data.arrayBuffer());

      const destPath = path.join(STORAGE_ROOT, bucket, objectPath);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.writeFile(destPath, bytes);

      const { error: metaErr } = await supabase.from("storage_files").upsert(
        {
          owner: null,
          car_id: guessCarId(bucket, objectPath),
          bucket,
          file_category: guessCategory(bucket, objectPath),
          original_filename: path.basename(objectPath),
          stored_filename: path.basename(objectPath),
          relative_path: objectPath,
          mime_type: data.type || "application/octet-stream",
          file_size: bytes.length,
        },
        { onConflict: "relative_path" },
      );
      if (metaErr) throw metaErr;

      ok++;
      console.log(`  ✓ ${objectPath}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${objectPath}: ${err.message}`);
    }
  }
  console.log(`[${bucket}] done — ${ok} migrated, ${failed} failed`);
}

(async () => {
  for (const bucket of BUCKETS) {
    await migrateBucket(bucket);
  }
})();
