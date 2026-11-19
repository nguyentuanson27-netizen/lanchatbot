// Same public history projection as the native ingress; never synthesize a shop turn.
import {commerceHistory} from '../../dist/single-agent-commerce-ingress.js';
import {projectCommerceHistoryMetadata} from '../../dist/single-agent-commerce-public-history.js';
export function historyProjection(trace){
 const projected=projectCommerceHistoryMetadata(commerceHistory(trace.rows),trace.cartEvents);
 return commerceHistory(trace.rows,trace.media,projected.metadata.publicCartEvents.length?Buffer.byteLength(JSON.stringify(projected.metadata)):0);
}
export async function readNativeHistory({store,history,scope,before=new Date()}){
 const [rows,media,cartEvents]=await Promise.all([
  history.listConversationHistory(scope.conversationId,{limit:30,before}),
  store.readAcceptedCommerceMedia({...scope,before}),
  store.readAcceptedCommerceCartSummaries({...scope,before})]);
 const trace=JSON.parse(JSON.stringify({rows,media,cartEvents}));
 return {trace,history:historyProjection(trace)};
}
