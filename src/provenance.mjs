import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/;
const commitPattern = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const bases = new Set(['git-head', 'operator-claim', 'build-manifest', 'unknown']);
const sortedFiles = files => Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
const filesHash = files => sha256(JSON.stringify(sortedFiles(files)));
const runtimePath = name => name !== 'src/build-manifest.json'
  && !name.split('/').some(segment => segment.startsWith('.'))
  && (name === 'package.json' || name === 'package-lock.json' || name.startsWith('src/') || name.startsWith('scripts/'));
const contained = (root, target) => { const rel = path.relative(root, target); return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel)); };

async function runtimeFiles(root) {
  const files = {};
  async function visit(relative) {
    const absolute = path.join(root, relative);
    let stat;
    try { stat = await lstat(absolute); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    if (stat.isSymbolicLink()) {
      const target = await realpath(absolute);
      if (!contained(root, target)) throw new Error('Runtime symlink escapes repository root');
      const targetStat = await lstat(target);
      if (!targetStat.isFile()) throw new Error('Runtime directory symlinks are unsupported');
      files[relative] = sha256(await readFile(target));
    } else if (stat.isDirectory()) {
      for (const entry of (await readdir(absolute)).sort()) {
        const child = `${relative}/${entry}`;
        if (runtimePath(child)) await visit(child);
      }
    } else if (stat.isFile()) files[relative] = sha256(await readFile(absolute));
    else throw new Error('Runtime input must be a regular file');
  }
  for (const name of ['package.json', 'package-lock.json', 'src', 'scripts']) await visit(name);
  return sortedFiles(files);
}

async function gitIdentity(root) {
  const git = async (...args) => (await exec('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })).stdout;
  try {
    // Never attribute an unpacked directory to an unrelated enclosing checkout.
    if (await realpath((await git('rev-parse', '--show-toplevel')).trim()) !== root) return null;
    const head = (await git('rev-parse', '--verify', 'HEAD')).trim();
    if (!commitPattern.test(head)) return null;
    const status = (await git('status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=matching', '--', 'src', 'scripts', 'package.json', 'package-lock.json')).split('\0');
    let dirty = false;
    for (let index = 0; index < status.length; index++) {
      const entry = status[index];
      if (!entry) continue;
      const name = entry.slice(3);
      const relevant = candidate => runtimePath(candidate) || ((candidate === 'src/' || candidate === 'scripts/'));
      if (relevant(name)) dirty = true;
      if (/[RC]/.test(entry.slice(0, 2))) {
        if (relevant(status[++index] ?? '')) dirty = true;
      }
    }
    return { head, dirty };
  } catch { return null; }
}

function validateManifest(manifest) {
  const invalid = () => { throw new Error('Invalid build manifest'); };
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || manifest.schemaVersion !== 1
    || !(manifest.sourceCommit === null || (typeof manifest.sourceCommit === 'string' && commitPattern.test(manifest.sourceCommit)))
    || !bases.has(manifest.sourceCommitBasis)
    || !(manifest.codeTreeDirty === null || typeof manifest.codeTreeDirty === 'boolean')
    || typeof manifest.runtimeSha256 !== 'string' || !hashPattern.test(manifest.runtimeSha256)
    || !manifest.filesSha256 || typeof manifest.filesSha256 !== 'object' || Array.isArray(manifest.filesSha256)) invalid();
  for (const [name, digest] of Object.entries(manifest.filesSha256)) {
    if (!runtimePath(name) || path.posix.normalize(name) !== name || name.includes('\\')
      || typeof digest !== 'string' || !hashPattern.test(digest)) invalid();
  }
  if (filesHash(manifest.filesSha256) !== manifest.runtimeSha256) invalid();
  return manifest;
}

/** Hash only distributed runtime inputs. Commit values are claims unless based on local Git HEAD.
 * A null manifestPath disables manifest loading (used when regenerating a build).
 * Build matching is content consistency, not a signature or proof of trusted authorship.
 */
export async function createProvenance({ rootDir = defaultRoot, manifestPath, sourceCommit } = {}) {
  const root = await realpath(rootDir);
  if (sourceCommit !== undefined && sourceCommit !== null && (typeof sourceCommit !== 'string' || !commitPattern.test(sourceCommit))) {
    throw new Error('sourceCommit must be a full hexadecimal commit identifier');
  }
  const filesSha256 = await runtimeFiles(root);
  const runtimeSha256 = filesHash(filesSha256);
  let manifest = null;
  let buildManifestSha256 = null;
  if (manifestPath !== null) {
    const filename = path.resolve(root, manifestPath ?? 'src/build-manifest.json');
    let bytes;
    try {
      const target = await realpath(filename);
      if (!contained(root, target)) throw new Error('Build manifest symlink escapes repository root');
      bytes = await readFile(target);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (bytes) {
      try { manifest = validateManifest(JSON.parse(bytes.toString('utf8'))); }
      catch { throw new Error('Invalid build manifest'); }
      buildManifestSha256 = sha256(bytes);
    }
  }
  const git = await gitIdentity(root);
  const supplied = sourceCommit !== undefined && sourceCommit !== null;
  return {
    schemaVersion: 1,
    sourceCommit: supplied ? sourceCommit : git?.head ?? manifest?.sourceCommit ?? null,
    sourceCommitBasis: supplied ? 'operator-claim' : git ? 'git-head' : manifest?.sourceCommit ? 'build-manifest' : 'unknown',
    codeTreeDirty: git?.dirty ?? null,
    runtimeSha256,
    filesSha256,
    buildManifestSha256,
    runtimeMatchesBuild: manifest ? runtimeSha256 === manifest.runtimeSha256 && JSON.stringify(filesSha256) === JSON.stringify(sortedFiles(manifest.filesSha256)) : null,
  };
}
