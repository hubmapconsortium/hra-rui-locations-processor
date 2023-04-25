import { load } from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Providers } from "../utils/data-schema.js";
import { SpatialEntity } from "../utils/spatial-schema.js"

export function normalizeRegistrations(context) {
  const ruiLocationsDir = resolve(context.doPath, 'registrations');
  const data = loadFile(context.doPath, 'registrations.yaml', Providers);
  const normalized = processRegistrations(data, ruiLocationsDir);

  // const normalizedPath = resolve(context.doPath, 'normalized.yaml');
  // writeFileSync(normalizedPath, dump(normalized));

  const ruiLocationsOutputPath = resolve(context.doPath, 'rui_locations.jsonld')
  writeFileSync(ruiLocationsOutputPath, JSON.stringify(normalized, null, 2));
}

export function processRegistrations(data, ruiLocationsDir) {
  for (const block of blockIter(data)) {
    if (typeof block.rui_location === 'string') {
      block.rui_location = loadFile(ruiLocationsDir, block.rui_location, SpatialEntity);
    }
  }
  return data;
}

function *blockIter(data) {
  for (const provider of data) {
    for (const donor of provider.donors) {
      for (const block of donor.blocks) {
        yield block;
      }
    }
  }
}

function loadFile(dir, file, schema) {
  const path = resolve(dir, file);
  const yaml = load(readFileSync(path));
  return schema.parse(yaml);
}