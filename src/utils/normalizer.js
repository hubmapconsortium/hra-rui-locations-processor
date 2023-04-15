import { dump, load } from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export function normalizeRegistrations(context) {
  const rawDataPath = resolve(context.doPath, 'registrations.yaml');
  const ruiLocationsDir = resolve(context.doPath, 'registrations');
  const data = load(readFileSync(rawDataPath));  
  const normalized = processRegistrations(data, ruiLocationsDir);

  // const normalizedPath = resolve(context.doPath, 'normalized.yaml');
  // writeFileSync(normalizedPath, dump(normalized));

  const ruiLocationsOutputPath = resolve(context.doPath, 'rui_locations.jsonld')
  writeFileSync(ruiLocationsOutputPath, JSON.stringify(normalized, null, 2));
}

export function processRegistrations(data, ruiLocationsDir) {
  return data;
}