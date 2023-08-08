// Requires Node v18+ (for fetch support)
import Papa from 'papaparse';
import { getHbmToUuidLookup } from './hubmap-uuid-lookup.js';

const dataSourcesCache = {};
// Some rui_locations.jsonld may need to be remapped. You can specify old => new url mappings here.
const ALIASES = {
  'https://dw-dot.github.io/hra-cell-type-populations-rui-json-lds/AllenWangLungMap_rui_locations.jsonld':
    'https://cns-iu.github.io/hra-cell-type-populations-rui-json-lds/AllenWangLungMap_rui_locations.jsonld',
};

/**
 * Grab and normalize registration data from the given url
 *
 * @param {string} url link to a rui_locations.jsonld to download from
 * @returns rui_locations.jsonld data (list of donor objects)
 */
export async function getDataSource(url, HUBMAP_TOKEN) {
  url = ALIASES[url] || url;

  // Add token for HuBMAP's registrations if available
  if (url === 'https://ccf-api.hubmapconsortium.org/v1/hubmap/rui_locations.jsonld' && HUBMAP_TOKEN) {
    url += `?token=${HUBMAP_TOKEN}`;
  }
  if (!dataSourcesCache[url] && url) {
    const graph = await fetch(url).then((r) => r.json());

    // Normalize results to array of donors
    if (Array.isArray(graph)) {
      dataSourcesCache[url] = graph;
    } else if (graph['@graph']) {
      dataSourcesCache[url] = graph['@graph'];
    } else if (graph['@type']) {
      dataSourcesCache[url] = [graph];
    }
  }
  return dataSourcesCache[url] || [];
}

/**
 * Find registration data in a set of registrations given some criteria
 *
 * @param {object[]} data a list of Donor information in the rui_locations.jsonld format
 * @param { { donorId?, ruiLocation?, sampleId?, datasetId? } } param1 ids to search for
 * @returns returns object with matched donor, block, section, dataset depending on what is matched
 */
function findInData(data, { donorId, ruiLocation, sampleId, datasetId }) {
  for (const donor of data) {
    // If a donor is found, return it
    if (donor['@id'] === donorId) {
      return { donor };
    }

    // Search blocks
    for (const block of donor.samples ?? []) {
      if (block['@id'] === sampleId || block.rui_location['@id'] === ruiLocation) {
        return { donor, block };
      }

      // Search sections
      for (const section of block.sections ?? []) {
        if (section['@id'] === sampleId) {
          return { donor, block, section };
        }

        // Search section datasets
        for (const sectionDataset of section.datasets ?? []) {
          if (sectionDataset['@id'] === datasetId) {
            return { donor, block, section, dataset: sectionDataset };
          }
        }
      }

      // Search block datasets
      for (const blockDataset of block.datasets ?? []) {
        if (blockDataset['@id'] === datasetId) {
          return { donor, block, dataset: blockDataset };
        }
      }
    }
  }
}

/** Imports data from CSV file, based on the fields mentioned.
 *
 * @param { string } CSV_URL - The URL of the CSV file
 * @param {*} FIELDS - The fields denote the columns to fetch
 * @param {*} BASE_IRI - Base IRI
 */

export async function importCsv(CSV_URL, FIELDS, BASE_IRI) {
  const HUBMAP_TOKEN = process.env.HUBMAP_TOKEN;

  // A HuBMAP Token is required as some datasets are unpublished
  if (!HUBMAP_TOKEN) {
    console.log('Please run `export HUBMAP_TOKEN=xxxYourTokenyyy` and try again.');
    process.exit();
  }

  //Fetch values of Columns from given fields
  const FIELD = [];
  for (const f in FIELDS) {
    FIELD.push(FIELDS[f]);
  }

  const allDatasets = await fetch(CSV_URL, { redirect: 'follow' })
    .then((r) => r.text())
    .then((r) =>
      Papa.parse(r, { header: true, fields: FIELD }).data.filter(
        (row) => row.excluded_from_atlas_construction !== 'TRUE'
      )
    )
    .catch((error) => {
      console.error('Error:', error);
    });

  // Check if ids starts from HBM. If yes, get UUID from it.

  const hbmLookup = await getHbmToUuidLookup(
    [
      ...allDatasets.filter((d) => d.dataset_id.startsWith('HBM')).map((d) => d.dataset_id),
      ...allDatasets.filter((d) => d.HuBMAP_tissue_block_id.startsWith('HBM')).map((d) => d.HuBMAP_tissue_block_id),
      ...allDatasets.filter((d) => d.HuBMAP_donor_id.startsWith('HBM')).map((d) => d.HuBMAP_donor_id),
    ],
    HUBMAP_TOKEN
  );

  const datasets = {};
  const donors = {};
  const blocks = {};
  const results = [];

  for (const dataset of allDatasets) {
    // Find in data according to rui, dataset, and donor
    // Grab registrations.jsonld file where this dataset occurs in
    const data = await getDataSource(dataset.ccf_api_endpoint, HUBMAP_TOKEN);

    let id;
    let result;

    // Search by Dataset id
    id = dataset.dataset_id;
    if (id.startsWith('HBM')) {
      const datasetId = hbmLookup[id];
      result = findInData(data, { datasetId });
    } else {
      result = findInData(data, { datasetId: dataset.dataset_id });
    }

    // Search by Sample id
    if (!result) {
      let sampleId = dataset.sample_id;
      if (sampleId.startsWith('HBM')) {
        sampleId = hbmLookup[sampleId];
        result = findInData(data, { sampleId });
      } else {
        result = findInData(data, { sampleId });
      }
    }

    // Search by RUI
    if (!result) {
      id = dataset.CxG_dataset_id_donor_id_organ;
      result = findInData(data, { ruiLocation: dataset.sample_id.split('_')[0] });
      if (!result) {
        const sampleId = dataset.sample_id;
        result = findInData(data, { sampleId });
      }
    }

    // Search by Donor ID (HuBMAP_donor_id)
    if (!result) {
      let donorId = dataset.HuBMAP_donor_id;
      if (donorId.startsWith('HBM')) {
        donorId = hbmLookup[donorId];
      }
      result = findInData(data, { donorId });
    }

    // If data is found, add it to the growing list of registrations to output
    if (result) {
      const donorId = result.donor['@id'];
      if (!donors[donorId]) {
        donors[donorId] = {
          ...result.donor,
          '@context': undefined,
          samples: [],
        };
        results.push(donors[donorId]);
      }
      const donor = donors[donorId];

      const blockId = result.block['@id'];
      if (!blocks[blockId]) {
        blocks[blockId] = {
          ...result.block,
          sections: [],
          datasets: [],
        };
        donor.samples.push(blocks[blockId]);
      }
      const block = blocks[blockId];

      const datasetIri = `${BASE_IRI}${id}`;
      let hraDataset;
      if (result.dataset) {
        // Copy dataset over with new '@id' matching our dataset id
        hraDataset = Object.assign(
          { '@id': datasetIri }, // makes sure '@id' is first
          result.dataset,
          {
            '@id': datasetIri,
            link: dataset.paper_id || result.dataset.link,
          }
        );
      } else {
        // If no Dataset was matched, make a new one
        hraDataset = {
          '@id': datasetIri,
          '@type': 'Dataset',
          label: block.label,
          description: block.description,
          link: dataset.paper_id || block.link,
          technology: 'OTHER',
          thumbnail: 'assets/icons/ico-unknown.svg',
        };
      }
      block.datasets.push(hraDataset);
      datasets[hraDataset['@id']] = hraDataset;
    } else {
      console.log(`Investigate ${dataset.source}, id: ${dataset.dataset_id}`);
    }
  }

  // Delete all '@contexts' in favor of our own
  for (const donor of results) {
    for (const block of donor.samples ?? []) {
      delete block.rui_location['@context'];
      delete block.rui_location.placement['@context'];
    }
  }

  const savedDatasets = Object.keys(datasets).length;
  if (savedDatasets !== allDatasets.length) {
    console.log(
      `There was some problem saving out at least one dataset. Saved: ${savedDatasets} Expected: ${allDatasets.length}`
    );
  }
  return results;
}
