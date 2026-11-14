// Pure admission against existing native serializers. No inference, IO, state write or new API field.
import {buildGeminiCommerceRequest} from './gemini-inference.mjs';
import {buildVerifierRequest} from './protocol.mjs';
import {withNativePresentation} from './native-presentation.mjs';
import {makeBinding} from '../../dist/single-agent-semantic-verifier-boundary.js';
export function admitPreparedCommerceContext(manifest,verifierPrompt,request){
 try{
  buildGeminiCommerceRequest(withNativePresentation(request,'VI_DATA_BLOCKS_COMPACT_V2'));
  const dialogue=request.contents.map(c=>({role:c.role==='model'?'shop':'customer',text:c.parts.map(p=>p.text??'').join('')}));
  const latest=dialogue.at(-1)?.text??'',history=dialogue.slice(0,-1);
  // A 4096-byte draft can expand to six JSON bytes per character. Reserve that actual serializer upper bound.
  const finalDraft='\u0001'.repeat(4096),binding=makeBinding('r'.repeat(128),finalDraft,request.context);
  buildVerifierRequest(manifest,{instructions:verifierPrompt,finalDraft,trusted:request.context,binding,latest,history,
   turnTime:request.turnTime,historyMetadata:request.historyMetadata});
  return true;
 }catch{return false;}
}
