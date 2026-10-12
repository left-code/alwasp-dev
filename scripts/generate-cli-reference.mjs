import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = resolve(root, 'scripts/cli-reference/help.json');
const outputPath = resolve(root, 'public/alwasp-cli-reference.html');
const args = process.argv.slice(2);
const allowed = new Set(['--source', '--tag', '--snapshots', '--check']);
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw new Error('Unknown argument: ' + args[i]);
  if (args[i] !== '--check' && (!args[i + 1] || args[i + 1].startsWith('--')))
    throw new Error('Missing value for ' + args[i]);
  if (args[i] !== '--check') i++;
}
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const source = option('--source');
const snapshotDirectory = option('--snapshots');
const tag = option('--tag');
if (source && snapshotDirectory) throw new Error('Use --source or --snapshots, not both.');
if (tag && !source && !snapshotDirectory) throw new Error('--tag requires --source or --snapshots.');
if ((source || snapshotDirectory) && args.includes('--check')) throw new Error('--check cannot refresh snapshots.');

let data;
if (source || snapshotDirectory) {
  if (!tag || !/^v\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(tag)) throw new Error('Supply a released --tag v<version>.');
  let files;
  let readSnapshot;
  if (source) {
    const cwd = resolve(source);
    const git = params => execFileSync('git', params, { cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    // Read the tag directly; never depend on the source checkout or change it.
    files = git(['ls-tree', '--name-only', tag + ':tests/product-contract/help']).trim().split(/\r?\n/);
    readSnapshot = file => git(['show', tag + ':tests/product-contract/help/' + file]);
  } else {
    const { readdir } = await import('node:fs/promises');
    files = await readdir(resolve(snapshotDirectory));
    readSnapshot = file => readFile(resolve(snapshotDirectory, file), 'utf8');
  }
  data = { version: tag.slice(1), help: {} };
  for (const file of files.filter(file => file.endsWith('.txt')).sort())
    data.help[file] = (await readSnapshot(file)).replace(/\r\n/g, '\n');
} else {
  data = JSON.parse(await readFile(dataPath, 'utf8'));
}
const sections = text => {
  const result = {};
  let section;
  for (const line of text.split(/\r?\n/)) {
    if (/^[A-Za-z]+:$/.test(line)) { section = line.slice(0, -1); result[section] = []; }
    else if (line.trim() && section) result[section].push(line.trim());
  }
  return result;
};
const rows = (lines, allowBlank = false) => (lines || []).map(line => {
  const match = line.match(/^(.*?)\s{2,}(.*)$/);
  if (!match) {
    if (allowBlank) return { label: line, description: '' };
    throw new Error('Unrecognized CLI help row: ' + line);
  }
  return { label: match[1], description: match[2] };
});
const used = new Set();
function command(path = []) {
  const key = (path.length ? path.join('-') : 'root') + '.txt';
  if (!data.help[key]) throw new Error('Missing help snapshot: ' + key);
  if (used.has(key)) throw new Error('Duplicate command snapshot: ' + key);
  used.add(key);
  const parsed = sections(data.help[key]);
  if (!parsed.Usage?.length || !parsed.Description?.length) throw new Error('Incomplete snapshot: ' + key);
  return {
    path, description: parsed.Description.join(' '),
    usage: parsed.Usage.join(' ').replace(/^AlWasp\b/, 'alwasp'),
    options: rows(parsed.Options), arguments: rows(parsed.Arguments, true),
    children: rows(parsed.Commands).map(row => command([...path, row.label.split(' ')[0]]))
  };
}
const tree = command();
const unused = Object.keys(data.help).filter(key => !used.has(key));
if (unused.length) throw new Error('Unlinked CLI snapshots: ' + unused.join(', '));
const packageVersion = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version;
// Refresh before npm version during release synchronization. Build/check must match afterward.
if (!source && !snapshotDirectory && data.version !== packageVersion)
  throw new Error('CLI snapshots are ' + data.version + ' but documentation is ' + packageVersion + '. Refresh them at the target release tag.');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const id = node => 'c-' + node.path.join('-');
const table = (labels, entries) => '<div class="table-wrap"><table><thead><tr>' +
  labels.map(label => '<th scope="col">' + esc(label) + '</th>').join('') +
  '</tr></thead><tbody>' + entries.map(row => {
    const required = row.label.includes('(REQUIRED)');
    const label = row.label.replace(/\s*\(REQUIRED\)/, '');
    const defaultValue = row.description.match(/\[default: ([^\]]+)\]/)?.[1];
    return '<tr><td class="f">' + esc(label) + '</td><td>' + esc(row.description.replace(/\s*\[default: [^\]]*\]/, '')) +
      (required ? '<span class="badge req">required</span>' : '') +
      (defaultValue ? '<span class="badge def">default: ' + esc(defaultValue) + '</span>' : '') +
      '</td></tr>';
  }).join('') + '</tbody></table></div>';
const leaves = [];
function card(node) {
  leaves.push(node);
  const searchable = [node.path.join(' '), node.description, ...node.options.map(o => o.label + ' ' + o.description),
    ...node.arguments.map(a => a.label + ' ' + a.description)].join(' ').toLowerCase();
  return '<article class="cmd" id="' + id(node) + '" data-s="' + esc(searchable) + '">' +
    '<h3><a href="#' + id(node) + '">' + esc('alwasp ' + node.path.join(' ')) + '</a></h3><p>' + esc(node.description) + '</p>' +
    '<div class="usage"><span class="dollar" aria-hidden="true">$</span><code>' + esc(node.usage) + '</code>' +
    '<button type="button" class="copy" data-c="' + esc(node.usage) + '" aria-label="Copy usage for ' + esc(node.path.join(' ')) + '">Copy</button></div>' +
    (node.arguments.length ? '<h4>Arguments</h4>' + table(['Argument', 'Description'], node.arguments) : '') +
    (node.options.length ? '<h4>Options</h4>' + table(['Option', 'Description'], node.options) : '') + '</article>';
}
let navigation = '';
let content = '<section class="intro"><h2>Overview</h2><p>' + esc(tree.description) + '</p>' +
  '<p>Reference for ALWasp <strong>v' + esc(data.version) + '</strong>. Browse commands, filter by an option or description, or copy command syntax. ' +
  '<a href="/docs/cli-reference/">Read the CLI guide</a> for workflows and examples.</p>' +
  '<div class="tags">' + tree.children.map(node => '<a href="#' + id(node) + '">' + esc(node.path.join(' ')) + '</a>').join('') + '</div>' +
  '<h4>Root options</h4>' + table(['Option', 'Description'], tree.options) + '</section>';
function descendants(node) {
  return node.children.flatMap(child => child.children.length ? descendants(child) : [child]);
}
for (const node of tree.children) {
  const commands = node.children.length ? descendants(node) : [node];
  navigation += '<a class="g" href="#' + id(node) + '">' + esc(node.path.join(' ')) + '</a>' +
    (node.children.length ? commands.map(child => '<a class="c" href="#' + id(child) + '">' + esc(child.path.slice(1).join(' ')) + '</a>').join('') : '');
  content += '<section class="group"' + (node.children.length ? ' id="' + id(node) + '"' : '') + '>' +
    '<h2><code>' + esc(node.path[0]) + '</code></h2>' +
    (node.children.length ? '<p>' + esc(node.description) + '</p>' : '') + commands.map(card).join('') + '</section>';
}
const template = await readFile(resolve(root, 'scripts/cli-reference/template.html'), 'utf8');
const html = template.replaceAll('{{VERSION}}', esc(data.version)).replace('{{NAV}}', navigation)
  .replace('{{CONTENT}}', content).replaceAll('{{COUNT}}', String(leaves.length));
if (args.includes('--check')) {
  if (html !== await readFile(outputPath, 'utf8')) throw new Error('Visual CLI reference is stale. Run npm run generate:cli-reference.');
  console.log('Visual CLI reference matches v' + data.version + ': ' + leaves.length + ' commands.');
} else {
  if (source || snapshotDirectory) {
    await mkdir(dirname(dataPath), { recursive: true });
    await writeFile(dataPath, JSON.stringify(data, null, 2) + '\n');
  }
  await writeFile(outputPath, html);
  console.log('Generated public/alwasp-cli-reference.html for v' + data.version + ': ' + leaves.length + ' commands.');
}
