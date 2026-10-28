// Bounded operator, bundled and run via stdin in the existing staging container.
// No provider, Sheets mutation, vector upsert or production source deployment.
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {revalidatePublishedMedia} from '../../dist/p23c-media-revalidation.js';
import {HttpQdrantClient,FfmpegImagePipeline} from '../../dist/p23c-publisher.js';
import {GoogleSheetsClient} from '/app/apps/worker/dist/google-sheets-client.js';
import {buildApprovedQdrantJobs,collectImageRegistryRows} from '/app/apps/worker/dist/p23c-jobs.js';
import {mediaRevalidationOperatorOutcome} from './media-revalidation-operator-outcome.mjs';

let stage='INPUT';
try{
 const target=JSON.parse(Buffer.from(process.env.C3_MEDIA_REVALIDATION_TARGETS_B64??'','base64').toString());
 if(target.productId!=='SV2447'||!Array.isArray(target.pointIds)||target.pointIds.length!==11||new Set(target.pointIds).size!==11)
   throw Error('BOUNDED_TARGET_REQUIRED');
 const apply=process.env.C3_MEDIA_REVALIDATION_APPLY==='true';
 stage='CREDENTIAL_CONFIG';
 const secret=(key,file)=>process.env[key]?.trim()||readFileSync(process.env[file],'utf8').trim();
 const credential=JSON.parse(secret('GOOGLE_SHEETS_CREDENTIAL','GOOGLE_SHEETS_CREDENTIAL_FILE'));
 stage='READ_CLIENT_CONFIG';
 const sheets=new GoogleSheetsClient({serviceAccount:{email:credential.email,privateKey:credential.privateKey}});
 const qdrant=new HttpQdrantClient({baseUrl:process.env.QDRANT_BASE_URL,collection:'lana_multimodal_data_v2',apiKey:secret('QDRANT_API_KEY','QDRANT_API_KEY_FILE')});
 const images=new FfmpegImagePipeline({maxWidth:Number(process.env.INGEST_IMAGE_MAX_WIDTH||800),rembgUrl:'http://127.0.0.1:0/unused',rembgAuthHeader:''});
 const run={run_id:target.runId,started_at:new Date().toISOString(),shard_count:1,shard_index:0,shard_label:'1/1'};
 let writesDispatched=0;
 async function source(pointId){
   const [points,registry]=await Promise.all([qdrant.scrollPointStates(),sheets.batchGetValues(process.env.DATA_INGESTION_V2_SHEET_ID,['image_registry!A:AR'],'UNFORMATTED_VALUE')]);
   const point=points.get(pointId);if(!point||point.payload.product_id!==target.productId)return null;
   const matrix=registry[0].values,headers=matrix[0];
   const rows=matrix.slice(1).map(row=>Object.fromEntries(headers.map((key,index)=>[key,row[index]??'']))).filter(r=>String(r.MA_SP).trim().toUpperCase()===target.productId);
   const jobs=buildApprovedQdrantJobs([],collectImageRegistryRows(rows),run).filter(j=>j.point_id===pointId);
   return{pointId,payload:structuredClone(point.payload),approvedPayload:jobs.length===1&&jobs[0].publish_action==='UPSERT'?jobs[0].payload:null};
 }
 stage='SCOPED_SOURCE';
 const all=await qdrant.scrollPointStates();const scoped=[...all.values()].filter(p=>p.payload.product_id===target.productId).map(p=>p.point_id);
 if(JSON.stringify([...scoped].sort())!==JSON.stringify([...target.pointIds].sort()))throw Error('TARGET_SOURCE_CHANGED');
 const results=[];
 for(const pointId of target.pointIds){
   stage='POINT_REVALIDATION';const initial=await source(pointId);if(!initial){results.push({pointId,status:'BLOCKED',reason:'CURRENT_SOURCE_UNAVAILABLE'});continue;}
   let proposedProof=null;
   const result=await revalidatePublishedMedia({source:initial,force:true,clock:()=>new Date(),prepare:url=>images.prepareForRevalidation(url),readCurrent:()=>source(pointId),
     writeProof:async proof=>{
       proposedProof=proof;
       if(!apply)throw Error('PREFLIGHT_NO_WRITE');
       writesDispatched++;console.log(JSON.stringify({phase:'WRITE_DISPATCHED',pointId,proofStatus:proof.status}));
       await qdrant.setPayload(pointId,{image_revalidation:proof});
     },invalidateProof:async proof=>{
       if(!apply)throw Error('PREFLIGHT_NO_WRITE');
       writesDispatched++;console.log(JSON.stringify({phase:'INVALIDATION_DISPATCHED',pointId}));
       await qdrant.invalidateMediaProof(pointId,proof);
     }});
   const status=!apply&&proposedProof?(proposedProof.status==='VERIFIED'?'WOULD_VERIFY':'WOULD_INVALIDATE'):result.status;
   results.push({...result,status,proposedProof});console.log(JSON.stringify({phase:'RESULT',...results.at(-1),apply}));
   if(apply&&result.status==='WRITE_UNCONFIRMED')break;
 }
 stage='FINAL_READBACK';const after=await qdrant.scrollPointStates();
 const semanticFieldsUnchanged=target.pointIds.every(id=>{
   const before={...all.get(id).payload},current={...after.get(id).payload};delete before.image_revalidation;delete current.image_revalidation;
   return isDeepStrictEqual(before,current);
 });
 const observedResults=results.map(result=>({...result,observedProof:after.get(result.pointId)?.payload.image_revalidation??null}));
 const notRun=target.pointIds.filter(id=>!results.some(r=>r.pointId===id));
 const outcome=mediaRevalidationOperatorOutcome({apply,results:observedResults,notRun,semanticFieldsUnchanged});
 const report={status:outcome.status,apply,productId:target.productId,results:observedResults,
   writesDispatched,semanticFieldsUnchanged,notRun,providerRequests:0,embeddingRequests:0,sheetsWrites:0,vectorUpserts:0};
 console.log(JSON.stringify({phase:'SUMMARY',...report}));
 process.exitCode=outcome.exitCode;
}catch(error){
 const code=error?.code??error?.message;
 console.log(JSON.stringify({phase:'ERROR',status:'STOP_RETAIN_EVIDENCE',stage,errorName:error?.name??null,
   errorCode:typeof code==='string'&&/^[A-Z0-9_]{1,80}$/.test(code)?code:null,providerRequests:0}));process.exitCode=1;
}
