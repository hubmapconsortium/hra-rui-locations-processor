import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Providers } from '../utils/data-schema.js';
import { convertToJsonLd } from './main.js';
import { loadFile, normalizeRegistration } from './normalizer.js';

const FILTER_SPEC = {
  property: '',
  test: () => false,
  inner: [
    {
      property: '@graph',
      test: matches,
      inner: [
        {
          property: 'samples',
          test: (s, ids) => matches(s, ids) || matches(s.rui_location, ids),
          inner: [
            {
              property: 'datasets',
              test: matches,
            },
            {
              property: 'sections',
              test: matches,
              inner: [
                {
                  property: 'samples',
                  test: matches,
                },
                {
                  property: 'datasets',
                  test: matches,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/**
 * Imports data from a list of RUI locations, fetches them, and filter it.
 * @param { string[] } rui_locations - An array containing RUI locations (URLs or file paths) from which data will be fetched and imported.
 * @param { string[] } filters - An array containing filtering criteria to apply to the imported rui_location data.
 */
export async function importFromList(rui_locations, filters) {
  let ids;
  if (filters && filters?.ids?.length > 0) {
    ids = new Set(filters.ids);
  }
  let results = [];

  for (const dataset of rui_locations) {
    let data = [];

    if (dataset.startsWith('http://') || dataset.startsWith('https://')) {
      data = await fetch(dataset).then((r) => r.json());
    } else if (dataset.endsWith('rui_locations.jsonld') && existsSync(dataset)) {
      data = JSON.parse(readFileSync(dataset).toString());
    } else if (existsSync(resolve(dataset, 'registrations.yaml'))) {
      const ruiLocationsDir = resolve(dataset, 'registrations');
      data = loadFile(dataset, 'registrations.yaml', Providers);
      data = await normalizeRegistration(data, ruiLocationsDir);
      data = convertToJsonLd(data, '', '');
    } else {
      console.log('Unable to import', dataset);
    }

    if (!data['@graph'] && Array.isArray(data)) {
      data = { '@graph': data };
    }
    if (ids) {
      data = filter(data, ids, FILTER_SPEC);
    }
    results = results.concat(data['@graph']);
  }
  return results;
}

function matches(item, ids) {
  return ids.has(item['@id']);
}

function filter(item, ids, spec, level = 0) {
  if (spec.test(item, ids)) {
    return item;
  }

  const copy = { ...item };
  let hasMatches = false;
  for (const innerSpec of spec.inner ?? []) {
    const { property } = innerSpec;
    const innerItems = item[property]?.map((i) => filter(i, ids, innerSpec, level + 1))?.filter((i) => i !== undefined);

    copy[property] = innerItems;
    if (innerItems !== undefined && innerItems.length > 0) {
      hasMatches = true;
    }
  }

  return hasMatches ? copy : undefined;
}
