#!/usr/bin/env bash
set -euo pipefail
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=track-b-0036-preprod-common.sh
source "$script_dir/track-b-0036-preprod-common.sh"

require_common_tools
require_source_identity

verify_0036_schema_named "$EXPECTED_DATABASE"
test "$(database_query "SELECT count(*) FROM df13_commerce_authority_fences")" = "0" || die "unexpected authority fence evidence exists"
test "$(database_query "SELECT count(*) FROM df13_commerce_cutover_fences")" = "0" || die "unexpected cutover fence evidence exists"
test "$(database_query "SELECT p.pointer_revision || '|' || v.mode_version_id || '|' || v.authority_bundle_hash FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id WHERE p.page_id='$EXPECTED_PAGE_ID' AND p.channel='$EXPECTED_CHANNEL'")" = "$EXPECTED_POINTER_REVISION|$EXPECTED_MODE_VERSION|$EXPECTED_AUTHORITY_BUNDLE" || die "migration changed behavior pointer"
printf '%s\n' "TRACK_B_0036_PREPROD_SCHEMA_VERIFIED"
