import { load } from "js-yaml";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Providers } from "../utils/data-schema.js";
import { SpatialEntity } from "../utils/spatial-schema.js";

export function normalizeRegistrations(context) {
  const ruiLocationsDir = resolve(context.doPath, "registrations");
  const data = loadFile(context.doPath, "registrations.yaml", Providers);
  const normalized = normalizeRegistrations(data, ruiLocationsDir);

  // const normalizedPath = resolve(context.doPath, 'normalized.yaml');
  // writeFileSync(normalizedPath, dump(normalized));

  const ruiLocationsOutputPath = resolve(
    context.doPath,
    "rui_locations.jsonld"
  );
  writeFileSync(ruiLocationsOutputPath, JSON.stringify(normalized, null, 2));
}

export function normalizeRegistrations(data, ruiLocationsDir) {
  const warnings = new Set();
  for (const provider of data) {
    for (const donor of provider.donors) {
      //

      for (const [block, blockId] of enumerate(donor.blocks)) {
        ensureId(blockId, block, donor);
        if (typeof block.rui_location === "string") {
          block.rui_location = loadFile(
            ruiLocationsDir,
            block.rui_location,
            SpatialEntity
          );
        }
        const ruiLocation = block.rui_location;

        // ensureLabel(blockId, block, ruiLocation, donor);
        // ensureDescription(blockId, block, ruiLocation, donor);

        for (const [section, sectionId] of enumerate(block.sections)) {
          //
          ensureId(sectionId, section, block, donor);

          for (const dataset of section.datasets ?? []) {
            //
          }
        }

        for (const dataset of block.datasets ?? []) {
          //
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
    for (const donor of provider.donors) {
      const newDonor = {

      }
      donors.push(newDonor);
    }
  }

  return data;
}

function loadFile(dir, file, schema) {
  const path = resolve(dir, file);
  const yaml = load(readFileSync(path));
  return schema.parse(yaml);
}

function ensureId(objectIndex, object, objectType, ...ancestors) {
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

function ensureLabel()

function makeId(baseIri, objectType, objectIndex) {
  const separator = baseIri.contains("#") ? "_" : "#";
  return `${baseIri}${separator}${objectType}${objectIndex + 1}`;
}

function* enumerate(arr) {
  for (let i = 0; i < (arr ?? []).length; i++) {
    yield [arr[i], i];
  }
}
