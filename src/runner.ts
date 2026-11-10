#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { compareSnapshotRevision, effectiveVisibility, negotiateExtensions, validatePresetSnapshot, type ExtensionOffer, type PresetSnapshot } from "./desktop-composition.js";
import { createCompositionValidators, createSpecValidators, validationErrors } from "./schemas.js";
import { resolveCompositionDirectory, resolveSpecDirectory } from "./spec-source.js";
import type { ConformanceReport } from "./types.js";

export async function checkFixtures(fixtures: { manifests: unknown[]; messages: unknown[] }) {
  const validators = await createSpecValidators();
  const checks: ConformanceReport["checks"] = [];
  for (const [index, value] of fixtures.manifests.entries()) {
    const ok = validators.manifest(value);
    checks.push({ id: `manifest-${index + 1}`, status: ok ? "passed" : "failed", details: ok ? undefined : validationErrors(validators.manifest).join("; ") });
  }
  for (const [index, value] of fixtures.messages.entries()) {
    const ok = validators.message(value);
    checks.push({ id: `message-${index + 1}`, status: ok ? "passed" : "failed", details: ok ? undefined : validationErrors(validators.message).join("; ") });
  }
  return checks;
}
async function readCompositionFixture(name: string): Promise<any> {
  const release = await resolveCompositionDirectory();
  return JSON.parse(await readFile(join(release, "fixtures", name), "utf8"));
}

export async function checkDesktopComposition() {
  const validators = await createCompositionValidators();
  const checks: ConformanceReport["checks"] = [];
  const check = (id: string, passed: boolean, details?: string) => checks.push({ id, status: passed ? "passed" : "failed", details: passed ? undefined : details ?? "specification contract check failed" });

  const offer = await readCompositionFixture("host-extension-offer.json") as ExtensionOffer[];
  const selection = await readCompositionFixture("extension-selection.json");
  const manual = await readCompositionFixture("preset-multiple-instances.json") as PresetSnapshot;
  const grid = await readCompositionFixture("preset-snapshot.json") as PresetSnapshot;
  const singleInstanceMetadata = await readCompositionFixture("component-metadata-single-instance.json");
  check("extension-offer", validators["extension-offer.schema.json"](offer), validationErrors(validators["extension-offer.schema.json"]).join("; "));
  check("extension-selection", validators["extension-selection.schema.json"](selection), validationErrors(validators["extension-selection.schema.json"]).join("; "));
  check("manual-preset", validatePresetSnapshot(manual, validators["preset-snapshot.schema.json"]));
  check("grid-preset", validatePresetSnapshot(grid, validators["preset-snapshot.schema.json"]));
  check("single-instance-component-metadata", validators["component-metadata.schema.json"](singleInstanceMetadata), validationErrors(validators["component-metadata.schema.json"]).join("; "));
  check("unlimited-component-metadata", validators["component-metadata.schema.json"]({ schemaVersion: "0.1.0" }));
  check("invalid-component-instance-limit-rejected", !validators["component-metadata.schema.json"]({ schemaVersion: "0.1.0", maxInstances: 0 }));

  const common = negotiateExtensions(offer, [{ id: "org.bap.composition", versions: ["0.1.0"] }]);
  check("exact-extension-intersection", common.length === 1 && common[0].id === "org.bap.composition" && common[0].version === "0.1.0");
  const duplicate = structuredClone(manual);
  duplicate.instances[1].instanceId = duplicate.instances[0].instanceId;
  check("duplicate-instance-rejected", !validatePresetSnapshot(duplicate, validators["preset-snapshot.schema.json"]));
  const mismatch = structuredClone(manual);
  mismatch.instances[1].layout.mode = "automatic";
  check("layout-mode-mismatch-rejected", !validatePresetSnapshot(mismatch, validators["preset-snapshot.schema.json"]));
  check("snapshot-revision-idempotency", compareSnapshotRevision(manual, structuredClone(manual)) === "idempotent");
  check("stale-snapshot-rejected", compareSnapshotRevision(manual, { ...structuredClone(manual), revision: manual.revision - 1 }) === "stale");
  check("effective-visibility", effectiveVisibility({ enabled: true, userVisible: true, runtimeReady: true }));
  check("visibility-disabled", !effectiveVisibility({ enabled: false, userVisible: true, runtimeReady: true }));
  check("visibility-user-hidden", !effectiveVisibility({ enabled: true, userVisible: false, runtimeReady: true }));
  check("visibility-not-ready", !effectiveVisibility({ enabled: true, userVisible: true, runtimeReady: false }));
  return checks;
}

export async function writeReport(report: ConformanceReport, path: string) {
  const target = resolve(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(report, null, 2) + "\n", "utf8");
}

if (["runner.ts", "runner.js"].includes(basename(process.argv[1] ?? ""))) {
  const reportIndex = process.argv.indexOf("--report");
  const reportPath = reportIndex >= 0 ? process.argv[reportIndex + 1] : "reports/conformance.json";
  const startedAt = new Date().toISOString();
  const coreChecks = await checkFixtures({
    manifests: [
      { protocol: { name: "bap", version: "0.1.0", profile: "core" }, id: "example.clock", name: "Clock", version: "0.1.0", role: "component", capabilities: [], modes: ["standalone", "embedded"], entrypoints: { default: "index.html", standalone: "index.html", embedded: "index.html" } },
      { protocol: { name: "bap", version: "0.1.0", profile: "core" }, id: "example.host", name: "Host", version: "0.1.0", role: "host", capabilities: [], entrypoints: { default: "index.html" } },
      { protocol: { name: "bap", version: "0.1.0", profile: "core" }, id: "example.companion", name: "Companion", version: "0.1.0", role: "companion", capabilities: [], entrypoints: { default: "service" } },
    ],
    messages: [
      { protocol: { name: "bap", version: "0.1.0", profile: "core" }, kind: "event", id: "event-1", timestamp: new Date().toISOString(), event: "state.changed", payload: {} },
      { protocol: { name: "bap", version: "0.1.0", profile: "core" }, kind: "request", id: "request-1", timestamp: new Date().toISOString(), method: "start", payload: {} },
      { protocol: { name: "bap", version: "0.1.0", profile: "core" }, kind: "response", id: "response-1", correlationId: "request-1", timestamp: new Date().toISOString(), ok: false, error: { code: "INVALID_STATE", message: "The component is not ready" } },
    ],
  });
  const checks = [...coreChecks, ...await checkDesktopComposition()];
  const coreSource = await resolveSpecDirectory();
  const compositionSource = await resolveCompositionDirectory();
  const report: ConformanceReport = {
    protocol: "bap",
    version: "0.1.0",
    suite: "core-plus-desktop-composition",
    specSource: `${coreSource}; bundle ${compositionSource}`,
    startedAt,
    finishedAt: new Date().toISOString(),
    passed: checks.filter((entry) => entry.status === "passed").length,
    failed: checks.filter((entry) => entry.status === "failed").length,
    checks,
  };
  await writeReport(report, reportPath);
  console.log(JSON.stringify(report, null, 2));
  if (report.failed) process.exitCode = 1;
}
