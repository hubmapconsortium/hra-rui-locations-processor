import { load } from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Providers } from '../utils/data-schema.js';
import { SpatialEntity, temp } from '../utils/spatial-schema.js';

export function normalizeRegistrations(context) {
  const ruiLocationsDir = resolve(context.doPath, 'registrations');
  const data = loadFile(context.doPath, 'registrations.yaml', Providers);
  const normalized = normalizeRegistration(data, ruiLocationsDir);

  const final = convertToJsonLd(normalized);

  // const normalizedPath = resolve(context.doPath, 'normalized.yaml');
  // writeFileSync(normalizedPath, dump(normalized));

  const ruiLocationsOutputPath = resolve(
    context.doPath,
    'rui_locations.jsonld'
  );
  writeFileSync(ruiLocationsOutputPath, JSON.stringify(final, null, 2));
}

export function normalizeRegistration(data, ruiLocationsDir) {
  const warnings = new Set();
  for (const provider of data) {
    for (const donor of provider.donors) {
      donor['@type'] = 'Donor';

      for (const [block, blockId] of enumerate(donor.blocks)) {
        block['@type'] = 'Sample';
        block['sample_type'] = 'Tissue Block';

        const ruiLocation = ensureRuiLocation(block, ruiLocationsDir);

        ensureId(blockId, block, donor);
        ensureLabel(block, ruiLocation, donor, provider);
        ensureProviderDescription(provider, ruiLocation);
        ensureLink(block, donor, provider);

        for (const [section, sectionId] of enumerate(block.sections)) {
          section['@type'] = 'Sample';
          section['sample_type'] = 'Tissue Section';

          ensureId(sectionId, section, block, donor);
          ensureLabel(section, ruiLocation, donor, provider);
          ensureSectionDescription(section, ruiLocation, donor, provider);
          ensureLink(section, block, donor, provider);

          for (const [dataset, datasetId] of enumerate(block.datasets ?? [])) {
            dataset['@type'] = 'Dataset';

            ensureId(datasetId, dataset, block, donor);
            ensureLabel(dataset, ruiLocation, donor, provider);
            ensureDatasetDescription(dataset);
            ensureLink(dataset, block, donor, provider);
          }
        }
      }
    }
  }

  return data;
}

function loadFile(dir, file, schema) {
  const path = resolve(dir, file);
  const yaml = load(readFileSync(path));
  return schema.parse(yaml);
}

function ensureRuiLocation(block, ruiLocationsDir) {
  if (typeof block.rui_location === 'string') {
    block.rui_location = loadFile(
      ruiLocationsDir,
      block.rui_location,
      SpatialEntity
    );
  }
  return block.rui_location;
}

function ensureLink(object, ...ancestors) {
  console.log(object['@id']);
  if (!object.link) {
    for (const ancestor of ancestors) {
      if (ancestor.link) {
        object.link = ancestor.link;
        return;
      }
    }
  }
  throw new Error(
    ' Link is missing. Please provide a link for the object or its parent Donor'
  );
}

function ensureProviderDescription(provider, rui_location) {
  if (!provider.description) {
    console.log('Generated Desc');
    const prefix = 'Entered';
    provider.description = makeLabel(
      prefix,
      rui_location,
      provider.provider_name
    );
  }
}

function ensureDatasetDescription(object) {
  console.log('generated dataset ensuredesc');
  if (!object.description) {
    object.description = 'Data/Assay Types: ' + object.technology + ', ';
    return;
  }
}

function ensureSectionDescription(object, rui_location, ...ancestors) {
  console.log('generated ensureSectionDescription');
  if (!object.description) {
    if (rui_location.x_dimension) {
      // Generate from rui_location
      console.log('generated from rui_location');
      const x_dim = rui_location.x_dimension;
      const y_dim = rui_location.y_dimension;
      const z_dim = rui_location.z_dimension;
      const units = rui_location.dimension_units;
      //10 x 10 x 12 millimeter, 12 millimeter, ffpe_block
      object.description = `${x_dim} x ${y_dim} x ${z_dim} ${units}, ${z_dim} ${units}, `;
      return;
    } else {
      console.log('generated from ancestors');
      for (const ancestor of ancestors) {
        if (ancestor.description) {
          object.description = ancestor.description;
          return;
        }
      }
      throw new Error(
        'Description is missing. Please provide rui_locations or description to parent provider'
      );
    }
  }
}

function ensureId(objectIndex, object, objectType, ...ancestors) {
  if (!object['@id']) {
    for (const ancestor of ancestors) {
      if (ancestor['@id']) {
        object['@id'] = makeId(ancestor['@id'], objectType, objectIndex);
        return;
      }
    }
    throw new Error(
      `Id Missing for ${objectType}[${objectIndex}]. Add an ID to this object or it's parent Donor`
    );
  }
}

function ensureLabel(object, rui_location, ...ancestors) {
  if (!object.label) {
    // Create one
    console.log('creatir ' + rui_location.placement.placement_date);
    var provider_name = '';
    for (const ancestor of ancestors) {
      // Grab the provider name
      if (ancestor.provider_name) {
        provider_name = ancestor.provider_name;
        break;
      }
    }
    const prefix = 'Registered';
    return (object.label = makeLabel(prefix, rui_location, provider_name));
  }
}

function makeLabel(prefix, rui_location, provider_name) {
  const creator = rui_location.creator;
  const date = new Date(rui_location.placement.placement_date);
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();
  return `${prefix} ${month}/${day}/${year}, ${creator}, ${provider_name}`;
}

function makeId(baseIri, objectType, objectIndex) {
  const separator = baseIri.indexOf('#') !== -1 ? '_' : '#';
  return `${baseIri}${separator}${objectType}${objectIndex + 1}`;
}

function* enumerate(arr) {
  for (let i = 0; i < (arr ?? []).length; i++) {
    yield [arr[i], i];
  }
}

export function convertToJsonLd(normalized) {
  const data = {
    '@context': {
      '@base': 'http://purl.org/ccf/latest/ccf-entity.owl#',
      '@vocab': 'http://purl.org/ccf/latest/ccf-entity.owl#',
      ccf: 'http://purl.org/ccf/latest/ccf.owl#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      label: 'rdfs:label',
      description: 'rdfs:comment',
      link: {
        '@id': 'rdfs:seeAlso',
        '@type': '@id',
      },
      samples: {
        '@reverse': 'has_donor',
      },
      sections: {
        '@id': 'has_tissue_section',
        '@type': '@id',
      },
      datasets: {
        '@id': 'has_dataset',
        '@type': '@id',
      },
      rui_location: {
        '@id': 'has_spatial_entity',
        '@type': '@id',
      },
      ontologyTerms: {
        '@id': 'has_ontology_term',
        '@type': '@id',
      },
      cellTypeTerms: {
        '@id': 'has_cell_type_term',
        '@type': '@id',
      },
      thumbnail: {
        '@id': 'has_thumbnail',
      },
    },
    '@graph': [],
  };
  const donors = data['@graph'];

  for (const provider of normalized) {
    for (const donor of provider.donors) {
      const finalDonor = {
        'consortium_name': provider.consortium_name,
        'provider_name': provider.provider_name,
        'provider_uuid': provider.provider_uuid,
        ...donor,
      };
      donors.push(finalDonor);
    }
  }

  return data;
}
