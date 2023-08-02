#!/usr/bin/env node

import { Command } from 'commander';
import { deployDir } from './core/deploy-dir.js';
import { saveJsonSchema } from './core/json-schema.js';
import { newRegistrations } from './core/new-registrations.js';
import { normalizeRegistrations } from './core/main.js';
import { getProcessorHome } from './utils/source-info.js';

const program = new Command();

program
  .command('new')
  .description('Start a new registrations digital object')
  .argument('<digital-object-path>')
  .option('--overwrite', 'Overwrite the directory if it exists')
  .action((str, options) => {
    newRegistrations({
      ...options,
      doPath: str,
      processorHome: getProcessorHome(),
    });
  });

program
  .command('normalize')
  .description(
    "Normalizes a registrations digital object from it's raw form. Minimally, it converts the source DO type + integrates the metadata into a single HRA v1.x JSON-LD file."
  )
  .argument('<digital-object-path>', 'Path to the digital object')
  .option('--base-iri <string>', 'Base IRI for Digital Objects')
  .action((str, str1) => {
    normalizeRegistrations({ doPath: str, processorHome: getProcessorHome(), str1 });
  });

program
  .command('deploy-dir')
  .description(
    'Normalizes a directory of registrations and creates a distribution for publishing.'
  )
  .argument(
    '<digital-objects-folder>',
    'Path to a folder containing multiple digital objects'
  )
  .argument(
    '<deploy-dir>',
    'Path to a folder containing multiple digital objects'
  )
  .action((str, str2) => {
    deployDir({
      dirPath: str,
      deploymentHome: str2,
      processorHome: getProcessorHome(),
    });
  });

program
  .command('json-schema')
  .description(
    'Exports the JSON Schema used to validate registrations.yaml files'
  )
  .argument('<output path>', 'Path for storing the json schema')
  .action((str) => {
    saveJsonSchema(str);
  });

program.parse(process.argv);
