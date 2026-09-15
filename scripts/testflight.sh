#!/usr/bin/env bash
set -euo pipefail

# The same asc pipeline is used locally and by GitHub Actions.
cd "$(dirname "$0")/.."
: "${ASC_APP_ID:?Missing ASC_APP_ID}"
: "${APPLE_TEAM_ID:?Missing APPLE_TEAM_ID}"
: "${ASC_KEY_ID:?Missing ASC_KEY_ID}"
: "${ASC_ISSUER_ID:?Missing ASC_ISSUER_ID}"
: "${ASC_PRIVATE_KEY_PATH:?Missing ASC_PRIVATE_KEY_PATH}"
: "${TESTFLIGHT_GROUP_ID:?Missing TESTFLIGHT_GROUP_ID}"
test -s "$ASC_PRIVATE_KEY_PATH"

xcodegen generate --spec ios/project.yml
asc xcode version edit --project ios/Bruno.xcodeproj \
  --next-build-number --app "$ASC_APP_ID" --platform IOS

artifacts="$(mktemp -d "${RUNNER_TEMP:-/tmp}/bruno-testflight.XXXXXX")"
auth_flags=(
  --xcodebuild-flag=-allowProvisioningUpdates
  --xcodebuild-flag=-authenticationKeyPath --xcodebuild-flag="$ASC_PRIVATE_KEY_PATH"
  --xcodebuild-flag=-authenticationKeyID --xcodebuild-flag="$ASC_KEY_ID"
  --xcodebuild-flag=-authenticationKeyIssuerID --xcodebuild-flag="$ASC_ISSUER_ID"
)

asc xcode archive --project ios/Bruno.xcodeproj --scheme Bruno \
  --configuration Release --archive-path "$artifacts/Bruno.xcarchive" \
  --xcodebuild-flag=-destination --xcodebuild-flag=generic/platform=iOS \
  --xcodebuild-flag="DEVELOPMENT_TEAM=$APPLE_TEAM_ID" \
  --xcodebuild-flag='CODE_SIGN_IDENTITY=Apple Distribution' \
  "${auth_flags[@]}"

asc xcode export --archive-path "$artifacts/Bruno.xcarchive" \
  --ipa-path "$artifacts/Bruno.ipa" --team-id "$APPLE_TEAM_ID" \
  "${auth_flags[@]}"

# Explicit internal group: wait for Apple's processing before distributing.
asc publish testflight --app "$ASC_APP_ID" --ipa "$artifacts/Bruno.ipa" \
  --group "$TESTFLIGHT_GROUP_ID" --wait --timeout 30m \
  --test-notes "Bruno — $(git rev-parse --short HEAD)" --locale fr-FR \
  --output json | tee "$artifacts/testflight.json"

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '### TestFlight\n\nBuild traité et distribué au groupe interne.\n\n[App Store Connect](https://appstoreconnect.apple.com/apps/%s/testflight)\n' "$ASC_APP_ID" >> "$GITHUB_STEP_SUMMARY"
fi
printf 'Artifacts: %s\n' "$artifacts"
