// CMI (Centre Monétique Interbancaire) helpers — hash v3 (SHA512)
// https://www.cmi.co.ma/ — NestPay / EST gateway

import { createHash } from "crypto";

const EXCLUDED = new Set(["hash", "encoding"]);

function escapeVal(v: string): string {
  return String(v ?? "").replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

/** Build the SHA512/base64 hash CMI expects when posting the form. */
export function computeCmiHash(fields: Record<string, string>, storeKey: string): string {
  const keys = Object.keys(fields)
    .filter((k) => !EXCLUDED.has(k.toLowerCase()))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const plain =
    keys.map((k) => escapeVal(fields[k])).join("|") + "|" + escapeVal(storeKey);

  return createHash("sha512").update(plain, "utf8").digest("base64");
}

/** Verify the hash CMI sends back on the callback/return. */
export function verifyCmiCallback(
  body: Record<string, string>,
  storeKey: string,
): boolean {
  const hash = body.HASH || body.hash;
  const hashParams = body.HASHPARAMS || body.hashParams;
  if (!hash || !hashParams) return false;

  const keys = hashParams.split("|").filter(Boolean);
  const plain =
    keys.map((k) => escapeVal(body[k] ?? "")).join("|") + "|" + escapeVal(storeKey);
  const computed = createHash("sha512").update(plain, "utf8").digest("base64");
  return computed === hash;
}
