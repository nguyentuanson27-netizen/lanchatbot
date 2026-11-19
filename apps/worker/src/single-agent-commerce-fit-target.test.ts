import {it,expect} from "vitest";
import {SizeFitTargetV1Schema,sizeFitTargetKey,SizeRecommendationProtectedClaimV1Schema,ProtectedClaimV1Schema,type SizeFitTargetV1} from "@lana/contracts";
import {recommendSize,createVerifiedSizeRecommendationClaim,buildProtectedClaimsFromVerifiedFactsV1} from "@lana/business-tools";
import {authorizeRealtimeProtectedClaimProposal,bindRealtimeProtectedClaimProposal} from "./realtime-protected-claim-boundary.js";
import {fixtureSizeInput,fixtureProfile,commerceNow} from "./single-agent-commerce.test-support.js";
import {sanitizeCandidateClaimValue} from "./context-v2-candidate.js";

function fixture(role:"TOP"|"PANTS"="PANTS"){
 const profile=fixtureProfile().profile,source=fixtureSizeInput(),componentProductId=`PART-${role}`;
 const fitTarget={kind:"COMPONENT" as const,parentProductId:"QU714",componentProductId,componentRole:role};
 const target={...source.target,componentProductId,componentRole:role};
 const charts=source.charts.map(c=>({chart:{...c.chart,componentRole:role},scope:{...c.scope,componentRole:role}}));
 const decision=recommendSize({target,charts,profile,fitTarget,generatedAt:commerceNow.toISOString()});
 const claim=createVerifiedSizeRecommendationClaim({decision,profile,productId:"QU714",fitTarget})!;
 const projected=buildProtectedClaimsFromVerifiedFactsV1({facts:null,sizeClaim:claim,expectedProductId:"QU714",expectedFitTarget:fitTarget});
 return {profile,decision,claim,fitTarget,projected};
}
it("only mints component claims for exact explicit decision targets, preserving them in both schemas",()=>{
 const f=fixture();expect(f.claim).not.toBeNull();expect(SizeRecommendationProtectedClaimV1Schema.parse(f.claim).fitTarget).toEqual(f.fitTarget);
 expect(f.projected.claims).toHaveLength(1);expect(f.projected.claims[0]).toMatchObject({type:"SIZE_FIT",value:{fitTarget:f.fitTarget}});
 expect(createVerifiedSizeRecommendationClaim({decision:f.decision,profile:f.profile,productId:"QU714"})).toBeNull();
 expect(createVerifiedSizeRecommendationClaim({decision:f.decision,profile:f.profile,productId:"QU714",fitTarget:{kind:"PRODUCT",productId:"QU714"}})).toBeNull();
 const source=fixtureSizeInput();
 expect(()=>recommendSize({...source,target:{...source.target,componentProductId:"CHILD"},profile:f.profile,
  fitTarget:{kind:"PRODUCT",productId:"QU714"},generatedAt:commerceNow.toISOString()})).toThrow("SIZE_TARGET_MISMATCH");
 for(const fitTarget of [{...f.fitTarget,parentProductId:"OTHER"},{...f.fitTarget,componentProductId:"OTHER"},{...f.fitTarget,componentRole:"TOP" as const}])
  expect(createVerifiedSizeRecommendationClaim({decision:f.decision,profile:f.profile,productId:"QU714",fitTarget})).toBeNull();
 for(const bad of [{...f.fitTarget,extra:true},{...f.fitTarget,componentRole:"BOGUS"},{kind:"COMPONENT",parentProductId:"QU714"}])expect(SizeFitTargetV1Schema.safeParse(bad).success).toBe(false);
});
it("rejects product/component substitution and target loss at projection",()=>{
 const f=fixture();
 expect(buildProtectedClaimsFromVerifiedFactsV1({facts:null,sizeClaim:f.claim,expectedProductId:"QU714"}).claims).toEqual([]);
 const {fitTarget:_removed,...stripped}=f.claim;
 expect(buildProtectedClaimsFromVerifiedFactsV1({facts:null,sizeClaim:stripped,expectedProductId:"QU714",expectedFitTarget:f.fitTarget}).claims).toEqual([]);
 for(const expectedFitTarget of [{kind:"PRODUCT" as const,productId:"QU714"},{...f.fitTarget,componentRole:"TOP" as const},{...f.fitTarget,componentProductId:"OTHER"}])
  expect(buildProtectedClaimsFromVerifiedFactsV1({facts:null,sizeClaim:f.claim,expectedFitTarget}).claims).toEqual([]);
});
it("authorizes component fit only against independently supplied exact expected targets",()=>{
 const f=fixture(),c=f.projected.claims[0]!,base={declaredClaimIds:[c.claimId],observedClaimTypes:[],availableClaims:[c],expectedProductIds:["QU714"],now:commerceNow};
 expect(authorizeRealtimeProtectedClaimProposal(base).outcome).toBe("BLOCKED");
 for(const target of [{kind:"PRODUCT",productId:"QU714"},{...f.fitTarget,componentRole:"TOP"},{...f.fitTarget,componentProductId:"OTHER"}] as SizeFitTargetV1[])
  expect(authorizeRealtimeProtectedClaimProposal({...base,expectedFitTargets:[target]}).outcome).toBe("BLOCKED");
 expect(authorizeRealtimeProtectedClaimProposal({...base,expectedFitTargets:[f.fitTarget]}).outcome).toBe("AUTHORIZED");
 expect(authorizeRealtimeProtectedClaimProposal({...base,availableClaims:[{...c,scope:{kind:"SHOP",shopId:"LANA"}}],expectedFitTargets:[f.fitTarget]}).outcome).toBe("BLOCKED");
 expect(()=>sanitizeCandidateClaimValue("SIZE_FIT",f.projected.claims[0]!.value)).toThrow("COMPONENT_SIZE_FIT_UNSUPPORTED");
 expect(ProtectedClaimV1Schema.safeParse({...c,value:{...c.value,fitTarget:{kind:"PRODUCT",productId:"OTHER"}}}).success).toBe(false);
});
it("does not reuse parent-and-role-only accepted history as component evidence",()=>{
 const f=fixture(),profile={...f.profile,measurements:[],sizeHistory:[{productId:"QU714",componentRole:"PANTS" as const,size:"M",outcome:"CUSTOMER_ACCEPTED" as const,
  sourceEventHash:"e".repeat(64),recordedAt:commerceNow.toISOString()}]};
 const source=fixtureSizeInput(),target={...source.target,componentProductId:f.fitTarget.componentProductId};
 const decision=recommendSize({...source,target,fitTarget:f.fitTarget,profile,generatedAt:commerceNow.toISOString()});
 expect(createVerifiedSizeRecommendationClaim({decision,profile,productId:"QU714",fitTarget:f.fitTarget})).toBeNull();
});
it("keeps request identities distinct for different component fits under the same parent",()=>{
 const f=fixture("PANTS"),top=fixture("TOP"),claims=[...f.projected.claims,...top.projected.claims];
 expect(sizeFitTargetKey(f.fitTarget)).not.toBe(sizeFitTargetKey(top.fitTarget));
 const base={modelDeclaredClaimIds:[],deterministicClaims:[],availableClaims:claims,expectedProductIds:["QU714"],
  expectedFitTargets:[f.fitTarget,top.fitTarget],now:commerceNow};
 const result=bindRealtimeProtectedClaimProposal({...base,requestedClaims:[f.fitTarget,top.fitTarget].map(expectedFitTarget=>({type:"SIZE_FIT",productId:"QU714",expectedFitTarget}))});
 expect(result.reasonCodes).toEqual([]);expect(result.claimIds).toHaveLength(2);
 expect(bindRealtimeProtectedClaimProposal({...base,requestedClaims:[{type:"SIZE_FIT",productId:"QU714"}]}).claimIds).toEqual([]);
});
