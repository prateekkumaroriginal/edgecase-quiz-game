import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const releaseDir = resolve(root, "release");

if (!releaseDir.startsWith(root)) {
  throw new Error(`Refusing to clean outside project: ${releaseDir}`);
}

await rm(releaseDir, { recursive: true, force: true });

console.log(`Cleaned generated release output: ${releaseDir}`);
