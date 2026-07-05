// One-off generator for a local-stack JWT secret + signed anon/service_role keys.
// Usage: node docker/gen-keys.js
// Prints values to paste into docker/.env. Never reuse these for a real deployment
// without regenerating — anyone with the JWT_SECRET can mint their own service_role token.
const crypto = require("crypto");

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${headerB64}.${payloadB64}.${signature}`;
}

const jwtSecret = crypto.randomBytes(32).toString("hex"); // 64 hex chars
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 years

const anonKey = sign({ role: "anon", iss: "supabase-demo", iat, exp }, jwtSecret);
const serviceRoleKey = sign({ role: "service_role", iss: "supabase-demo", iat, exp }, jwtSecret);
const realtimeSecretKeyBase = crypto.randomBytes(48).toString("hex"); // 96 hex chars for SECRET_KEY_BASE
const dashboardPassword = crypto.randomBytes(9).toString("base64url");
const storageSigningSecret = crypto.randomBytes(32).toString("hex"); // 64 hex chars — signs local storage download tokens

console.log("JWT_SECRET=" + jwtSecret);
console.log("ANON_KEY=" + anonKey);
console.log("SERVICE_ROLE_KEY=" + serviceRoleKey);
console.log("REALTIME_SECRET_KEY_BASE=" + realtimeSecretKeyBase);
console.log("DASHBOARD_PASSWORD=" + dashboardPassword);
console.log("STORAGE_SIGNING_SECRET=" + storageSigningSecret);
