import type { ValidateFunction } from "ajv";

export interface ExtensionOffer { id: string; versions: string[]; }
export interface SelectedExtension { id: string; version: string; }
export interface SnapshotInstance { instanceId: string; layout: { mode: "manual" | "automatic"; locked: boolean }; }
export interface PresetSnapshot {
  presetId: string;
  revision: number;
  layoutMode: "manual" | "grid";
  instances: SnapshotInstance[];
  [key: string]: unknown;
}

function assertUniqueExtensionIds(offers: ExtensionOffer[], label: string): void {
  const ids = new Set<string>();
  for (const offer of offers) {
    if (ids.has(offer.id)) throw new TypeError(`${label} contains duplicate extension ID: ${offer.id}`);
    ids.add(offer.id);
  }
}

/** Exact-version intersection; the initiator's version order expresses preference. */
export function negotiateExtensions(offered: ExtensionOffer[], supported: ExtensionOffer[]): SelectedExtension[] {
  assertUniqueExtensionIds(offered, "offer");
  assertUniqueExtensionIds(supported, "support list");
  const supportedById = new Map(supported.map((entry) => [entry.id, new Set(entry.versions)]));
  const selected: SelectedExtension[] = [];
  for (const offer of offered) {
    const versions = supportedById.get(offer.id);
    const version = offer.versions.find((candidate) => versions?.has(candidate));
    if (version) selected.push({ id: offer.id, version });
  }
  return selected;
}

export function validatePresetSnapshot(value: unknown, schema: ValidateFunction): value is PresetSnapshot {
  if (!schema(value) || !value || typeof value !== "object" || Array.isArray(value)) return false;
  const snapshot = value as PresetSnapshot;
  const ids = new Set<string>();
  for (const instance of snapshot.instances) {
    if (ids.has(instance.instanceId)) return false;
    ids.add(instance.instanceId);
    if (snapshot.layoutMode === "manual" && instance.layout.mode !== "manual") return false;
    if (snapshot.layoutMode === "grid" && instance.layout.mode !== "automatic" && !(instance.layout.mode === "manual" && instance.layout.locked)) return false;
  }
  return true;
}

export type SnapshotRevisionDecision = "apply" | "idempotent" | "stale" | "conflict";

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export function compareSnapshotRevision(current: PresetSnapshot | undefined, incoming: PresetSnapshot): SnapshotRevisionDecision {
  if (!current) return "apply";
  if (current.presetId !== incoming.presetId) return "conflict";
  if (incoming.revision < current.revision) return "stale";
  if (incoming.revision > current.revision) return "apply";
  return canonicalJson(current) === canonicalJson(incoming) ? "idempotent" : "conflict";
}

export function effectiveVisibility(state: { enabled: boolean; userVisible: boolean; sceneAllowed: boolean; runtimeReady: boolean }): boolean {
  return state.enabled && state.userVisible && state.sceneAllowed && state.runtimeReady;
}
