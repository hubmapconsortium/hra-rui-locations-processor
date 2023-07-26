import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { resolve } from 'path';

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
  console.log(results)
  return results;
}

function filterDonors(donors, filters) {
  const { donorIds = [], sampleIds = [], ruiLocationIds = [] } = filters;
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

function donorFilterFactory(ids) {
  return (donor) => ids.includes(donor['@id']) ? [true] : [];
}

function donorMap(donor) {
  return donor;
}

function sampleOrRuiLocationFilterFactory(sampleIds, ruiLocationIds) {
  return (donor) => donor.samples.filter(sample => {
    return sampleIds.includes(sample['@id'])
      || ruiLocationIds.includes(sample.rui_location['@id']);
  });
}

function sampleMap(donor, samples) {
  return { ...donor, samples };
}
