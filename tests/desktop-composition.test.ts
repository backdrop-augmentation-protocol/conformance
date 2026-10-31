import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareSnapshotRevision,
  effectiveVisibility,
  negotiateExtensions,
  validatePresetSnapshot,
  type ExtensionOffer,
  type PresetSnapshot,
} from "../src/desktop-composition.js";
import { createCompositionDraftValidators } from "../src/schemas.js";
import { resolveCompositionDraftDirectory } from "../src/spec-source.js";

async function fixture(name: string): Promise<any> {
  const root = await resolveCompositionDraftDirectory();
  return JSON.parse(await readFile(join(root, "fixtures", name), "utf8"));
}

describe("BAP 0.2.0 desktop composition draft", () => {
  it("validates the extension offers, selection, and preset snapshot fixtures", async () => {
    const validators = await createCompositionDraftValidators();
    expect(validators["extension-offer.schema.json"](await fixture("host-extension-offer.json"))).toBe(true);
    expect(validators["extension-selection.schema.json"](await fixture("extension-selection.json"))).toBe(true);
    expect(validators["preset-snapshot.schema.json"](await fixture("preset-multiple-instances.json"))).toBe(true);
    expect(validators["preset-snapshot.schema.json"](await fixture("preset-snapshot.json"))).toBe(true);
    expect(validators["component-properties.schema.json"]({ schemaVersion: "0.1.0", properties: { label: { type: "string", default: "Clock" }, format: { type: "enum", default: "24h", options: ["12h", "24h"] } } })).toBe(true);
    expect(validators["component-properties.schema.json"]({ schemaVersion: "0.1.0", properties: { format: { type: "enum", default: "24h" } } })).toBe(false);
  });

  it("selects only exact common extension versions and ignores unknown offers", () => {
    const offered: ExtensionOffer[] = [
      { id: "org.bap.composition", versions: ["0.2.0", "0.1.0"] },
      { id: "org.example.unknown", versions: ["1.0.0"] },
    ];
    const supported: ExtensionOffer[] = [{ id: "org.bap.composition", versions: ["0.1.0"] }];
    expect(negotiateExtensions(offered, supported)).toEqual([{ id: "org.bap.composition", version: "0.1.0" }]);
    expect(negotiateExtensions(offered, [{ id: "org.bap.composition", versions: ["0.3.0"] }])).toEqual([]);
    expect(() => negotiateExtensions([...offered, offered[0]], supported)).toThrow(/duplicate extension ID/);
  });

  it("allows repeated component IDs but rejects repeated instance IDs and layout-mode mismatches", async () => {
    const validators = await createCompositionDraftValidators();
    const schema = validators["preset-snapshot.schema.json"];
    const snapshot = await fixture("preset-multiple-instances.json") as PresetSnapshot;
    expect(snapshot.instances[0]).toMatchObject({ componentId: snapshot.instances[1].componentId });
    expect(validatePresetSnapshot(snapshot, schema)).toBe(true);

    const duplicate = structuredClone(snapshot);
    duplicate.instances[1].instanceId = duplicate.instances[0].instanceId;
    expect(validatePresetSnapshot(duplicate, schema)).toBe(false);

    const mismatch = structuredClone(snapshot);
    mismatch.instances[1].layout.mode = "automatic";
    expect(validatePresetSnapshot(mismatch, schema)).toBe(false);
  });

  it("rejects stale/conflicting revisions and idempotently accepts an identical revision", async () => {
    const validators = await createCompositionDraftValidators();
    const current = await fixture("preset-multiple-instances.json") as PresetSnapshot;
    const same = structuredClone(current);
    const reordered = Object.fromEntries(Object.entries(current).reverse()) as PresetSnapshot;
    const newer = { ...structuredClone(current), revision: current.revision + 1 };
    const stale = { ...structuredClone(current), revision: current.revision - 1 };
    const sameRevisionConflict = { ...structuredClone(current), layoutMode: "grid" as const };
    const otherPreset = { ...structuredClone(current), presetId: "other" };
    expect(validatePresetSnapshot(current, validators["preset-snapshot.schema.json"])).toBe(true);
    expect(compareSnapshotRevision(current, same)).toBe("idempotent");
    expect(compareSnapshotRevision(current, reordered)).toBe("idempotent");
    expect(compareSnapshotRevision(current, newer)).toBe("apply");
    expect(compareSnapshotRevision(current, stale)).toBe("stale");
    expect(compareSnapshotRevision(current, sameRevisionConflict)).toBe("conflict");
    expect(compareSnapshotRevision(current, otherPreset)).toBe("conflict");
  });

  it("keeps visibility independent from lifecycle by requiring every presentation gate", () => {
    const ready = { enabled: true, userVisible: true, sceneAllowed: true, runtimeReady: true };
    expect(effectiveVisibility(ready)).toBe(true);
    for (const key of Object.keys(ready) as Array<keyof typeof ready>)
      expect(effectiveVisibility({ ...ready, [key]: false })).toBe(false);
  });
});
