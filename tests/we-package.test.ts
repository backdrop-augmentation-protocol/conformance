import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkWeWebPackage } from "../src/we-package.js";

async function fixture(override: Record<string, unknown> = {}) {
  const root = await mkdtemp(join(tmpdir(), "bap-we-package-"));
  await mkdir(join(root, "embedded"));
  await writeFile(join(root, "index.html"), "<!doctype html><title>Widget</title>");
  await writeFile(join(root, "embedded", "widget.html"), "<!doctype html><title>Embedded</title>");
  await writeFile(join(root, "preview.jpg"), "image");
  await writeFile(join(root, "project.json"), JSON.stringify({ type: "web", file: "index.html", preview: "preview.jpg", title: "Widget", ...override }));
  await writeFile(join(root, "manifest.json"), JSON.stringify({
    protocol: { name: "bap", version: "0.1.0", profile: "core" }, id: "example.widget", name: "Widget", version: "0.1.0", role: "component", capabilities: [], modes: ["standalone", "embedded"],
    entrypoints: { default: "index.html", standalone: "index.html", embedded: "embedded/widget.html" }
  }));
  return root;
}

describe("WE Web Workshop distribution", () => {
  it("accepts a generated candidate and editor-normalized metadata", async () => {
    for (const metadata of [{}, { tags: ["Nature"], visibility: "private", version: 2, workshopid: "123456", general: { properties: {} } }]) {
      const root = await fixture(metadata);
      try { expect((await checkWeWebPackage(root)).filter((check) => check.status === "failed")).toEqual([]); }
      finally { await rm(root, { recursive: true, force: true }); }
    }
  });

  it("rejects missing preview, wrong type, and entrypoint escape", async () => {
    const root = await fixture({ type: "scene", file: "../outside.html", preview: "missing.png" });
    try {
      const failures = (await checkWeWebPackage(root)).filter((check) => check.status === "failed").map((check) => check.id);
      expect(failures).toContain("we-project-schema");
      expect(failures).toContain("we-entrypoint");
      expect(failures).toContain("we-preview");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects a manifest that does not match the WE standalone entry", async () => {
    const root = await fixture({ file: "embedded/widget.html" });
    try { expect((await checkWeWebPackage(root)).find((check) => check.id === "we-standalone-match")?.status).toBe("failed"); }
    finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects missing HTML resources and non-self-contained embedded HTML", async () => {
    const root = await fixture();
    try {
      await writeFile(join(root, "index.html"), '<script src="./missing.js"></script>');
      await writeFile(join(root, "embedded", "widget.html"), '<script src="https://example.test/widget.js"></script>');
      const failures = (await checkWeWebPackage(root)).filter((check) => check.status === "failed").map((check) => check.id);
      expect(failures.some((id) => id.startsWith("we-html-resource-"))).toBe(true);
      expect(failures).toContain("bap-embedded-self-contained-static");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
