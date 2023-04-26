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

    ensureProviderDescription(provider.description);

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

        ensureLabel(blockId, block, ruiLocation, donor);
        ensureDescription(blockId, block, ruiLocation, donor);

        for (const [section, sectionId] of enumerate(block.sections)) {
          //
          ensureId(sectionId, section, block, donor);
          ensureLabel(sectionId, section, ruiLocation, donor);
          ensureDescription(sectionId, section, ruiLocation, donor);

          console.log("jngrjgntrjn")
          for (const [dataset, datasetId] of enumerate(block.datasets ?? [])) {
            //
            console.log("1232312")
            if (!dataset["@type"]) {
              dataset["@type"] = "Dataset"
            }
            ensureId(datasetId, dataset, block, donor);
            ensureLabel(datasetId, dataset, ruiLocation, donor);
            ensureDescription(datasetId, dataset, ruiLocation, donor);
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

function loadFile(dir, file, schema) {
  const path = resolve(dir, file);
  const yaml = load(readFileSync(path));
  return schema.parse(yaml);
}

function ensureProviderDescription(description){ //  First check. If yes, then validate. If not then generate. If invalid, throw error.
  console.log(description)
  const desc = description.split(" ")
  if(desc[0] === "Entered"){
    console.log("Okay")
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

function ensureLabel(objectIndex, object, objectType, ...ancestors) { //  First check. If yes, then validate. If not then generate. If invalid, throw error.
  const tempLabel =  object.label.split(" ")
  if(tempLabel[0] === "Registered"){
    console.log("Yes");
  }


  if (!object.label) {
    for (const ancestor of ancestors) {
      if (ancestor.label) {
        object.label = ancestor.label;
        return;
      }
    }
    throw new Error(
      `Label missing for ${objectType}[${objectIndex}]. Add an label to this object or it's parent Donor`
    );
  }
}

function ensureDescription(objectIndex, object, objectType, ...ancestors) {  //  First check. If yes, then validate. If not then generate. If invalid, throw error.
  if (!object.description) {
    for (const ancestor of ancestors) {
      if (ancestor.description) {
        object.description = ancestor.description;
        return;
      }
    }
    throw new Error(
      `Description missing for ${objectType}[${objectIndex}]. Add an Description to this object or it's parent Donor`
    );
  }
}

function makeId(baseIri, objectType, objectIndex) {
  console.log(baseIri)
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