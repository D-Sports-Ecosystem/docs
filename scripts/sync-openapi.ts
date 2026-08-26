/**
 * Copies the OpenAPI spec from d-sports-api (source of truth) into docs for Mintlify.
 * Do not invent paths or rewrite operations here.
 *
 * Run from docs repo root: bun run sync-openapi
 *
 * Source resolution:
 *   1. `--api <dir>`
 *   2. `D_SPORTS_API`
 *   3. sibling `../d-sports-api`
 *
 * If the source is missing, keep the committed spec and exit 0 so `bun run dev`
 * still works without a sibling checkout (cloud VMs, throwaway clones).
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OPTIONAL_BEARER = [{ bearerAuth: [] }, {}] as const;

/** Marketplace GETs that personalize when a session is present. */
const OPTIONAL_AUTH_MARKETPLACE_GETS = [
  "/api/v1/marketplace",
  "/api/v1/marketplace/listings",
  "/api/v1/marketplace/collectibles/{id}/listings",
  "/api/v1/marketplace/listings/{id}",
  "/api/v1/marketplace/listings/{id}/bids",
  "/api/v1/marketplace/top-bids",
] as const;

type OpenApiSpec = {
  paths?: Record<string, Record<string, { security?: unknown }>>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(__dirname, "..");
const dest = join(docsRoot, "api-reference", "openapi.json");

function parseApiFlag(argv: string[]): string | undefined {
  const idx = argv.indexOf("--api");
  if (idx === -1) return undefined;
  const value = argv[idx + 1];
  if (!value || value.startsWith("-")) {
    throw new Error("`--api` requires a directory path");
  }
  return value;
}

function resolveApiRepoRoot(): string | undefined {
  const fromFlag = parseApiFlag(process.argv.slice(2));
  const fromEnv = process.env.D_SPORTS_API;
  const sibling = join(docsRoot, "..", "d-sports-api");
  const candidate = fromFlag ?? fromEnv ?? sibling;
  return candidate ? resolve(candidate) : undefined;
}

function isOptionalBearer(security: unknown): boolean {
  if (!Array.isArray(security) || security.length !== 2) return false;
  const [withAuth, anonymous] = security;
  const hasBearer =
    Boolean(withAuth) &&
    typeof withAuth === "object" &&
    !Array.isArray(withAuth) &&
    Object.keys(withAuth as object).length === 1 &&
    Array.isArray((withAuth as { bearerAuth?: unknown }).bearerAuth);
  const isAnonymous =
    Boolean(anonymous) &&
    typeof anonymous === "object" &&
    !Array.isArray(anonymous) &&
    Object.keys(anonymous as object).length === 0;
  return hasBearer && isAnonymous;
}

function reportOptionalAuthGaps(spec: OpenApiSpec): string[] {
  const gaps: string[] = [];
  for (const path of OPTIONAL_AUTH_MARKETPLACE_GETS) {
    const security = spec.paths?.[path]?.get?.security;
    if (!isOptionalBearer(security)) {
      gaps.push(path);
    }
  }
  return gaps;
}

async function main() {
  const apiRepoRoot = resolveApiRepoRoot();
  const src = apiRepoRoot ? join(apiRepoRoot, "openapi.json") : undefined;

  try {
    if (!src) {
      throw new Error("No API repo path resolved");
    }
    await access(src);
  } catch {
    console.warn(
      `No d-sports-api OpenAPI at ${src ?? "(unset)"}. Keeping committed api-reference/openapi.json.`,
    );
    console.warn("Pass --api <dir> or set D_SPORTS_API to sync from a checkout.");
    return;
  }

  const raw = await readFile(src, "utf8");
  let spec: OpenApiSpec;
  try {
    spec = JSON.parse(raw) as OpenApiSpec;
  } catch (err) {
    console.error(`Source OpenAPI is not valid JSON: ${src}`);
    console.error(err);
    process.exit(1);
  }

  if (
    !spec.paths ||
    typeof spec.paths !== "object" ||
    Array.isArray(spec.paths)
  ) {
    console.error(`Source OpenAPI has no paths object: ${src}`);
    process.exit(1);
  }

  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, raw.endsWith("\n") ? raw : `${raw}\n`);

  const pathCount = Object.keys(spec.paths).length;
  console.log(`Synced openapi.json from ${src}`);
  console.log(`Wrote ${dest} (${pathCount} paths)`);

  const gaps = reportOptionalAuthGaps(spec);
  if (gaps.length > 0) {
    console.warn(
      "Marketplace GET operations still clear security instead of optional bearer " +
        `${JSON.stringify(OPTIONAL_BEARER)}:`,
    );
    for (const path of gaps) {
      console.warn(`  GET ${path}`);
    }
    console.warn("Fix these in d-sports-api/openapi.json, then re-run this script.");
  }
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
