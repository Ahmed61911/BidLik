import { execSync } from "node:child_process";

/** Runs SQL directly against the local dev Postgres container (test fixtures only). */
export function runSql(sql: string): void {
  execSync(`docker exec -i bidlik-local-db-1 psql -U postgres -d postgres`, {
    input: sql,
    stdio: ["pipe", "ignore", "inherit"],
  });
}
