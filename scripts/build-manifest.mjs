import { writeFile, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProvenance } from '../src/provenance.mjs';

// This script writes only when explicitly executed, never when imported.
export async function buildManifest({ rootDir = fileURLToPath(new URL('../', import.meta.url)), sourceCommit } = {}) {
  const provenance = await createProvenance({ rootDir, sourceCommit, manifestPath: null });
  const { schemaVersion, sourceCommit: commit, sourceCommitBasis, codeTreeDirty, runtimeSha256, filesSha256 } = provenance;
  const manifest = { schemaVersion, sourceCommit: commit, sourceCommitBasis, codeTreeDirty, runtimeSha256, filesSha256 };
  await mkdir(path.join(rootDir, 'src'), { recursive: true });
  await writeFile(path.join(rootDir, 'src/build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
    flag: constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
  });
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {};
    for (let index = 2; index < process.argv.length; index++) {
      const flag = process.argv[index];
      if (!['--root-dir', '--source-commit'].includes(flag) || !process.argv[index + 1]) throw new Error('Expected --root-dir PATH or --source-commit SHA');
      options[flag === '--root-dir' ? 'rootDir' : 'sourceCommit'] = process.argv[++index];
    }
    await buildManifest(options);
    console.log('Build manifest generated.');
  } catch {
    console.error('Build manifest generation failed; check arguments and runtime inputs.');
    process.exitCode = 1;
  }
}
