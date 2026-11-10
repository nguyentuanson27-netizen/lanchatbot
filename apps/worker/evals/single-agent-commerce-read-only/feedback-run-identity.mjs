import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sha256,validateProtocol} from './protocol.mjs';
export function readFeedbackRunIdentity(){
 const manifestBytes=readFileSync(new URL('./manifest.json',import.meta.url)),manifest=validateProtocol(JSON.parse(manifestBytes));
 const corpusHashes=Object.fromEntries(['cases.b1.json','stateful-cases.json','sales-journeys.candidate.json','sales-media-followup-cases.json'].map(f=>[f,sha256(readFileSync(new URL(f,import.meta.url)))]));
 return {sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),manifestHash:sha256(manifestBytes),
  sourceConfigHash:sha256(readFileSync(new URL('./source-config.b1.json',import.meta.url))),promptHashes:manifest.promptHashes,models:manifest.models,schemaHash:manifest.schemaHash,corpusHashes};
}
export function assertCleanFeedbackSource(identity){
 assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'','DIRTY_SOURCE');
 assert.deepEqual(readFeedbackRunIdentity(),identity,'RUN_IDENTITY_CHANGED');
}
