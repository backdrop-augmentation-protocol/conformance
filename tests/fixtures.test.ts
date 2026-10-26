import { describe, expect, it } from "vitest";
import { checkFixtures } from "../src/runner.js";
import { createSpecValidators, validationErrors } from "../src/schemas.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveSpecDirectory } from "../src/spec-source.js";
import validManifest from "../fixtures/manifest.component.valid.json" with { type: "json" };
import invalidManifest from "../fixtures/manifest.invalid-role.json" with { type: "json" };
import validEvent from "../fixtures/message.event.valid.json" with { type: "json" };
describe("official spec contract", () => { it("validates all three roles and real message variants", async () => { const { manifest, message } = await createSpecValidators(); for (const role of ["host", "component", "companion"]) expect(manifest({ protocol: { name: "bap", version: "0.1.0", profile: "core" }, id: `example.${role}`, name: role, version: "0.1.0", role, capabilities: [], modes: role === "component" ? ["standalone", "embedded"] : undefined, entrypoints: { default: "index.html", standalone: role === "component" ? "index.html" : undefined, embedded: role === "component" ? "index.html" : undefined } })).toBe(true); expect(message({ protocol: { name: "bap", version: "0.1.0", profile: "core" }, kind: "event", id: "e1", timestamp: "2026-01-01T00:00:00Z", event: "lifecycle.ready", payload: {} })).toBe(true); expect(message({ protocol: { name: "bap", version: "0.1.0", profile: "core" }, kind: "request", id: "q1", timestamp: "2026-01-01T00:00:00Z", method: "component.get-state", payload: {} })).toBe(true); }); it("rejects an invalid role through the official manifest schema", async () => { const { manifest } = await createSpecValidators(); expect(manifest({ protocol: { name: "bap", version: "0.1.0", profile: "core" }, id: "bad.role", name: "Bad", version: "0.1.0", role: "plugin", capabilities: [], entrypoints: { default: "index.html" } })).toBe(false); expect(validationErrors(manifest).length).toBeGreaterThan(0); }); it("validates the official error schema through a failed response", async () => { const { message } = await createSpecValidators(); expect(message({ protocol: { name: "bap", version: "0.1.0", profile: "core" }, kind: "response", id: "r1", correlationId: "q1", timestamp: "2026-01-01T00:00:00Z", ok: false, error: { code: "INVALID_STATE", message: "not ready" } })).toBe(true); }); it("reports fixture results", async () => { const checks = await checkFixtures({ manifests: [{ protocol: { name: "bap", version: "0.1.0", profile: "core" }, id: "ok.host", name: "OK", version: "0.1.0", role: "host", capabilities: [], entrypoints: { default: "service" } }], messages: [{ protocol: { name: "bap", version: "0.1.0", profile: "core" }, kind: "event", id: "m1", timestamp: "2026-01-01T00:00:00Z", event: "host.paused", payload: {} }] }); expect(checks.every((check) => check.status === "passed")).toBe(true); }); });
describe("fixture files", () => { it("accepts the valid manifest and event fixtures", async () => { const { manifest, message } = await createSpecValidators(); expect(manifest(validManifest)).toBe(true); expect(message(validEvent)).toBe(true); }); it("rejects the invalid manifest fixture", async () => { const { manifest } = await createSpecValidators(); expect(manifest(invalidManifest)).toBe(false); }); });

describe("Core handshake and message shape", () => {
  it("validates Host-initiated hello and Component acknowledgement", async () => {
    const schemaDirectory = await resolveSpecDirectory();
    const [hello, acknowledgement] = JSON.parse(await readFile(resolve(schemaDirectory, "..", "fixtures", "message-handshake.json"), "utf8"));
    const { message } = await createSpecValidators();
    expect(hello.payload.role).toBe("host");
    expect(acknowledgement.result.role).toBe("component");
    expect(acknowledgement.correlationId).toBe(hello.id);
    expect(acknowledgement.sessionId).toBeTruthy();
    expect(message(hello)).toBe(true);
    expect(message(acknowledgement)).toBe(true);
    const { correlationId: _correlationId, ...uncorrelated } = acknowledgement;
    expect(message(uncorrelated)).toBe(false);
    for (const field of ["event", "ok", "result", "error"]) expect(message({ ...hello, [field]: field === "ok" ? true : field === "event" ? "state.changed" : field === "error" ? { code: "INVALID_STATE", message: "wrong kind" } : {} })).toBe(false);
    for (const field of ["method", "event", "payload", "error"]) expect(message({ ...acknowledgement, [field]: field === "method" ? "start" : field === "event" ? "state.changed" : field === "error" ? { code: "INVALID_STATE", message: "wrong kind" } : {} })).toBe(false);
  });
});
