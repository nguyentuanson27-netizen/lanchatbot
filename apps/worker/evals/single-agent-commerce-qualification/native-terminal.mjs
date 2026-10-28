// Evaluation capture only. Customer output comes from accepted transport payloads.
export function captureNativeTerminal({native,codeOnly,messages,images,errorCode}){
 if(codeOnly)return {disposition:'CODE_OWNED_SEND',messages,images};
 if(native?.disposition==='HANDOFF')return {disposition:'HANDOFF',messages,images,reason:native.reason};
 if(native?.disposition==='SEND_ELIGIBLE'&&messages.length)return {disposition:'SEND_ELIGIBLE',messages,images};
 return {disposition:'NO_SEND',messages,images,reason:errorCode??native?.reason??'NO_ACCEPTED_CUSTOMER_OUTPUT'};
}
export function capturedOutputViolations(terminal){
 return ['HANDOFF','NO_SEND'].includes(terminal.disposition)&&(terminal.messages.length||terminal.images.length)
  ?[{kind:terminal.disposition==='HANDOFF'?'SILENT_HANDOFF_CUSTOMER_OUTPUT':'NO_SEND_CUSTOMER_OUTPUT'}]:[];
}
