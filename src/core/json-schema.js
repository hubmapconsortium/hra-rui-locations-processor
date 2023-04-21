import { writeFileSync } from 'fs';
import { Providers } from "../utils/data-schema.js";
import { zodToJsonSchema } from "zod-to-json-schema";

export function saveJsonSchema(jsonSchemaPath) {
  const jsonSchema = zodToJsonSchema(Providers, "mySchema");
  writeFileSync(jsonSchemaPath, JSON.stringify(jsonSchema, null, 2));
}
