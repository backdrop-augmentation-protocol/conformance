import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.env.BAP_SPEC_REF ?? JSON.parse(await readFile(join(root, 'scripts', 'spec-ref.json'), 'utf8')).commit;
const sibling = resolve(root, '..', 'spec');
const explicit = process.env.BAP_SPEC_DIR;
const cache = join(root, '.bap-spec');
const target = join(root, 'spec-data');

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

let source;
for (const directory of [explicit, sibling].filter(Boolean)) {
  try {
    if (git('-C', directory, 'rev-parse', 'HEAD') === ref &&
        !git('-C', directory, 'status', '--porcelain', '--', 'versions/0.1.0', 'profiles/we-web-workshop/project.schema.json', 'drafts/0.2.0')) {
      source = directory;
      break;
    }
  } catch { /* The candidate is not a matching clean spec checkout. */ }
}
if (!source && await readFile(join(cache, '.source-ref'), 'utf8').then(value => value.trim() === ref, () => false)) source = cache;
if (!source) throw new Error(`Pinned spec ${ref} is unavailable; run npm run spec:install in a standalone checkout`);

const required = [
  'versions/0.1.0/schemas',
  'versions/0.1.0/fixtures',
  'profiles/we-web-workshop/project.schema.json',
  'drafts/0.2.0',
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
