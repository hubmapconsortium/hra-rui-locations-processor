import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Generates the MD5 hash of a stringified object.
 * @param { Object } obj - The object to be hashed.
 * @returns { string } - The MD5 hash as a string.
 */
function getObjectMd5(obj) {
  const jsonString = JSON.stringify(obj);
  return createHash('md5').update(jsonString).digest('hex');
}

/**
 * Writes an HTML file to the specified output path, optionally appending an MD5 hash
 * to the `rui_locations.jsonld` reference in the template.
 *
 * @param { Object } context - The context object containing paths for processing.
 * @param { string } context.processorHome - The base directory for the processor.
 * @param { string } context.doPath - The directory where the output file will be written.
 * @param { Object | undefined } [rui_locations] - An optional object representing RUI locations.
 * If provided, its MD5 hash will be appended to the `rui_locations.jsonld` reference in the template.
 * @returns { void }
 */
export function writeIndexHtml(context, rui_locations = undefined) {
  const template = resolve(context.processorHome, 'src/ccf-eui-template.html');
  const outputPath = resolve(context.doPath, 'index.html');

  let html = readFileSync(template, 'utf8');
  if (rui_locations) {
    const md5 = getObjectMd5(rui_locations);
    html = html.replace('rui_locations.jsonld', `rui_locations.jsonld#${md5}`);
  }

  writeFileSync(outputPath, html);
}
