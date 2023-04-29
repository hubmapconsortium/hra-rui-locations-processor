import { load } from "js-yaml";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Providers } from "../utils/data-schema.js";
import { SpatialEntity, temp } from "../utils/spatial-schema.js";

export function normalizeRegistrations(context) {
  const ruiLocationsDir = resolve(context.doPath, "registrations");
  const data = loadFile(context.doPath, "registrations.yaml", Providers);
  const normalized = normalizeRegistration(data, ruiLocationsDir);

  const final = convertToJsonLd(normalized);

  // const normalizedPath = resolve(context.doPath, 'normalized.yaml');
  // writeFileSync(normalizedPath, dump(normalized));

  const ruiLocationsOutputPath = resolve(
    context.doPath,
    "rui_locations.jsonld"
  );
  writeFileSync(ruiLocationsOutputPath, JSON.stringify(final, null, 2));
}

export function normalizeRegistration(data, ruiLocationsDir) {
  const warnings = new Set();
  for (const provider of data) {
    for (const donor of provider.donors) {
      for (const [block, blockId] of enumerate(donor.blocks)) {
        const ruiLocation = ensureRuiLocation(block, ruiLocationsDir);

        ensureId(blockId, block, donor);
        ensureLabel(block, ruiLocation, donor, provider);
        ensureProviderDescription(provider, ruiLocation);
        ensureLink(block)

        for (const [section, sectionId] of enumerate(block.sections)) {
          if (!section["@type"]) {
            section["@type"] = "Sample"
          }
          ensureId(sectionId, section, block, donor);
          ensureLabel(section, ruiLocation, donor, provider);
          ensureLink(section)

          for (const [dataset, datasetId] of enumerate(block.datasets ?? [])) {
            if (!dataset["@type"]) {
              dataset["@type"] = "Dataset"
            }
            ensureId(datasetId, dataset, block, donor);
            ensureLabel(dataset, ruiLocation, donor, provider);
            ensureLink(dataset)
          }
        }
      }
    }
  }

  // for(const provider of providerIter(data)){
  //   if(!(provider.description)){
  //     for(const block of blockIter(data)){
  //       provider.description = 'Entered '+ block.rui_location.creation_date + ", " +block.rui_location.creator +", "+provider.provider_name;
  //     }
  //   }
  //   if (!(provider.default_dataset_technology)){
  //     for(const dataset of datasetIter(data)){
  //       provider.default_dataset_technology = dataset.technology;
  //     }
  //   }
  //   if(!(provider.link)){
  //     for(const dataset of datasetIter(data)){
  //       provider.link = dataset.link;
  //     }
  //   }
  //   if(!(provider.thumbnail)){
  //     for(const dataset of datasetIter(data)){
  //       provider.thumbnail = dataset.thumbnail;
  //     }
  //   }
  // }
  return data;
}

function loadFile(dir, file, schema) {
  const path = resolve(dir, file);
  const yaml = load(readFileSync(path));
  return schema.parse(yaml);
}

function ensureRuiLocation(block, ruiLocationsDir) {
  if (typeof block.rui_location === "string") {
    block.rui_location = loadFile(
      ruiLocationsDir,
      block.rui_location,
      SpatialEntity
    );
  }
  return block.rui_location;
}
function ensureLink(object) {
  console.log(object['@id'])
  if (!object.link) {
    const prefix = "https://portal.hubmapconsortium.org/browse/dataset/"
    const dataset_id = object['@id'].split("/");
    return object.link = prefix + dataset_id[dataset_id.length - 1]
  }
}
function ensureProviderDescription(provider, rui_location) {
  if (!provider.description) {
    console.log("Generated Desc")
    const prefix = "Entered"
    provider.description = makeLabel(prefix, rui_location, provider.provider_name)
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
  if (!object.label) { // Create one
    console.log("creatir " + rui_location.placement.placement_date)
    var provider_name = ''
    for (const ancestor of ancestors) { // Grab the provider name
      if (ancestor.provider_name) {
        provider_name = ancestor.provider_name;
        break;
      }
    }
    const prefix = "Registered"
    return object.label = makeLabel(prefix, rui_location, provider_name)
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
  const separator = baseIri.indexOf("#") !== -1 ? "_" : "#";
  return `${baseIri}${separator}${objectType}${objectIndex + 1}`;
}

function* enumerate(arr) {
  for (let i = 0; i < (arr ?? []).length; i++) {
    yield [arr[i], i];
  }
}

export function convertToJsonLd(normalized) {
  const data = {
    "@context": {
      "@base": "http://purl.org/ccf/latest/ccf-entity.owl#",
      "@vocab": "http://purl.org/ccf/latest/ccf-entity.owl#",
      ccf: "http://purl.org/ccf/latest/ccf.owl#",
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      label: "rdfs:label",
      description: "rdfs:comment",
      link: {
        "@id": "rdfs:seeAlso",
        "@type": "@id",
      },
      samples: {
        "@reverse": "has_donor",
      },
      sections: {
        "@id": "has_tissue_section",
        "@type": "@id",
      },
      datasets: {
        "@id": "has_dataset",
        "@type": "@id",
      },
      rui_location: {
        "@id": "has_spatial_entity",
        "@type": "@id",
      },
      ontologyTerms: {
        "@id": "has_ontology_term",
        "@type": "@id",
      },
      cellTypeTerms: {
        "@id": "has_cell_type_term",
        "@type": "@id",
      },
      thumbnail: {
        "@id": "has_thumbnail",
      },
    },
    "@graph": [],
  };
  const donors = data['@graph'];

  for (const provider of normalized) {
    donors.push(provider);
    for (const donor of provider.donors) {
      const finalDonor = {
        ...provider,
        ...donor,
      }
      // donors.push(finalDonor);
    }
  }

  return data;
}