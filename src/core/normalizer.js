import { readFileSync, writeFileSync } from 'fs';
import { load } from 'js-yaml';
import { resolve } from 'path';
import sh from 'shelljs';
import { Providers } from '../utils/data-schema.js';
import { SpatialEntity } from '../utils/spatial-schema.js';
import { importCsv } from './csv-normalizer.js';
import { importFromList } from './import-list-normalizer.js';


/** The default order that properties should show in objects */
const DEFAULT_PROPERTY_ORDER = [
  '@id',
  '@type',
  'sample_type',
  'label',
  'description',
  'link',
  'section_count',
  'section_size',
  'rui_location',
];

/**
 * This function normalizes the registration data from a YAML file to a JSON-LD format and writes it to a file as output.
 *  @param { string } context - The directory path of registration.yaml file.
 */
export async function normalizeRegistrations(context) {
  const ruiLocationsDir = resolve(context.doPath, 'registrations');
  const data = loadFile(context.doPath, 'registrations.yaml', Providers);
  const normalized = await normalizeRegistration(data, ruiLocationsDir);
  //CSV Normalization
  let csv_normalized = ''
  for (const csv of data) {
    if (csv.import_from_csv) {
      console.log(csv.import_from_csv)
      csv_normalized = await importCsv(csv.import_from_csv, csv.fields, csv.baseIri);
    }
  }

  //Importing from list (web or local) files using filters
  let import_list_normalized = ''
  for (const import_list of data) {
    if (import_list.imports) {
      console.log(import_list.imports)
      import_list_normalized = await importFromList(import_list.imports, import_list.filter);
    }
  }


  const final = convertToJsonLd(normalized, csv_normalized, import_list_normalized);

  const ruiLocationsOutputPath = resolve(
    context.doPath,
    'rui_locations.jsonld'
  );
  writeFileSync(ruiLocationsOutputPath, JSON.stringify(final, null, 2));
  sh.cp(
    resolve(context.processorHome, 'src/ccf-eui-template.html'),
    resolve(context.doPath, 'index.html')
  );
}

/**
 * This function ensures the registration.yaml file has id, label, description, and link at Provider, Donor, Section, Block and Dataset levels.
 * If not, it creates one.
 * @param { string } data - The data which has to be normalized, here, the contents of registrations.yaml file which has the provider data.
 * @param { string } ruiLocationsDir - The directory where rui_locations can be found, if file name is mentioned in registration.yaml file.
 */
export async function normalizeRegistration(data, ruiLocationsDir) {

  for (const provider of data) {
    if (provider.defaults) {
      if (!provider.defaults.thumbnail) {
        provider.defaults.thumbnail = 'assets/icons/ico-unknown.svg';
      }
    }
    for (const [donor, donorId] of enumerate(provider.donors)) {
      donor['@type'] = 'Donor';

      for (const [block, blockId] of enumerate(donor.samples)) {
        block['@type'] = 'Sample';
        block['sample_type'] = 'Tissue Block';

        const ruiLocation = ensureRuiLocation(block, ruiLocationsDir);

        ensureId(
          donorId,
          donor,
          'Donor',
          provider,
          provider.defaults ? provider.defaults : ''
        );
        ensureDonorLabel(donor, block);
        ensureDescription(donor, ruiLocation, provider);
        ensureLink(donor, provider, provider.defaults ? provider.defaults : '');

        ensureId(
          blockId,
          block,
          'TissueBlock',
          donor,
          provider,
          provider.defaults ? provider.defaults : ''
        );
        ensureLabel(block, ruiLocation, donor, provider);
        ensureLink(
          block,
          donor,
          provider,
          provider.defaults ? provider.defaults : ''
        );
        ensureSampleDescription(block, ruiLocation, provider);
        ensureSectionCount(block);
        ensureDatasets(
          block.datasets,
          `TissueBlock${blockId + 1}`,
          provider,
          donor,
          block,
          ruiLocation
        );
        ensurePropertyOrder(block, donor.samples);

        for (const [section, sectionId] of enumerate(block.sections)) {
          section['@type'] = 'Sample';
          section['sample_type'] = 'Tissue Section';

          ensureId(
            sectionId,
            section,
            'TissueSection',
            block,
            donor,
            provider,
            provider.defaults ? provider.defaults : ''
          );
          ensureLabel(section, ruiLocation, donor, provider);
          ensureSampleDescription(section, ruiLocation, donor, provider);
          ensureLink(
            section,
            block,
            donor,
            provider,
            provider.defaults ? provider.defaults : ''
          );
          ensureDatasets(
            section.datasets,
            `TissueSection${sectionId + 1}`,
            provider,
            donor,
            block,
            ruiLocation
          );
          ensurePropertyOrder(section, block.sections);
        }
        ensurePropertyOrder(donor, provider.donors);
      }
    }
  }

  return data;
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
 * This function ensures that the object in the container has the right property order.
 * @param { object } obj
 * @param { object[] } container
 * @param { string[] } propOrder
 */
function ensurePropertyOrder(
  obj,
  container,
  propOrder = DEFAULT_PROPERTY_ORDER
) {
  const newObj = {};
  for (const prop of propOrder) {
    newObj[prop] = obj[prop];
  }
  Object.assign(newObj, obj);
  container[container.indexOf(obj)] = newObj;
}

/**
 * This function ensures all datasets have proper info for both block and section datasets.
 * @param { object[] } container
 * @param { object } provider
 * @param { object } donor
 * @param { object } block
 * @param { object } ruiLocation
 */
function ensureDatasets(
  container,
  idPrefix,
  provider,
  donor,
  block,
  ruiLocation
) {
  for (const [dataset, datasetId] of enumerate(container ?? [])) {
    dataset['@type'] = 'Dataset';
    ensureId(
      datasetId,
      dataset,
      `${idPrefix}_Dataset`,
      block,
      donor,
      provider,
      provider.defaults ? provider.defaults : ''
    );
    ensureLabel(dataset, ruiLocation, donor, provider);
    ensureDatasetDescription(dataset);
    ensureLink(
      dataset,
      block,
      donor,
      provider,
      provider.defaults ? provider.defaults : ''
    );
    ensurePropertyOrder(dataset, container);
  }
}

/**
 * This function validates the rui_location file if it is passed as a file name in JSON format in the registration.yaml file.
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

/**
 * This function ensures the link is mentioned. If not, it generates it from ancestors(It searches upwards in the registration.yaml file or till the provider level)
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

/**
 * This function ensures the description is mentioned. If not it creates one from rui_locations, and providers.
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

/**
 * This function ensures the section count is mentioned. If not, it will count the sections and add the length in appropriate block
 * @param { object } block - The block object where sections and section count is present.
 */
function ensureSectionCount(block) {
  if (!block.section_count) {
    block.section_count = block.sections?.length ?? 0;
  }
}

/**
 * This function generates label if not present.
 * @param { object } donor - The donor object where label has to be generated which contains Age, Sex, and BMI.
 * @param { object } block - If the donor object does not have Age, Sex, and BMI then the block label will be used.
 */
function ensureDonorLabel(donor, block) {
  if (!donor.label) {
    let newLabel = '';
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
    return (donor.label = newLabel);
  }
}

/**
 * This function ensures the dataset description is mentioned.
 * @param { object } object - The dataset object where the description will be generated if absent.
 */
function ensureDatasetDescription(object) {
  if (!object.description) {
    object.description = 'Data/Assay Types: ' + object.technology + ', ';
    return;
  }
}

/**
 * This function ensures the section description is present. If not, it will be generated.
 * @param { object } object - The section object where the section will be generated if absent.
 * @param { object } rui_location - The rui_location object from where the dimensions will be fetched if section is absent.
 * @param { [object] } ancestors - The array of ancestors to fetch the description if the rui_location is absent.
 */
function ensureSampleDescription(object, rui_location, ...ancestors) {
  if (!object.description) {
    if (rui_location.x_dimension) {
      // Generate from rui_location
      const x_dim = rui_location.x_dimension;
      const y_dim = rui_location.y_dimension;
      const z_dim = rui_location.z_dimension;
      const units = rui_location.dimension_units;
      object.description = `${x_dim} x ${y_dim} x ${z_dim} ${units}, ${z_dim} ${units}`;
      object.section_size = z_dim;
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

/**
 * This function will ensure id is present. If not, it will be fetched from ancestors. And also convert id to JSONld format(@id)
 * @param { number } objectIndex - The index # of the object which has to be appended at the last of generated Id.
 * @param { object } object - The object for which the id has to generated if absent.
 * @param { objectType } objectType - The type of object
 * @param { [object] } ancestors - If the id is absent, then the id will be fetched from ancestors, and then it will be created for the object.
 */
function ensureId(objectIndex, object, objectType, ...ancestors) {
  if (!object.id) {
    for (const ancestor of ancestors) {
      if (ancestor.id || ancestor['@id']) {
        object['@id'] = makeId(
          ancestor.id ? ancestor.id : ancestor['@id'],
          objectType,
          objectIndex
        );
        return;
      }
    }
    throw new Error(
      `Id Missing for ${objectType}[${objectIndex}]. Add an ID to this object or it's parent Donor`
    );
  }
  if (object.id && !object['@id']) {
    object['@id'] = object.id;
    delete object.id;
  }
}

/**
 * This function is used to generate label if it is absent.
 * @param { object } object - The object for which the label has to be ensured.
 * @param { object } rui_location - The rui_location object from where the creator name, and date will be fetched to generate label if absent.
 * @param { [object] } ancestors - If the label is absent, then the provider name will be fetched from ancestors.
 */
function ensureLabel(object, rui_location, ...ancestors) {
  if (!object.label) {
    // Create one
    let provider_name = '';
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

/**
 * This function  is used to make label for the object passed
 * @param { string } prefix - It can be either Entered or Registered. Only for the provider level, the description starts with Entered. For rest, it starts with Registered.
 * @param { object } rui_location - The rui_location object from where the creator, and date will be fetched.
 * @param { string } provider_name - The name of provider.
 */
function makeLabel(prefix, rui_location, provider_name) {
  const creator = rui_location.creator;
  const date = new Date(rui_location.placement.placement_date);
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();
  return `${prefix} ${month}/${day}/${year}, ${creator}, ${provider_name}`;
}

/**
 * This function makes id
 * @param { string } baseIri - It is the base URL. It can be from donor or dataset level.
 * @param { string } objectType  - The type of object
 * @param { number } objectIndex - The index number of the object. This number will be appended at the last.
 */
function makeId(baseIri, objectType, objectIndex) {
  const separator = baseIri.indexOf('#') !== -1 ? '_' : '#';
  return `${baseIri}${separator}${objectType}${objectIndex + 1}`;
}

/**
 * Enumerator function. It iterates throught the array and yields the index number and element from the array.
 * @param { Array } arr - An array of elements.
 */
function* enumerate(arr) {
  for (let i = 0; i < (arr ?? []).length; i++) {
    yield [arr[i], i];
  }
}

/**
 * This function is used to convert the above generated schema to JsonLd format.
 * @param { object } data - The data, which was ensured above, and which needs to be converted to JsonLd format.
 */
export function convertToJsonLd(normalized, csv_normalized, import_list_normalized) {
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
  // console.log(normalized)

  for (const provider of normalized) {
    if (provider.donor) {
      const providerDonors = provider.donors.map((donor) => ({
        consortium_name: provider.consortium_name,
        provider_name: provider.provider_name,
        provider_uuid: provider.provider_uuid,
        ...donor,
      }));
      providerDonors.forEach((donor) =>
        ensurePropertyOrder(donor, providerDonors)
      );
      providerDonors.forEach((donor) => donors.push(donor));
    }
  }

  donors.push(csv_normalized);
  donors.push(import_list_normalized);

  return data;
}
