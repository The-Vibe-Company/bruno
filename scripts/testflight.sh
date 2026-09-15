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
: "${ASC_APP_PROFILE_ID:?Missing ASC_APP_PROFILE_ID}"
: "${ASC_WIDGET_PROFILE_ID:?Missing ASC_WIDGET_PROFILE_ID}"
test -s "$ASC_PRIVATE_KEY_PATH"

xcodegen generate --spec ios/project.yml
asc xcode version edit --project ios/Bruno.xcodeproj \
  --next-build-number --app "$ASC_APP_ID" --platform IOS

artifacts="$(mktemp -d "${RUNNER_TEMP:-/tmp}/bruno-testflight.XXXXXX")"
asc profiles download --id "$ASC_APP_PROFILE_ID" --output "$artifacts/app.mobileprovision"
asc profiles download --id "$ASC_WIDGET_PROFILE_ID" --output "$artifacts/widget.mobileprovision"
asc profiles local install --path "$artifacts/app.mobileprovision" --force
asc profiles local install --path "$artifacts/widget.mobileprovision" --force
# Read UUIDs from Apple's signed profiles; app and widget have distinct profiles.
app_profile=$(security cms -D -i "$artifacts/app.mobileprovision" | plutil -extract UUID raw -o - -)
widget_profile=$(security cms -D -i "$artifacts/widget.mobileprovision" | plutil -extract UUID raw -o - -)

asc xcode archive --project ios/Bruno.xcodeproj --scheme Bruno \
  --configuration Release --archive-path "$artifacts/Bruno.xcarchive" \
  --xcodebuild-flag=-destination --xcodebuild-flag=generic/platform=iOS \
  --xcodebuild-flag="DEVELOPMENT_TEAM=$APPLE_TEAM_ID" \
  --xcodebuild-flag='CODE_SIGN_IDENTITY=Apple Distribution' \
  --xcodebuild-flag=CODE_SIGN_STYLE=Manual \
  --xcodebuild-flag="BRUNO_APP_PROFILE=$app_profile" \
  --xcodebuild-flag="BRUNO_WIDGET_PROFILE=$widget_profile"

python3 - "$artifacts/ExportOptions.plist" "$APPLE_TEAM_ID" "$app_profile" "$widget_profile" <<'PY'
import plistlib, sys
path, team, app, widget = sys.argv[1:]
with open(path, "wb") as output:
    plistlib.dump({
        "method": "app-store-connect", "destination": "export",
        "teamID": team, "signingStyle": "manual",
        "signingCertificate": "Apple Distribution",
        "manageAppVersionAndBuildNumber": False,
        "provisioningProfiles": {
            "co.thevibecompany.bruno": app,
            "co.thevibecompany.bruno.widget": widget,
        },
    }, output)
PY
asc xcode export --archive-path "$artifacts/Bruno.xcarchive" \
  --ipa-path "$artifacts/Bruno.ipa" --export-options "$artifacts/ExportOptions.plist"

# Explicit internal group: wait for Apple's processing before distributing.
asc publish testflight --app "$ASC_APP_ID" --ipa "$artifacts/Bruno.ipa" \
  --group "$TESTFLIGHT_GROUP_ID" --wait --timeout 30m \
  --test-notes "Bruno — $(git rev-parse --short HEAD)" --locale fr-FR \
  --output json | tee "$artifacts/testflight.json"

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '### TestFlight\n\nBuild traité et distribué au groupe interne.\n\n[App Store Connect](https://appstoreconnect.apple.com/apps/%s/testflight)\n' "$ASC_APP_ID" >> "$GITHUB_STEP_SUMMARY"
fi
printf 'Artifacts: %s\n' "$artifacts"
