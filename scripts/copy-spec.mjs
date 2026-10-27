import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ref = JSON.parse(await readFile(join(root, 'scripts', 'spec-ref.json'), 'utf8')).commit;
const sibling = resolve(root, '..', 'spec');
const cache = join(root, '.bap-spec');
const target = join(root, 'spec-data');

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

let source;
try {
  if (git('-C', sibling, 'rev-parse', 'HEAD') === ref &&
      !git('-C', sibling, 'status', '--porcelain', '--', 'versions/0.1.0', 'profiles/we-web-workshop/project.schema.json')) source = sibling;
} catch { /* A standalone checkout has no sibling spec repository. */ }
if (!source && await readFile(join(cache, '.source-ref'), 'utf8').then(value => value.trim() === ref, () => false)) source = cache;
if (!source) throw new Error(`Pinned spec ${ref} is unavailable; run npm run spec:install in a standalone checkout`);

const required = [
  'versions/0.1.0/schemas',
  'versions/0.1.0/fixtures',
  'profiles/we-web-workshop/project.schema.json',
];
for (const path of required) await stat(join(source, path)).catch(() => {
  throw new Error(`Pinned spec is missing ${path}`);
});
await rm(target, { recursive: true, force: true });
for (const path of required) {
  const destination = join(target, path);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(source, path), destination, { recursive: true });
}
await writeFile(join(target, '.source-ref'), `${ref}\n`);
console.log(`Bundled BAP spec ${ref} from ${source}`);
