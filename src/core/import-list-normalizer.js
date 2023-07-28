import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { resolve } from 'path';

/**
 * Imports data from a list of RUI locations, fetches them, and filter it.
 * @param { string[] } rui_locations - An array containing RUI locations (URLs or file paths) from which data will be fetched and imported.
 * @param { string[] } filters - An array containing filtering criteria to apply to the imported rui_location data.
 */
export async function importFromList(rui_locations, filters) {
  let results = [];

  for (const dataset of rui_locations) {
    let data = ''
    if (dataset.startsWith('http://') || dataset.startsWith('https://')) {
      data = await fetch(dataset).then(r => r.json());
    }
    else {
      const path = resolve(dataset, 'rui_locations.jsonld');
      data = load(readFileSync(path));
    }
    results = results.concat(filterDonors(data['@graph'], filters));
  }
  return results;
}

/**
 * Filters the donors' information based on the provided filter criteria.
 * @param { string[] } donors - An array of donor objects representing the donor's information.
 * @param { string[] } filters - An array containing filtering criteria for donor information.
 */
function filterDonors(donors, filters) {
  const { donorIds = [], sampleIds = [], ruiLocationIds = [] } = filters || {};
  const hasFilters = donorIds.length > 0 || sampleIds.length > 0 || ruiLocationIds.length > 0;
  if (!hasFilters) {
    return donors;
  }

  const partitionFuncs = [
    [donorFilterFactory(donorIds), donorMap],
    [sampleOrRuiLocationFilterFactory(sampleIds, ruiLocationIds), sampleMap],
  ];
  const [results] = partitionFuncs.reduce(([result, remaining], [filter, map]) => {
    const [matching, rest] = partition(remaining, filter, map);
    return [result.concat(matching), rest];
  }, [[], donors]);

  return results;
}

/**
 * Partitions an array of items into two arrays based on a filtering and mapping function.
 * The filtering function is used to determine whether an item should be included in the 'matching' array or the 'rest' array.
 * @param { string[] } items - An array of items to be partitioned.
 * @param { string[] } filter - An array containing filtering criteria for donor information.
 * @param { string[] } map - A map that takes the original item and the filtered array as inputs and returns the mapped item.
 */
function partition(items, filter, map) {
  const matching = [];
  const rest = [];
  for (const item of items) {
    const filtered = filter(item);

    if (filtered.length > 0) {
      matching.push(map(item, filtered));
    } else {
      rest.push(item);
    }
  }

  return [matching, rest];
}

/**
 * Factory function that creates a donor filtering function based on a provided array of donor IDs.
 * @param { string[] } ids - An array of donor IDs to be used as filter criteria.
 */
function donorFilterFactory(ids) {
  return (donor) => ids.includes(donor['@id']) ? [true] : [];
}

/**
 * Mapping function that maps a donor object to itself.
 * @param { string[] } donor - A donor object representing the donor's information.
 */
function donorMap(donor) {
  return donor;
}

/**
 * Factory function that creates a filtering function to filter donors based on sample IDs or RUI location IDs.
 * @param {string[]} sampleIds - An array of sample IDs to be used as filter criteria.
 * @param {string[]} ruiLocationIds - An array of RUI location IDs to be used as filter criteria.
 */
function sampleOrRuiLocationFilterFactory(sampleIds, ruiLocationIds) {
  return (donor) => donor.samples.filter(sample => {
    return sampleIds.includes(sample['@id'])
      || ruiLocationIds.includes(sample.rui_location['@id']);
  });
}

/**
 * Mapping function that maps a donor object with a new set of samples.
 * @param {Object} donor - A donor object representing the donor's information.
 * @param {Object[]} samples - An array of sample objects representing the new set of samples to be associated with the donor.
 */
function sampleMap(donor, samples) {
  return { ...donor, samples };
}
