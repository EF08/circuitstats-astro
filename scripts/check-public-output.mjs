import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const roots = process.argv.slice(2);
if (!roots.length) throw new Error('Specify the public build output directory.');
const forbidden = /^(?:AGENTS(?:\.[^.]+)?\.md|CLAUDE(?:\.[^.]+)?\.md|GEMINI\.md|\.agents|\.claude|\.codex)$/i;
const violations = [];
async function scan(root, dir = root) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (forbidden.test(entry.name)) violations.push(relative(root, path));
    else if (entry.isSymbolicLink()) violations.push(relative(root, path) + ' (symlink requires explicit review)');
    else if (entry.isDirectory()) await scan(root, path);
  }
}
for (const root of roots) await scan(root);
if (violations.length) throw new Error('Private instructions in public output: ' + violations.join(', '));
console.log('Public output contains no instruction files or agent configuration directories.');
