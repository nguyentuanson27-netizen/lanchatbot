// Evaluation-only registry candidate; never writes the shared catalog or changes POS facts.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function candidateDescription(product,descriptions={}){
 if(!product)return product;
 const change=descriptions[product.productId];if(!change)return product;
 assert.deepEqual(Object.keys(change).sort(),['description','originalSha256'],'CANDIDATE_DESCRIPTION_FIELDS');
 assert.equal(hash((product.descriptionXml??'').trim()),change.originalSha256,'CANDIDATE_DESCRIPTION_SOURCE_CHANGED');
 assert(typeof change.description==='string'&&change.description.trim()&&Buffer.byteLength(change.description)<=10000,'CANDIDATE_DESCRIPTION_BOUND');
 return {...product,descriptionXml:change.description,descriptionAuthority:'GOOGLE_SHEETS_PRODUCT_REGISTRY',
  descriptionSourceVersion:'candidate-registry-description:'+hash(JSON.stringify(change))};
}
export function candidateSearchResult(result,descriptions){
 if(result.status==='MATCHED')return {...result,product:candidateDescription(result.product,descriptions)};
 if(result.status==='AMBIGUOUS')return {...result,candidates:result.candidates.map(c=>({...c,document:candidateDescription(c.document,descriptions)}))};
 return result;
}

