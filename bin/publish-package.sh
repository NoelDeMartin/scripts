#!/usr/bin/env bash

# Validate status
if [[ $(git status --short) ]]; then
    echo "Git working directory not clean"
    exit
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
    current_version=$(grep -Po "(?<=\"version\"\: \")\d.\d.\d(?=\")" < package.json)
    new_version="$current_version-next.$hash"

    sed -i "s/^$packagespacing\"version\"\: \"$current_version\"/$packagespacing\"version\"\: \"$new_version\"/" package.json

    if [[ -f 'package-lock.json' ]]; then
        packagelockspacing=$(head -n 2 package.json | tail -n 1 | grep -o -E "^\s+")

        sed -i "s/^$packagelockspacing\"version\"\: \"$current_version\"/$packagelockspacing\"version\"\: \"$new_version\"/" package-lock.json
    fi
fi

# Build
if npm run | grep -q "build"; then
    npm run build
fi

# Publish
if [ "$PUBLISH_TAG" == "latest" ]; then
    npm publish
else
    npm publish --tag next
fi

# Clean up
git checkout .
