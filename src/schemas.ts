import Ajv2020Module, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { readCompositionSchema, readSpecSchema, readWeProjectSchema } from "./spec-source.js";

export interface SpecValidators { manifest: ValidateFunction; message: ValidateFunction; error: ValidateFunction; weProject: ValidateFunction; source: string; }
export const compositionSchemaFiles = ["extension-offer.schema.json", "extension-selection.schema.json", "component-instance.schema.json", "layout.schema.json", "component-properties.schema.json", "component-localization.schema.json", "component-metadata.schema.json", "preset-snapshot.schema.json"] as const;
export type CompositionSchemaFile = typeof compositionSchemaFiles[number];
export type CompositionValidators = Record<CompositionSchemaFile, ValidateFunction>;
const Ajv2020 = Ajv2020Module as unknown as new (options?: object) => { addSchema(schema: object): void; compile(schema: object): ValidateFunction };
const addFormats = addFormatsModule as unknown as (ajv: unknown) => void;

export async function createSpecValidators(): Promise<SpecValidators> {
  // The published schema uses conditional `required` branches whose properties
  // are declared at the root; accept that valid JSON Schema pattern in AJV.
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const common = await readSpecSchema("common.schema.json");
  const error = await readSpecSchema("error.schema.json");
  const manifest = await readSpecSchema("manifest.schema.json");
  const message = await readSpecSchema("message.schema.json");
  const weProject = await readWeProjectSchema();
  ajv.addSchema(common);
  ajv.addSchema(error);
  return { manifest: ajv.compile(manifest), message: ajv.compile(message), error: ajv.compile(error), weProject: ajv.compile(weProject), source: String(manifest.$id ?? "spec") };
}

export async function createCompositionValidators(): Promise<CompositionValidators> {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemas = await Promise.all(compositionSchemaFiles.map(async (file) => [file, await readCompositionSchema(file)] as const));
  for (const [, schema] of schemas) ajv.addSchema(schema);
  return Object.fromEntries(schemas.map(([file, schema]) => [file, ajv.compile(schema)])) as CompositionValidators;
}

export function validationErrors(validate: ValidateFunction): string[] { return (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`); }
