import { existsSync } from 'fs';
import { resolve } from 'path';
import sh from 'shelljs';

export function newRegistrations(context) {
  if (!existsSync(context.doPath) || context.overwrite) {
    sh.mkdir('-p', resolve(context.doPath, 'registrations'));
    sh.cp(
      resolve(context.processorHome, 'src/registrations-template.yaml'),
      resolve(context.doPath, 'registrations.yaml')
    );
    sh.cp(resolve(context.processorHome, 'src/ccf-eui-template.html'), resolve(context.doPath, 'index.html'));
  }
}
