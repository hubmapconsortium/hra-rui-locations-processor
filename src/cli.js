#!/usr/bin/env node

import { Command } from 'commander';
import { normalizeRegistrations } from './utils/normalizer.js';

const program = new Command();

program
  .command('normalize')
  .description(
    "Mechanically normalizes a Digital Object from it's raw form. Minimally, it converts the source DO type + integrates the metadata into a single linkml-compatible JSON file."
  )
  .argument('<digital-object-path>', 'Path to the digital object relative to DO_HOME')
  .action((str, _options, command) => {
    normalizeRegistrations({ doPath: str });
  });

  program.parse(process.argv);