// Fetches the stats datasets from the private EF08/circuitstats-data repo into
// src/data/ before build. Local dev: if JSONs are already on disk, this is a no-op.
// CI/Vercel auth, either works:
//   DATA_REPO_DEPLOY_KEY_B64 — base64 ed25519 private key of a read-only deploy key
//                              on the data repo (clones over SSH)
//   DATA_REPO_TOKEN          — fine-grained PAT with read Contents on the data repo
//                              (downloads via the GitHub API)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DATA_DIR = "src/data";
const REPO = "EF08/circuitstats-data";

const existing = fs.existsSync(DATA_DIR)
  ? fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"))
  : [];
if (existing.length > 0) {
  console.log(`[fetch-data] ${existing.length} data files already present — skipping fetch`);
  process.exit(0);
}
fs.mkdirSync(DATA_DIR, { recursive: true });

const keyB64 = process.env.DATA_REPO_DEPLOY_KEY_B64;
const token = process.env.DATA_REPO_TOKEN;

if (keyB64) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "csdata-"));
  const keyPath = path.join(workDir, "deploy_key");
  fs.writeFileSync(keyPath, Buffer.from(keyB64, "base64"));
  fs.chmodSync(keyPath, 0o600);
  const cloneDir = path.join(workDir, "repo");
  execFileSync("git", ["clone", "--depth", "1", `git@github.com:${REPO}.git`, cloneDir], {
    env: {
      ...process.env,
      GIT_SSH_COMMAND: `ssh -i ${keyPath} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`,
    },
    stdio: "inherit",
  });
  const files = fs.readdirSync(cloneDir).filter((f) => f.endsWith(".json"));
  for (const f of files) fs.copyFileSync(path.join(cloneDir, f), path.join(DATA_DIR, f));
  fs.rmSync(workDir, { recursive: true, force: true });
  console.log(`[fetch-data] done — ${files.length} files (deploy key)`);
} else if (token) {
  const headers = { authorization: `Bearer ${token}`, "user-agent": "circuitstats-build" };
  const listRes = await fetch(`https://api.github.com/repos/${REPO}/contents/?ref=main`, { headers });
  if (!listRes.ok) {
    console.error(`[fetch-data] listing ${REPO} failed: HTTP ${listRes.status}`);
    process.exit(1);
  }
  const files = (await listRes.json()).filter((f) => f.type === "file" && f.name.endsWith(".json"));
  for (const f of files) {
    const res = await fetch(f.url, { headers: { ...headers, accept: "application/vnd.github.raw+json" } });
    if (!res.ok) {
      console.error(`[fetch-data] ${f.name}: HTTP ${res.status}`);
      process.exit(1);
    }
    fs.writeFileSync(path.join(DATA_DIR, f.name), Buffer.from(await res.arrayBuffer()));
  }
  console.log(`[fetch-data] done — ${files.length} files (token)`);
} else {
  console.error(
    `[fetch-data] src/data/ is empty and neither DATA_REPO_DEPLOY_KEY_B64 nor DATA_REPO_TOKEN is set.\n` +
      `The stats datasets live in a private repo (${REPO}); one of the two is required to build.`,
  );
  process.exit(1);
}
