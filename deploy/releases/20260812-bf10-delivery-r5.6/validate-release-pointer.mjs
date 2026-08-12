import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateReleaseSource } from '../../runtime-state/release-source.mjs';

const [, , pointerPath, release, commit] = process.argv;
if (!pointerPath || !release || !commit) throw new Error('USAGE: validate-release-pointer.mjs <pointer> <release> <commit>');
const pointer = JSON.parse(readFileSync(resolve(pointerPath), 'utf8'));
validateReleaseSource(pointer, release);
if (pointer.tag !== release || pointer.commit !== commit) throw new Error('RELEASE_POINTER_IDENTITY_MISMATCH');
console.log('release pointer identity validation: PASS');
