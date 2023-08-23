// Requires Node v18+ (for fetch support)
import Papa from 'papaparse';
import { hubmapEnrichCsvEntries } from './hubmap.js';

const dataSourcesCache = {};

/**
 * Grab and normalize registration data from the given url
 *
 * @param {string} url link to a rui_locations.jsonld to download from
 * @returns rui_locations.jsonld data (list of donor objects)
 */
export async function getDataSource(url) {
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
function findInData(data, { donorId, ruiLocation, sampleId, datasetId, publication }) {
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
            console.log('Section Dataset : ', sectionDataset.publication);
            return { donor, block, section, dataset: sectionDataset };
          }
        }
      }

      // Search block datasets
      for (const blockDataset of block.datasets ?? []) {
        if (blockDataset['@id'] === datasetId) {
          console.log('Block Dataset : ', blockDataset.publication);
          return { donor, block, dataset: blockDataset };
        }
      }
    }
  }
}

export function generateIri(uniqueId, baseIri = undefined) {
  let iri = uniqueId;
  if (baseIri) {
    const delimiter = baseIri.includes('#') ? '_' : '#';
    iri = `${baseIri}${delimiter}${uniqueId}`;
  }
  return iri;
}

export function fetchCsv(csvUrl, fieldLookup) {
  return fetch(csvUrl, { redirect: 'follow' })
  .then((r) => r.text())
  .then((r) => Papa.parse(r, { header: true }).data)
  .then((rows) =>
    rows.map((row) =>
      Object.entries(fieldLookup).reduce((acc, [field, srcField]) => (acc[field] = row[srcField], acc), {})
    )
  );
}

/**
 * Imports data from CSV file, based on the fields mentioned.
 *
 * @param { string } csvUrl - The URL of the CSV file
 * @param { object } fieldLookup - The fields denote the columns to fetch
 * @param { string } baseIri - Base IRI
 */
export async function importCsv(csvUrl, fieldLookup, baseIri = undefined) {
  const allDatasets = await fetchCsv(csvUrl, fieldLookup);
  hubmapEnrichCsvEntries(allDatasets);

  const datasets = {};
  const donors = {};
  const blocks = {};
  const results = [];

  for (const dataset of allDatasets) {
    const data = await getDataSource(dataset.endpoint);
    const { datasetId, sampleId, ruiLocationId, donorId, uniqueId, linkId, publicationId, publicationTitle, publicationLeadAuthor } = dataset;

    let id;
    let result;

    if (datasetId) {
      id = datasetId;
      result = findInData(data, { datasetId });
    }
    if (!result && sampleId) {
      id = sampleId;
      result = findInData(data, { sampleId });
    }
    if (!result && ruiLocationId) {
      id = ruiLocationId;
      result = findInData(data, { ruiLocation: ruiLocationId });
    }
    if (!result && donorId) {
      id = donorId;
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

      if (result.block) {
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

        const datasetIri = generateIri(uniqueId, baseIri);
        let hraDataset;
        if (result.dataset) {
          // Copy dataset over with new '@id' matching our dataset id
          hraDataset = Object.assign(
            { '@id': datasetIri }, // makes sure '@id' is first
            result.dataset,
            {
              '@id': datasetIri,
              link: linkId || result.dataset.link, 
              publicationId: publicationId,    // It should also fetch from result??
              publicationTitle: publicationTitle,
              publicationLeadAuthor: publicationLeadAuthor
            }
          );
        } else {
          // If no Dataset was matched, make a new one
          hraDataset = {
            '@id': datasetIri,
            '@type': 'Dataset',
            label: block.label,
            description: block.description,
            link: linkId || block.link,
            publicationId: publicationId,
            publicationTitle: publicationTitle,
            publicationLeadAuthor: publicationLeadAuthor,
            technology: 'OTHER',
            thumbnail: 'assets/icons/ico-unknown.svg',
          };
        }
        block.datasets.push(hraDataset);
        datasets[hraDataset['@id']] = hraDataset;
      } else {
        console.log(`Investigate ${JSON.stringify(dataset)}`.replace(/\"/g, ''));
      }
    } else {
      console.log(`Investigate ${JSON.stringify(dataset)}`.replace(/\"/g, ''));
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
