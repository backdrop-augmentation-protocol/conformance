import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { createSpecValidators, validationErrors } from "./schemas.js";

export interface PackageCheck { id: string; status: "passed" | "failed"; details?: string }

export async function checkWeWebPackage(directory: string): Promise<PackageCheck[]> {
  const root = await realpath(resolve(directory));
  const checks: PackageCheck[] = [];
  const check = (id: string, condition: boolean, details?: string) => {
    checks.push({ id, status: condition ? "passed" : "failed", details: condition ? undefined : details });
  };
  const readJson = async (name: string): Promise<unknown> => {
    try { return JSON.parse(await readFile(join(root, name), "utf8")); }
    catch (error) { check(name, false, String(error)); return undefined; }
  };
  const file = async (value: unknown, label: string): Promise<string | undefined> => {
    if (typeof value !== "string" || !value || isAbsolute(value) || value.startsWith("/") || value.includes("\\") || value.split("/").includes("..")) {
      check(label, false, "expected a relative package file path"); return undefined;
    }
    try {
      const target = await realpath(resolve(root, value));
      const offset = relative(root, target);
      if (!offset || offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset) || !(await stat(target)).isFile()) throw new Error("path is not a regular file inside the package");
      check(label, true); return target;
    } catch (error) { check(label, false, String(error)); return undefined; }
  };
  const validators = await createSpecValidators();
  const project = await readJson("project.json");
  if (!project || typeof project !== "object" || Array.isArray(project)) return checks;
  const metadata = project as Record<string, unknown>;
  check("we-project-schema", validators.weProject(project), validationErrors(validators.weProject).join("; "));
  const entry = await file(metadata.file, "we-entrypoint");
  check("we-entrypoint-html", !!entry && extname(entry).toLowerCase() === ".html", "WE Web entrypoint must be HTML");
  const preview = await file(metadata.preview, "we-preview");
  check("we-preview-image", !!preview && [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(extname(preview).toLowerCase()), "preview must be a packaged image");

  if (entry) {
    const html = await readFile(entry, "utf8");
    for (const match of html.matchAll(/<(?:script|link|img|video|audio|source)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const value = match[1].split(/[?#]/)[0];
      if (/^(?:data:|https?:|blob:)/i.test(value) || !value) continue;
      await file(value, `we-html-resource-${checks.length}`);
    }
  }

  let manifest: Record<string, unknown> | undefined;
  try { manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as Record<string, unknown>; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") check("manifest.json", false, String(error)); }
  if (manifest) {
    check("bap-manifest-schema", validators.manifest(manifest), validationErrors(validators.manifest).join("; "));
    const paths = manifest.entrypoints && typeof manifest.entrypoints === "object" ? manifest.entrypoints as Record<string, unknown> : {};
    for (const [name, value] of Object.entries(paths)) await file(value, `bap-entrypoint-${name}`);
    if (manifest.role === "component") {
      const modes = manifest.modes;
      check("bap-dual-mode", Array.isArray(modes) && modes.includes("standalone") && modes.includes("embedded"), "Workshop BAP components need both modes");
      const standalone = typeof paths.standalone === "string" ? resolve(root, paths.standalone) : undefined;
      check("we-standalone-match", !!entry && !!standalone && entry === standalone, "WE file must match manifest standalone entrypoint");
      const embedded = typeof paths.embedded === "string" ? await file(paths.embedded, "bap-embedded-document") : undefined;
      if (embedded) {
        const html = await readFile(embedded, "utf8");
        const externalResource = /<(?:script|link|img|video|audio|source)\b[^>]*?\b(?:src|href)\s*=\s*["'](?!data:|#)[^"']+["']/i.test(html)
          || /url\(\s*["']?(?!data:)[^)]+\)/i.test(html);
        check("bap-embedded-self-contained-static", !externalResource, "embedded HTML references an external or relative resource");
      }
    }
  }
  return checks;
}
