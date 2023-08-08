/**
 * Get a lookup table that converts given hubmap_ids to (optionally prefixed) UUIDs.
 * If more than 10,000 IDs, please split up into multiple 10k ID calls.
 *
 * @param {string[]} hubmap_ids a list of hubmap_ids to generate a lookup to Uuid for
 * @param {*} token the hubmap token (for unpublished data)
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
