import { ADMIN_ROLE_TO_DATASET_ROLE, type DatasetRoleV1 } from "@lana/contracts";
import type { AdminIdentity } from "./types.js";

// Admin roles map onto dataset-review roles (see ADMIN_ROLE_TO_DATASET_ROLE):
// OWNER→DATASET_ADMIN, APPROVER→ADJUDICATOR, EDITOR→ANNOTATOR, VIEWER→
// BENCHMARK_VIEWER. Permission is a simple monotone ladder — a higher role can
// do everything a lower one can.
const DATASET_ROLE_LEVEL: Readonly<Record<DatasetRoleV1, number>> = {
  BENCHMARK_VIEWER: 0,
  ANNOTATOR: 1,
  ADJUDICATOR: 2,
  DATASET_ADMIN: 3,
};

export function datasetRoleFor(identity: AdminIdentity): DatasetRoleV1 {
  return ADMIN_ROLE_TO_DATASET_ROLE[identity.role];
}

export function datasetRoleAtLeast(
  identity: AdminIdentity,
  minimum: DatasetRoleV1,
): boolean {
  return DATASET_ROLE_LEVEL[datasetRoleFor(identity)] >= DATASET_ROLE_LEVEL[minimum];
}
