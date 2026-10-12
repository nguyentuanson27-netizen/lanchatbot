function policyContext({ref,text},structuredPolicy) {
  if(structuredPolicy)try {
    const data=JSON.parse(text);
    if(data&&typeof data==='object'&&!Array.isArray(data)&&JSON.stringify(data)===text)return {ref,sourceData:data};
  } catch { /* Preserve original literal when unpacking would change source bytes. */ }
  return {ref,text};
}
export function sourceDataConversationContext({trusted,untrusted,requestIdentity},{structuredPolicy=false}={}) {
  const prefix='CodeSizeInput: ';
  const profiles=(trusted.productProfiles??[]).map(({ref,subjectRef,details})=>{
    const input=details.sizeChart?.find(line=>line.startsWith(prefix));
    // Existing explicit JSON field; keep all business details, including the complete chart.
    return {ref,subjectRef,details,codeSizeInput:input?JSON.parse(input.slice(prefix.length)):null};
  });
  const claims=trusted.protectedClaims.map(({type,scope,value})=>({type,scope,value}));
  const refs=new Set(trusted.boundSubjects.map(subject=>subject.ref));
  const display={
    products:trusted.boundSubjects.map(subject=>({subject,
      profiles:profiles.filter(profile=>profile.subjectRef===subject.ref),
      claims:claims.filter(claim=>claim.scope.productId===subject.ref)})),
    otherProfiles:profiles.filter(profile=>!refs.has(profile.subjectRef)),
    otherClaims:claims.filter(claim=>!refs.has(claim.scope.productId)),
    policyLiterals:trusted.policyLiterals.map(policy=>policyContext(policy,structuredPolicy)),effectReceipts:trusted.effectReceipts,
    // Reuse V5's owner state allowlist; canonical provenance/permissions stay with code/verifier.
    state:Object.fromEntries(['conversationOwner','currentProductId','consideredSize','salesStage']
      .filter(key=>Object.hasOwn(trusted.state,key)).map(key=>[key,trusted.state[key]])),
  };
  return '# Context tư vấn — '+(structuredPolicy?'SOURCE_DATA_V7':'SOURCE_DATA_PREPARATION_20261012')+'\n'+JSON.stringify({
    requestIdentity,trusted:display,untrusted:{retrievedText:untrusted.retrievedText},
  })+'\n';
}
