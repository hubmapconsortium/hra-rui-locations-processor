import { existsSync } from 'fs';
import { resolve } from 'path';
import sh from 'shelljs';
import { writeIndexHtml } from '../utils/write-index-html.js';

export function newRegistrations(context) {
  if (!existsSync(context.doPath) || context.overwrite) {
    sh.mkdir('-p', resolve(context.doPath, 'registrations'));
    sh.cp(
      resolve(context.processorHome, 'src/registrations-template.yaml'),
      resolve(context.doPath, 'registrations.yaml')
    );
    writeIndexHtml(context);
  }
}
