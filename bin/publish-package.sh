#!/usr/bin/env bash

# Validate environment
if ! command -v vp >/dev/null 2>&1; then
    echo "Vite+ (vp) is required to publish packages"
    exit 1
fi

if [[ $(git status --short) ]]; then
    echo "Git working directory not clean"
    exit 1
fi

if ! node -e "process.exit(require('./package.json').scripts?.build ? 0 : 1)"; then
    echo "Package has no build script (use something like \"build\": \"echo 'Nothing to build'\" if it doesn't need one)"
    exit 1
fi

# Abort on errors
set -e

# Parse arguments
PUBLISH_TAG="next"
for arg in "$@"; do
    if [ "$arg" == "--latest" ]; then
        PUBLISH_TAG="latest"
    fi
done

# Update version only if not publishing as latest
if [ "$PUBLISH_TAG" != "latest" ]; then
    hash=$(git rev-parse HEAD)
    packagespacing=$(head -n 2 package.json | tail -n 1 | grep -o -E "^\s+")
    current_version=$(grep -Po "(?<=\"version\"\: \")\d+\.\d+\.\d+(?=\")" <package.json)
    new_version="$current_version-next.$hash"

    sed -i "s/^$packagespacing\"version\"\: \"$current_version\"/$packagespacing\"version\"\: \"$new_version\"/" package.json
fi

# Build & Publish
vp run build
vp pm publish --no-git-checks --tag "$PUBLISH_TAG"

# Clean up
git checkout .
