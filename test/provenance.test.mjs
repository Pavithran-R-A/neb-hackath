import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const modulePath = new URL('../src/provenance.mjs', import.meta.url);
const generatorPath = fileURLToPath(new URL('../scripts/build-manifest.mjs', import.meta.url));
async function fixture(t, git = false) {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'receipt-provenance-'));
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  await mkdir(path.join(rootDir, 'src'));
  await mkdir(path.join(rootDir, 'scripts'));
  await writeFile(path.join(rootDir, 'src/main.mjs'), 'export const answer = 42;\n');
  await writeFile(path.join(rootDir, 'scripts/start.mjs'), '// start\n');
  await writeFile(path.join(rootDir, 'package.json'), '{"type":"module"}\n');
  await writeFile(path.join(rootDir, 'package-lock.json'), '{}\n');
  if (git) {
    runGit(rootDir, 'init', '-q');
    runGit(rootDir, 'add', '.');
    runGit(rootDir, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
  }
  return rootDir;
}
function runGit(rootDir, ...args) { return execFileSync('git', ['-C', rootDir, ...args], { encoding: 'utf8' }).trim(); }
async function create(options) { const { createProvenance } = await import(modulePath); return createProvenance(options); }
async function capture(rootDir) {
  const provenance = await create({ rootDir });
  const manifest = { schemaVersion: 1, sourceCommit: provenance.sourceCommit, sourceCommitBasis: provenance.sourceCommitBasis,
    codeTreeDirty: provenance.codeTreeDirty, runtimeSha256: provenance.runtimeSha256, filesSha256: provenance.filesSha256 };
  await writeFile(path.join(rootDir, 'src/build-manifest.json'), JSON.stringify(manifest));
  return manifest;
}

test('hashes sorted runtime inputs and ignores secrets, caches and generated manifest', async t => {
  const rootDir = await fixture(t);
  const first = await create({ rootDir });
  assert.deepEqual(Object.keys(first.filesSha256), ['package-lock.json', 'package.json', 'scripts/start.mjs', 'src/main.mjs']);
  assert.match(first.runtimeSha256, /^[a-f0-9]{64}$/);
  assert.equal(first.sourceCommit, null);
  assert.equal(first.sourceCommitBasis, 'unknown');
  assert.equal(first.codeTreeDirty, null);
  assert.equal(first.runtimeMatchesBuild, null);
  await writeFile(path.join(rootDir, '.env'), 'TOP_SECRET=never-read');
  await mkdir(path.join(rootDir, '.cache'));
  await writeFile(path.join(rootDir, '.cache/secret'), 'never-read');
  await mkdir(path.join(rootDir, 'src/.cache'));
  await writeFile(path.join(rootDir, 'src/.cache/secret'), 'never-read');
  await writeFile(path.join(rootDir, 'src/.env'), 'never-read');
  const second = await create({ rootDir });
  assert.equal(second.runtimeSha256, first.runtimeSha256);
  assert.equal(JSON.stringify(second).includes('never-read'), false);
  await capture(rootDir);
  assert.equal((await create({ rootDir })).runtimeSha256, first.runtimeSha256);
});

test('uses actual Git HEAD and runtime dirty status independently of supplied commit claims', async t => {
  const rootDir = await fixture(t, true);
  const head = runGit(rootDir, 'rev-parse', 'HEAD');
  const clean = await create({ rootDir });
  assert.equal(clean.sourceCommit, head);
  assert.equal(clean.sourceCommitBasis, 'git-head');
  assert.equal(clean.codeTreeDirty, false);
  const claim = await create({ rootDir, sourceCommit: 'f'.repeat(40) });
  assert.equal(claim.sourceCommit, 'f'.repeat(40));
  assert.equal(claim.sourceCommitBasis, 'operator-claim');
  assert.equal(claim.codeTreeDirty, false);
  await writeFile(path.join(rootDir, 'README.md'), 'unrelated');
  assert.equal((await create({ rootDir })).codeTreeDirty, false);
  await writeFile(path.join(rootDir, 'src/main.mjs'), 'export const answer = 43;\n');
  const dirty = await create({ rootDir });
  assert.equal(dirty.codeTreeDirty, true);
  assert.notEqual(dirty.runtimeSha256, clean.runtimeSha256);
});

test('verifies build contents without Git and treats recorded commit as a build claim', async t => {
  const rootDir = await fixture(t, true);
  const manifest = await capture(rootDir);
  await rm(path.join(rootDir, '.git'), { recursive: true });
  const built = await create({ rootDir });
  assert.equal(built.sourceCommit, manifest.sourceCommit);
  assert.equal(built.sourceCommitBasis, 'build-manifest');
  assert.equal(built.codeTreeDirty, null);
  assert.equal(built.runtimeMatchesBuild, true);
  assert.match(built.buildManifestSha256, /^[a-f0-9]{64}$/);
  await writeFile(path.join(rootDir, 'src/main.mjs'), '// modified\n');
  assert.equal((await create({ rootDir })).runtimeMatchesBuild, false);
  await unlink(path.join(rootDir, 'src/main.mjs'));
  assert.equal((await create({ rootDir })).runtimeMatchesBuild, false);
});

test('detects added runtime inputs and malformed or internally inconsistent manifests', async t => {
  const rootDir = await fixture(t);
  const manifest = await capture(rootDir);
  await writeFile(path.join(rootDir, 'src/new.mjs'), '// added');
  assert.equal((await create({ rootDir })).runtimeMatchesBuild, false);
  await unlink(path.join(rootDir, 'src/new.mjs'));
  manifest.runtimeSha256 = '0'.repeat(64);
  await writeFile(path.join(rootDir, 'src/build-manifest.json'), JSON.stringify(manifest));
  await assert.rejects(create({ rootDir }), /manifest/i);
  await writeFile(path.join(rootDir, 'src/build-manifest.json'), '{bad');
  await assert.rejects(create({ rootDir }), /manifest/i);
  await writeFile(path.join(rootDir, 'src/build-manifest.json'), JSON.stringify({ schemaVersion: 1 }));
  await assert.rejects(create({ rootDir }), /manifest/i);
});

test('rejects runtime symlinks escaping the repository including source directories', async t => {
  const rootDir = await fixture(t);
  const outside = await fixture(t);
  await symlink(path.join(outside, 'src/main.mjs'), path.join(rootDir, 'src/escape.mjs'));
  await assert.rejects(create({ rootDir }), /symlink|outside|escape/i);
  await unlink(path.join(rootDir, 'src/escape.mjs'));
  await rm(path.join(rootDir, 'scripts'), { recursive: true });
  await symlink(path.join(outside, 'scripts'), path.join(rootDir, 'scripts'));
  await assert.rejects(create({ rootDir }), /symlink|outside|escape/i);
});

test('explicit generator writes a manifest using supplied root and captures matching runtime', async t => {
  const rootDir = await fixture(t, true);
  execFileSync(process.execPath, [generatorPath, '--root-dir', rootDir]);
  const manifest = JSON.parse(await readFile(path.join(rootDir, 'src/build-manifest.json'), 'utf8'));
  assert.equal(manifest.sourceCommit, runGit(rootDir, 'rev-parse', 'HEAD'));
  assert.equal((await create({ rootDir })).runtimeMatchesBuild, true);
});

test('generated manifests and ignored secret inputs do not mark Git runtime dirty', async t => {
  const rootDir = await fixture(t, true);
  await writeFile(path.join(rootDir, '.gitignore'), '.env\n.cache/\nsrc/build-manifest.json\n');
  await capture(rootDir);
  await writeFile(path.join(rootDir, 'src/.env'), 'test-only-secret');
  await mkdir(path.join(rootDir, 'src/.cache'));
  await writeFile(path.join(rootDir, 'src/.cache/data'), 'test-only-secret');
  assert.equal((await create({ rootDir })).codeTreeDirty, false);
  await writeFile(path.join(rootDir, 'src/untracked.mjs'), '// runtime');
  assert.equal((await create({ rootDir })).codeTreeDirty, true);
});

test('default root is based on module location and optional manifest path is honored', async t => {
  const defaults = await create();
  assert.ok(defaults.filesSha256['src/provenance.mjs']);
  const rootDir = await fixture(t);
  const manifest = await capture(rootDir);
  await unlink(path.join(rootDir, 'src/build-manifest.json'));
  await writeFile(path.join(rootDir, 'custom-manifest.json'), JSON.stringify(manifest));
  assert.equal((await create({ rootDir, manifestPath: 'custom-manifest.json' })).runtimeMatchesBuild, true);
});

test('generator refuses output symlinks instead of overwriting outside files', async t => {
  const rootDir = await fixture(t);
  const outside = await fixture(t);
  const destination = path.join(outside, 'package.json');
  const before = await readFile(destination, 'utf8');
  await symlink(destination, path.join(rootDir, 'src/build-manifest.json'));
  assert.throws(() => execFileSync(process.execPath, [generatorPath, '--root-dir', rootDir], { stdio: 'pipe' }));
  assert.equal(await readFile(destination, 'utf8'), before);
});
