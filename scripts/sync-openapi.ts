/**
 * Copies the OpenAPI spec from d-sports-api (source of truth) into docs for Mintlify.
 * Run from docs repo root: bun run sync-openapi
 */
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(__dirname, "..");
const apiRepoRoot = join(docsRoot, "..", "d-sports-api");
const src = join(apiRepoRoot, "openapi.json");
const dest = join(docsRoot, "api-reference", "openapi.json");

async function main() {
  try {
    await mkdir(dirname(dest), { recursive: true });
    await cp(src, dest, { force: true });
    console.log("Synced openapi.json from d-sports-api to docs/api-reference/openapi.json");
  } catch (err) {
    console.error("Sync failed:", err);
    process.exit(1);
  }
}

main();
