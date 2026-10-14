import {recommendSize,selectVerifiedSizeChart} from '@lana/business-tools';
import {createHash} from 'node:crypto';

// Checkpoint-A input preparation only. Reuse engine decisions and the existing
// bounded/hash-bound profile channel; no language parser or reply ownership.
export function prepareSizeInputContext(profile,input,{includeDecision=false}={}) {
  if(profile.subjectRef!==input.target.parentProductId)throw new Error('SIZE_CONTEXT_SUBJECT');
  const selected=selectVerifiedSizeChart(input.charts,input.target);
  if(!selected)throw new Error('SIZE_CONTEXT_NO_VERIFIED_CHART');
  const decision=recommendSize(input);
  const summary={
    ...(includeDecision?{status:decision.recommendation.status}:{}),
    supportedInputs:[...new Set(selected.chart.bands.flatMap(b=>b.ranges.map(r=>r.kind)))],
    missingInputs:[...decision.missingInputs],
  };
  const prepared=structuredClone(profile);
  const line='CodeSizeInput: '+JSON.stringify(summary);
  if(includeDecision)prepared.details.sizeChart.unshift(line);
  else prepared.details.sizeChart.push(line);
  if(prepared.details.sizeChart.length>4)throw new Error('SIZE_CONTEXT_CHART_BOUND');
  prepared.contentHash=createHash('sha256').update(JSON.stringify(prepared.details)).digest('hex');
  if(Buffer.byteLength(JSON.stringify(prepared),'utf8')>2048)throw new Error('SIZE_CONTEXT_PROFILE_BOUND');
  return{profile:prepared,summary};
}
