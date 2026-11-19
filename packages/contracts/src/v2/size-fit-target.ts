import {z} from "zod";
import {ProductComponentRoleSchema} from "./product-policy-media.js";
const id=z.string().trim().min(1).max(128);
/** Absent on legacy evidence means PRODUCT only. Never infer a component from its parent. */
export const SizeFitTargetV1Schema=z.discriminatedUnion("kind",[
 z.object({kind:z.literal("PRODUCT"),productId:id}).strict(),
 z.object({kind:z.literal("COMPONENT"),parentProductId:id,componentProductId:id,componentRole:ProductComponentRoleSchema}).strict(),
]);
export type SizeFitTargetV1=z.infer<typeof SizeFitTargetV1Schema>;
export function sizeFitTargetKey(target:SizeFitTargetV1):string {
 return target.kind==="PRODUCT"?target.productId:JSON.stringify([target.parentProductId,target.componentProductId,target.componentRole]);
}
export function sameSizeFitTarget(a:SizeFitTargetV1,b:SizeFitTargetV1):boolean {
 return a.kind===b.kind&&sizeFitTargetKey(a)===sizeFitTargetKey(b);
}
