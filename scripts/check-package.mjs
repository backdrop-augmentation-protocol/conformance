import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
execSync('npm run spec:install', { stdio: 'inherit' });
execSync('npm run build', { stdio: 'inherit' });
const [{ files }] = JSON.parse(execSync('npm pack --dry-run --json --ignore-scripts', { encoding: 'utf8' }));
const paths = new Set(files.map(file => file.path));
for (const entry of Object.values(pkg.bin)) {
  if (!paths.has(entry.replace(/^\.\//, ''))) throw new Error(`Missing CLI entry: ${entry}`);
}
for (const path of [
  'spec-data/versions/0.1.0/schemas/manifest.schema.json',
  'spec-data/versions/0.1.0/schemas/message.schema.json',
  'spec-data/profiles/we-web-workshop/project.schema.json',
  'spec-data/drafts/0.2.0/index.json',
  'spec-data/drafts/0.2.0/schemas/preset-snapshot.schema.json',
]) {
  if (!paths.has(path)) throw new Error(`Missing bundled spec: ${path}`);
}
if ([...paths].some(path => path.startsWith('src/') || path.startsWith('tests/') || path.startsWith('.github/'))) {
  throw new Error('Development-only files leaked into the package');
}
console.log(`Verified ${pkg.name}: ${paths.size} package files`);
