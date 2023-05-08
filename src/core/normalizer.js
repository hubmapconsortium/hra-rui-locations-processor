import { readFileSync, writeFileSync } from 'fs';
import { load } from 'js-yaml';
import { resolve } from 'path';
import sh from 'shelljs';
import { Providers } from '../utils/data-schema.js';
import { SpatialEntity } from '../utils/spatial-schema.js';

/** This function normalizes the registration data from a YAML file to a JSON-LD format and writes it to a file as output.
 *  @param { string }  context  - The directory path of registration.yaml file.
 */
export function normalizeRegistrations(context) {
  const ruiLocationsDir = resolve(context.doPath, 'registrations');
  const data = loadFile(context.doPath, 'registrations.yaml', Providers);
  const normalized = normalizeRegistration(data, ruiLocationsDir);

  const final = convertToJsonLd(normalized);

  const ruiLocationsOutputPath = resolve(
    context.doPath,
    'rui_locations.jsonld'
  );
  writeFileSync(ruiLocationsOutputPath, JSON.stringify(final, null, 2));
  sh.cp('ccf-eui-template.html', resolve(context.doPath, 'index.html'))
}

/** This function ensures the registration.yaml file has id, label, description, and link at Provider, Donor, Section, Block and Dataset levels. 
 * If not, it creates one.
 * @param { string } data - 
 */
export function normalizeRegistration(data, ruiLocationsDir) {
  const warnings = new Set();
  for (const provider of data) {
    if(provider.defaults)
      if(!provider.defaults.thumbnail){
        provider.defaults.thumbnail = 'assets/icons/ico-unknown.svg';
    }
    for (const donor of provider.donors) {
      donor['@type'] = 'Donor';

      for (const [block, blockId] of enumerate(donor.samples)) {
        block['@type'] = 'Sample';
        block['sample_type'] = 'Tissue Block';

        const ruiLocation = ensureRuiLocation(block, ruiLocationsDir);

        ensureDonorLabel(donor, block);
        ensureDescription(donor, ruiLocation, provider);
        ensureLink(donor, provider, provider.defaults ? provider.defaults : '');

        ensureId(blockId, block, '', donor, provider, provider.defaults ? provider.defaults : '');
        ensureLabel(block, ruiLocation, donor, provider);
        ensureLink(block, donor, provider, provider.defaults ? provider.defaults : '');
        ensureDescription(provider, ruiLocation, provider);

        for (const [section, sectionId] of enumerate(block.sections)) {
          section['@type'] = 'Sample';
          section['sample_type'] = 'Tissue Section';

          ensureId(sectionId, section, block, donor, provider, provider.defaults ? provider.defaults : '');
          ensureLabel(section, ruiLocation, donor, provider);
          ensureSectionDescription(section, ruiLocation, donor, provider);
          ensureLink(section, block, donor, provider, provider.defaults ? provider.defaults : '');
          ensureSectionCount(block);

          for (const [dataset, datasetId] of enumerate(block.datasets ?? [])) {
            dataset['@type'] = 'Dataset';

            ensureId(datasetId, dataset, block, donor, provider, provider.defaults ? provider.defaults : '');
            ensureLabel(dataset, ruiLocation, donor, provider);
            ensureDatasetDescription(dataset);
            ensureLink(dataset, block, donor, provider, provider.defaults ? provider.defaults : '');
          }
        }
      }
    }
  }

  return data;
}

/** This function loads the file, and valdiates it with schema.
 * @param { string } dir - The directory of file
 * @param { string } file - The name of file
 * @param { string } schema - The Zod schema with which the file has to be validated.
 */
function loadFile(dir, file, schema) {
  const path = resolve(dir, file);
  const yaml = load(readFileSync(path));
  return schema.parse(yaml);
}

/** This function validates the rui_location file if it is passed as a file name in JSON format in the registration.yaml file.
 * @param { string } block - This is the block object which contains rui_locations
 * @param { string } ruiLocationsDir - The directory where rui_location JSON file exists.
 */
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

/** This function ensures the link is mentioned. If not, it generates it from ancestors(It searches upwards in the registration.yaml file or till the provider level)
 * @param {Object} object - The object where link has to checked
 * @param {[Object]} ancestors  - The hierarchial structures to the top from where the link can be fetched.
 */
function ensureLink(object, ...ancestors) {
  if (!object.link) {
    for (const ancestor of ancestors) {
      if (ancestor.link) {
        object.link = ancestor.link;
        return;
      }
    }
    throw new Error(
      ' Link is missing. Please provide a link for the object or its parent Donor'
    );
  }
}

/** This function ensures the description is mentioned. If not it creates one from rui_locations, and providers. 
 * @param { object } object - the object where description has to be checked
 * @param { object } rui_location  - THe rui_location object from where the creator name and date can be fetched if discription is missing
 * @param { object } provider - The provider object to fetch the provider name if description is missing.  
*/
function ensureDescription(object, rui_location, provider) {
  if (!object.description) {
    const prefix = 'Entered';
    object.description = makeLabel(
      prefix,
      rui_location,
      provider.provider_name
    );
  }
}

function ensureSectionCount(block) {
  if (!block.section_count && block.sections) {
    return block.section_count = block.sections.length;
  }
    return;
  
}

function ensureDonorLabel(donor, block) {
  if (!donor.label) {
    var newLabel = '';
    if (donor.sex) {
      newLabel += donor.sex;
    }
    if (donor.age) {
      newLabel += ', Age ' + donor.age;
    }
    if (donor.bmi) {
      newLabel += ', BMI ' + donor.bmi;
    }
    if (newLabel === '') {
      newLabel = block.label;
    }
    return donor.label = newLabel;
  }
}

function ensureDatasetDescription(object) {
  if (!object.description) {
    object.description = 'Data/Assay Types: ' + object.technology + ', ';
    return;
  }
}

function ensureSectionDescription(object, rui_location, ...ancestors) {
  if (!object.description) {
    if (rui_location.x_dimension) {
      // Generate from rui_location
      const x_dim = rui_location.x_dimension;
      const y_dim = rui_location.y_dimension;
      const z_dim = rui_location.z_dimension;
      const units = rui_location.dimension_units;
      object.description = `${x_dim} x ${y_dim} x ${z_dim} ${units}, ${z_dim} ${units}, `;
      object.section_size = z_dim
      return;
    } else {
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
  if (object.id && !object['@id']) {
    object['@id'] = object['id'];
    delete object['id'];
  }
  if (!object.id) {
    for (const ancestor of ancestors) {
      if (ancestor.id) {
        object.id = makeId(ancestor.id, objectType, objectIndex);
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
