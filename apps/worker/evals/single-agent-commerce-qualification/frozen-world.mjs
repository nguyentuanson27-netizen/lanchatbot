import assert from 'node:assert/strict';
import {CatalogSnapshotV3Schema,normalizeCatalogToken,resolveCatalogFacts} from '@lana/business-tools';
import {cartSelectionFromSnapshot,verifiedVariantFromSnapshot} from '../../dist/realtime-sales-catalog.js';
import {catalogPolicyContext,businessFactMaxAgeSeconds} from '../../dist/redis-business-facts.js';
import {digest} from './qualification.mjs';
export function frozenFacts(world){
 assert.equal(world.kind,'FROZEN_PUBLIC_BUSINESS_WORLD');
 assert.deepEqual(world.sourceEvidenceHashes,[digest(world.products),digest(world.snapshots),digest(world.policyRecords)],'C_WORLD_SOURCE_HASH');
 const snapshots=Object.fromEntries(Object.entries(world.snapshots).map(([k,v])=>[normalizeCatalogToken(k),structuredClone(v)])),alias=normalizeCatalogToken(world.config.scope.shopAlias);
 for(const snapshot of Object.values(snapshots))CatalogSnapshotV3Schema.parse(snapshot);
 const get=(shop,product)=>{assert.equal(normalizeCatalogToken(shop),alias,'C_WORLD_SHOP_SCOPE');const s=snapshots[normalizeCatalogToken(product)];assert(s,'C_WORLD_PRODUCT_NOT_FROZEN');return structuredClone(s);};
 return {ready:async()=>true,close:async()=>{},readCatalogSnapshot:async(shop,product)=>get(shop,product),
  resolve:async(query,now=new Date())=>{const s=get(query.shopAlias,query.productId),age=businessFactMaxAgeSeconds(s,query,1200,172800);
   return {...resolveCatalogFacts(s,query,now,age),policyContext:catalogPolicyContext(s)};},
  resolveCartSelection:async(q,now=new Date())=>cartSelectionFromSnapshot(get(q.shopAlias,q.productId),q,now),
  resolveVerifiedVariant:async(q,now=new Date())=>verifiedVariantFromSnapshot(get(q.shopAlias,q.productId),q,now)};
}
export function frozenCatalog(world){
 const products=new Map(world.products.map(p=>[normalizeCatalogToken(p.canonicalCode),structuredClone(p)]));
 return {findByExactCode:async code=>structuredClone(products.get(normalizeCatalogToken(code))??null),
  searchText:async()=>{throw Error('C_WORLD_SEARCH_INDEX_NOT_FROZEN');}};
}
