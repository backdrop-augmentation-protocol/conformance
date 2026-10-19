import Ajv2020Module, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { readSpecSchema } from "./spec-source.js";

export interface SpecValidators { manifest: ValidateFunction; message: ValidateFunction; error: ValidateFunction; source: string; }
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
  ajv.addSchema(common);
  ajv.addSchema(error);
  return { manifest: ajv.compile(manifest), message: ajv.compile(message), error: ajv.compile(error), source: String(manifest.$id ?? "spec") };
}

export function validationErrors(validate: ValidateFunction): string[] { return (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`); }
