import { writeFileSync } from 'fs';
import { Providers } from "../utils/data-schema.js";
import { zodToJsonSchema } from "zod-to-json-schema";

/** This function will be called when json-schema option will be chosen.
 * This function converts Javascript Schema to Zod Schema and creates a json file.
 * This json file will be used to validate the registration.yaml file.
 * Remember you have to mention the path to  this file in the first line of registrations.yaml file.
 * @param { string } jsonSchemaPath - The path to file where JSON schema will be stored with .json extension.
 */
export function saveJsonSchema(jsonSchemaPath) {
  const jsonSchema = zodToJsonSchema(Providers, "mySchema");
  writeFileSync(jsonSchemaPath, JSON.stringify(jsonSchema, null, 2));
}
