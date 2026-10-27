import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sibling = resolve(root, "..", "spec");
const cache = join(root, ".bap-spec");
const required = ["versions/0.1.0/schemas/common.schema.json", "versions/0.1.0/schemas/manifest.schema.json", "versions/0.1.0/schemas/message.schema.json", "versions/0.1.0/schemas/error.schema.json", "profiles/we-web-workshop/project.schema.json"];
const repository = "https://github.com/backdrop-augmentation-protocol/spec.git";
const ref = process.env.BAP_SPEC_REF ?? JSON.parse(await readFile(join(root, "scripts", "spec-ref.json"), "utf8")).commit;
const refMarker = join(cache, ".source-ref");
const execFileAsync = promisify(execFile);

async function hasSchemas(directory: string) {
  return (await Promise.all(required.map(async (file) => {
    try { await readFile(join(directory, file)); return true; } catch { return false; }
  }))).every(Boolean);
}

const cachedRef = await readFile(refMarker, "utf8").then((value) => value.trim(), () => null);
if (await hasSchemas(sibling)) {
  process.stdout.write(`Using sibling spec repository: ${sibling}\n`);
  process.stdout.write(`Spec source ready: ${sibling}\n`);
} else if (cachedRef === ref && await hasSchemas(cache)) {
  process.stdout.write(`Spec source ready: ${cache}\n`);
} else {
  if (existsSync(cache)) await rm(cache, { recursive: true, force: true });
  await mkdir(dirname(cache), { recursive: true });
  const temporary = join(root, `.spec-${process.pid}`);
  await execFileAsync("git", ["clone", "--quiet", repository, temporary]);
  await execFileAsync("git", ["-C", temporary, "checkout", "--quiet", ref]);
  await mkdir(cache, { recursive: true });
  await cp(join(temporary, "versions"), join(cache, "versions"), { recursive: true });
  await cp(join(temporary, "profiles"), join(cache, "profiles"), { recursive: true });
  await writeFile(refMarker, `${ref}\n`);
  await rm(temporary, { recursive: true, force: true });
  if (!(await hasSchemas(cache))) throw new Error(`Installed spec ${ref} is missing required schemas`);
  process.stdout.write(`Installed spec ${ref} into ${cache}\n`);
}
