#!/usr/bin/env node

import { Command } from 'commander';
import { normalizeRegistrations } from './core/normalizer.js';
import { saveJsonSchema } from './core/json-schema.js';

const program = new Command();

program
  .command('new')
  .description('Start a new experimental dataset')
  .argument('<digital-object-path>')
  .action((str) => {});

program
  .command('normalize')
  .description(
    "Normalizes a Digital Object from it's raw form. Minimally, it converts the source DO type + integrates the metadata into a single HRA v1.x JSON-LD file."
  )
  .argument(
    '<digital-object-path>',
    'Path to the digital object relative to DO_HOME'
  )
  .action((str) => {
    normalizeRegistrations({ doPath: str });
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
