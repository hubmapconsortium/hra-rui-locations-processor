/**
 * Get a lookup table that converts given hubmap_ids to (optionally prefixed) UUIDs.
 * If more than 10,000 IDs, please split up into multiple 10k ID calls.
 *
 * @param {string[]} hubmap_ids a list of hubmap_ids to generate a lookup to Uuid for
 * @param {string} token the hubmap token (for unpublished data)
 * @param {string} prefix prefix for the UUID (often to convert to an HRA-compatible IRI)
 * @returns a lookup table from hubmap_id to (optionally prefixed) UUIDs.
 */
export async function getHbmToUuidLookup(
  hubmap_ids,
  token,
  prefix = 'https://entity.api.hubmapconsortium.org/entities/'
) {
  return fetch('https://search.api.hubmapconsortium.org/v3/portal/search', {
    method: 'POST',
    headers: token
      ? { 'Content-type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-type': 'application/json' },
    body: JSON.stringify({
      version: true,
      from: 0,
      size: 10000,
      query: {
        terms: {
          'hubmap_id.keyword': hubmap_ids,
        },
      },
      _source: {
        includes: ['uuid', 'hubmap_id'],
      },
    }),
  })
    .then((r) => r.json())
    .then((r) => r.hits.hits.map((n) => n._source))
    .then((r) => r.reduce((acc, row) => ((acc[row.hubmap_id] = `${prefix}${row.uuid}`), acc), {}));
}

export async function hubmapEnrichCsvEntries(data) {
  const HUBMAP_TOKEN = process.env.HUBMAP_TOKEN;
  let warn = false;

  const isHuBMAPId = (id) => id && id.startsWith('HBM') && id.trim().length === 15;
  const fields = ['donorId', 'sampleId', 'ruiLocationId', 'datasetId'];
  const hubmapIds = new Set();

  // Find all hubmap ids in the data
  for (const row of data) {
    for (const field of fields) {
      if (isHuBMAPId(row[field])) {
        hubmapIds.add(row[field]);
        warn = true;

        // Set the endpoint if not provided and looks like a HuBMAP ID
        if (!row.endpoint || row.endpoint.trim().length === 0) {
          row.endpoint = 'https://ccf-api.hubmapconsortium.org/v1/hubmap/rui_locations.jsonld';
        }
      }
    }

    // Add token for HuBMAP's registrations if available
    if (row.endpoint === 'https://ccf-api.hubmapconsortium.org/v1/hubmap/rui_locations.jsonld') {
      if (HUBMAP_TOKEN) {
        row.endpoint += `?token=${HUBMAP_TOKEN}`;
      } else {
        warn = true;
      }
    }
  }

  // A HuBMAP Token is required as some datasets are unpublished
  if (!HUBMAP_TOKEN && warn) {
    console.log('Please run `export HUBMAP_TOKEN=xxxYourTokenyyy` and try again to include unpublished data.');
  }

  const hbmLookup = await getHbmToUuidLookup([...hubmapIds], HUBMAP_TOKEN);
  for (const row of data) {
    for (const field of fields) {
      row[field] = hbmLookup[row[field]] || row[field];
    }
  }
}
