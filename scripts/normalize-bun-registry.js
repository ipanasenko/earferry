import { readFile, writeFile } from "node:fs/promises";

const LOCKFILE_PATH = "bun.lock";
const PRIVATE_REGISTRY = /https:\/\/npm\.dev\.wixpress\.com(?:\/api\/npm\/npm-repos)?\//g;
const PUBLIC_REGISTRY = "https://registry.npmjs.org/";

export function normalizeBunRegistry(lockfile) {
  return lockfile.replace(PRIVATE_REGISTRY, PUBLIC_REGISTRY);
}

if (import.meta.main) {
  const lockfile = await readFile(LOCKFILE_PATH, "utf8");
  const normalizedLockfile = normalizeBunRegistry(lockfile);

  if (normalizedLockfile !== lockfile) {
    await writeFile(LOCKFILE_PATH, normalizedLockfile);
    console.log(`Replaced private registry URLs in ${LOCKFILE_PATH}.`);
  }
}
