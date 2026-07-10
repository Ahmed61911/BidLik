/**
 * Extracts Supabase password-recovery params from a deep link.
 * Supabase's redirectTo link carries either a PKCE `?code=...` (newer flow)
 * or `#access_token=...&refresh_token=...` (implicit flow) — handle both,
 * since which one arrives depends on the Supabase project's auth flow setting.
 */
export interface RecoveryParams {
  code?: string;
  access_token?: string;
  refresh_token?: string;
}

function parseParamString(raw: string, into: RecoveryParams) {
  for (const pair of raw.split("&")) {
    const [key, value] = pair.split("=");
    if (!key || value === undefined) continue;
    const decoded = decodeURIComponent(value);
    if (key === "code") into.code = decoded;
    if (key === "access_token") into.access_token = decoded;
    if (key === "refresh_token") into.refresh_token = decoded;
  }
}

export function parseRecoveryUrl(url: string): RecoveryParams {
  const params: RecoveryParams = {};
  const hashIndex = url.indexOf("#");
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex + 1);

  const queryIndex = beforeHash.indexOf("?");
  const query = queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1);

  if (query) parseParamString(query, params);
  if (hash) parseParamString(hash, params);
  return params;
}
