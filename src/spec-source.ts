import { existsSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

export const requiredSchemas = ["common.schema.json", "manifest.schema.json", "message.schema.json", "error.schema.json"] as const;
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function resolveSpecDirectory(): Promise<string> {
  const candidates = [process.env.BAP_SPEC_DIR, resolve(projectRoot, "..", "spec"), join(projectRoot, ".bap-spec")].filter(Boolean) as string[];
  for (const candidate of candidates) {
    for (const schemaRoot of [join(candidate, "schemas"), join(candidate, "versions", "0.1.0", "schemas")]) {
      if (existsSync(schemaRoot) && (await Promise.all(requiredSchemas.map((file) => access(join(schemaRoot, file)).then(() => true, () => false)))).every(Boolean)) return schemaRoot;
    }
  }
  throw new Error("BAP spec is not installed. Run npm run spec:install or set BAP_SPEC_DIR to a spec checkout.");
}

export async function readSpecSchema(file: typeof requiredSchemas[number]): Promise<Record<string, unknown>> {
  const directory = await resolveSpecDirectory();
  return JSON.parse(await readFile(join(directory, file), "utf8")) as Record<string, unknown>;
}
