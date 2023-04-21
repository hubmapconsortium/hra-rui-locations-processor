#!/usr/bin/env node

import { Command } from 'commander';
import { normalizeRegistrations } from './core/normalizer.js';
import { saveJsonSchema } from './core/json-schema.js';

const program = new Command();

program
  .command('normalize')
  .description(
    "Mechanically normalizes a Digital Object from it's raw form. Minimally, it converts the source DO type + integrates the metadata into a single linkml-compatible JSON file."
  )
  .argument('<digital-object-path>', 'Path to the digital object relative to DO_HOME')
  .action((str) => {
    normalizeRegistrations({ doPath: str });
  });

program
  .command('json-schema')
  .description('Exports the JSON Schema used to validate registrations.yaml files')
  .argument('<output path>', 'Path for storing the json schema')
  .action((str) => {
    saveJsonSchema(str);
  })

program.parse(process.argv);