import {publicTurnTime,publicCommunicationHistoryMetadata} from './gemini-inference.mjs';
export const VERIFIER_REQUEST_MAX_BYTES=70000;
const bytes=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value));
const check=(ok,reason)=>{if(!ok)throw new Error(reason);};
export function buildVerifierRequest(m,r){
 check(typeof r.finalDraft==='string'&&bytes(r.finalDraft)<=4096,'DRAFT_BOUND');
 const request={model:m.models.verifier.model,reasoning:{effort:m.models.verifier.effort},instructions:r.instructions,
  input:[{type:'message',role:'user',content:[{type:'input_text',text:JSON.stringify({requestIdentity:r.binding,turnTime:publicTurnTime(r.turnTime),trusted:r.trusted,
    untrusted:{latestCustomerMessage:r.latest,recentAcceptedDialogue:r.history,finalDraft:r.finalDraft,
      ...(r.historyMetadata?.publicCartEvents.length?{acceptedCommunicationHistory:publicCommunicationHistoryMetadata(r.historyMetadata)}:{})}})}]}],
  tools:[],tool_choice:'none',parallel_tool_calls:false,store:false,stream:true,
  text:{format:{type:'json_schema',name:'semantic_egress_verdict',strict:true,schema:m.verdictSchema}}};
 check(bytes(request)<=VERIFIER_REQUEST_MAX_BYTES,'VERIFIER_INPUT_BOUND');return request;
}
