import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import sh from 'shelljs';
import { normalizeRegistrations } from './main.js';

export function deployDir(context) {
  const { dirPath, deploymentHome, processorHome } = context;

  let mergedRegistrations;
  sh.rm('-rf', resolve(deploymentHome));
  sh.mkdir('-p', resolve(deploymentHome));
  for (const doName of sh.ls(resolve(dirPath))) {
    const doPath = resolve(dirPath, doName);
    normalizeRegistrations({ doPath, processorHome });
    sh.cp('-r', doPath, resolve(deploymentHome, doName));

    const registrations = JSON.parse(readFileSync(resolve(doPath, 'rui_locations.jsonld')));
    if (!mergedRegistrations) {
      mergedRegistrations = registrations;
    } else {
      mergedRegistrations['@graph'] = [...mergedRegistrations['@graph'], ...registrations['@graph']];
    }
  }

  writeFileSync(resolve(deploymentHome, 'rui_locations.jsonld'), JSON.stringify(mergedRegistrations, null, 2));
  sh.cp(resolve(context.processorHome, 'src/ccf-eui-template.html'), resolve(deploymentHome, 'index.html'));
}
