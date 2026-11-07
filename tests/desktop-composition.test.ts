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
    const invalidStatus = await fixture("preset-snapshot.json");
    invalidStatus.instances[0].status = "unrecognized";
    expect(validators["preset-snapshot.schema.json"](invalidStatus)).toBe(false);
    const missingConfigRevision = await fixture("preset-snapshot.json");
    delete missingConfigRevision.instances[0].configRevision;
    expect(validators["preset-snapshot.schema.json"](missingConfigRevision)).toBe(false);
    expect(validators["component-properties.schema.json"]({ schemaVersion: "0.1.0", properties: {
      enabled: { type: "bool", value: true, text: "Enabled" },
      format: { type: "combo", value: "24h", options: [{ value: "12h", label: "12-hour" }, { value: "24h", label: "24-hour" }] },
    } })).toBe(true);
    expect(validators["component-properties.schema.json"]({ schemaVersion: "0.1.0", properties: { format: { type: "combo", value: "24h" } } })).toBe(false);
    const localization = await fixture("component-localization.json");
    expect(validators["component-localization.schema.json"](localization)).toBe(true);
    expect(validators["component-localization.schema.json"]({ schemaVersion: "0.1.0", properties: { unknown: {} } })).toBe(false);
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

  it("rejects stale revisions while refreshing equal revisions and switching preset streams", async () => {
    const validators = await createCompositionDraftValidators();
    const current = await fixture("preset-multiple-instances.json") as PresetSnapshot;
    const same = structuredClone(current);
    const reordered = Object.fromEntries(Object.entries(current).reverse()) as PresetSnapshot;
    const newer = { ...structuredClone(current), revision: current.revision + 1 };
    const stale = { ...structuredClone(current), revision: current.revision - 1 };
    const derivedRefresh = { ...structuredClone(current), instances: current.instances.map(instance => ({ ...instance, status: "unavailable" })) };
    const otherPreset = { ...structuredClone(current), presetId: "other" };
    expect(validatePresetSnapshot(current, validators["preset-snapshot.schema.json"])).toBe(true);
    expect(compareSnapshotRevision(current, same)).toBe("idempotent");
    expect(compareSnapshotRevision(current, reordered)).toBe("idempotent");
    expect(compareSnapshotRevision(current, newer)).toBe("apply");
    expect(compareSnapshotRevision(current, stale)).toBe("stale");
    expect(compareSnapshotRevision(current, derivedRefresh)).toBe("apply");
    expect(compareSnapshotRevision(current, otherPreset)).toBe("apply");
  });

  it("keeps visibility independent from lifecycle by requiring every presentation gate", () => {
    const ready = { enabled: true, userVisible: true, sceneAllowed: true, runtimeReady: true };
    expect(effectiveVisibility(ready)).toBe(true);
    for (const key of Object.keys(ready) as Array<keyof typeof ready>)
      expect(effectiveVisibility({ ...ready, [key]: false })).toBe(false);
  });
});
