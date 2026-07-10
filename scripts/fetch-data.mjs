// Fetches the stats datasets from the private EF08/circuitstats-data repo into
// src/data/ before build. Local dev: if JSONs are already on disk, this is a no-op.
// CI/Vercel: set DATA_REPO_TOKEN to a fine-grained PAT with read access to that repo.
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = "src/data";
const REPO = "EF08/circuitstats-data";

const existing = fs.existsSync(DATA_DIR)
  ? fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"))
  : [];
if (existing.length > 0) {
  console.log(`[fetch-data] ${existing.length} data files already present — skipping fetch`);
  process.exit(0);
}

const token = process.env.DATA_REPO_TOKEN;
if (!token) {
  console.error(
    `[fetch-data] src/data/ is empty and DATA_REPO_TOKEN is not set.\n` +
      `The stats datasets live in a private repo (${REPO}); a read token is required to build.`,
  );
  process.exit(1);
}

const headers = { authorization: `Bearer ${token}`, "user-agent": "circuitstats-build" };
const listRes = await fetch(`https://api.github.com/repos/${REPO}/contents/?ref=main`, { headers });
if (!listRes.ok) {
  console.error(`[fetch-data] listing ${REPO} failed: HTTP ${listRes.status}`);
  process.exit(1);
}
const files = (await listRes.json()).filter((f) => f.type === "file" && f.name.endsWith(".json"));

fs.mkdirSync(DATA_DIR, { recursive: true });
for (const f of files) {
  const res = await fetch(f.url, { headers: { ...headers, accept: "application/vnd.github.raw+json" } });
  if (!res.ok) {
    console.error(`[fetch-data] ${f.name}: HTTP ${res.status}`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(DATA_DIR, f.name), Buffer.from(await res.arrayBuffer()));
  console.log(`[fetch-data] fetched ${f.name}`);
}
console.log(`[fetch-data] done — ${files.length} files`);
