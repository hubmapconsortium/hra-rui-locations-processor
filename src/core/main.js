import { readFileSync, writeFileSync } from 'fs';
import { load } from 'js-yaml';
import { resolve } from 'path';
import sh from 'shelljs';

import { Providers } from '../utils/data-schema.js';
import { importCsv } from './csv-normalizer.js';
import { importFromList } from './import-list-normalizer.js';
import { ensurePropertyOrder, normalizeRegistration } from './normalizer.js';

/**
 * This function normalizes the registration data from a YAML file to a JSON-LD format and writes it to a file as output.
 *  @param { string } context - The directory path of registration.yaml file.
 */
export async function normalizeRegistrations(context) {
  const ruiLocationsDir = resolve(context.doPath, 'registrations');
  const data = loadFile(context.doPath, 'registrations.yaml', Providers);

  // FIXME
  // Normal Normalization
  let normalized = '';
  for (const provider of data) {
    if (provider.provider_name) {
      normalized = await normalizeRegistration(data, ruiLocationsDir);
    }
  }

  //Importing from CSV files
  let csv_normalized = '';
  for (const csv of data) {
    if (csv.import_from_csv) {
      csv_normalized = await importCsv(csv.import_from_csv, csv.fields, csv.baseIri);
    }
  }

  //Importing from list (web or local) files using filters
  let import_list_normalized = '';
  for (const import_list of data) {
    if (import_list.imports) {
      import_list_normalized = await importFromList(import_list.imports, import_list.filter);
    }
  }

  const final = convertToJsonLd(normalized, csv_normalized, import_list_normalized);

  const ruiLocationsOutputPath = resolve(context.doPath, 'rui_locations.jsonld');
  writeFileSync(ruiLocationsOutputPath, JSON.stringify(final, null, 2));
  sh.cp(resolve(context.processorHome, 'src/ccf-eui-template.html'), resolve(context.doPath, 'index.html'));
}

/**
 * This function loads the file, and valdiates it with schema.
 * @param { string } dir - The directory of file
 * @param { string } file - The name of file
 * @param { string } schema - The Zod schema with which the file has to be validated.
 */
function loadFile(dir, file, schema) {
  const path = resolve(dir, file);
  const yaml = load(readFileSync(path));
  return schema.parse(yaml);
}

/**
 * This function is used to convert the above generated schema to JsonLd format.
 * @param { object } data - The data, which was ensured above, and which needs to be converted to JsonLd format.
 */
export function convertToJsonLd(normalized, csv_normalized, import_list_normalized) {
  const data = {
    '@context': 'https://hubmapconsortium.github.io/ccf-ontology/ccf-context.jsonld',
    '@graph': [],
  };
  const donors = data['@graph'];

  if (normalized !== '') {
    for (const provider of normalized) {
      if (provider.donors) {
        const providerDonors = provider.donors.map((donor) => ({
          consortium_name: provider.consortium_name,
          provider_name: provider.provider_name,
          provider_uuid: provider.provider_uuid,
          ...donor,
        }));
        providerDonors.forEach((donor) => ensurePropertyOrder(donor, providerDonors));
        providerDonors.forEach((donor) => donors.push(donor));
      }
    }
  }

  if (csv_normalized !== '') {
    for (const data of csv_normalized) {
      donors.push(data);
    }
  }

  if (import_list_normalized !== '') {
    for (const data of import_list_normalized) {
      donors.push(data);
    }
  }

  return data;
}
