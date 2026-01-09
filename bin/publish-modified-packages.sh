#!/usr/bin/env bash

# Abort on errors
set -e

# Parse arguments
if git log -1 --format=%B HEAD | grep -q "\[publish all\]"; then
    echo "Publishing all packages..."
    PACKAGES=$(ls -d packages/*/ | xargs -n1 basename | sort)
else
    echo "Publishing only modified packages..."
    PACKAGES=$(git diff-tree --no-commit-id --name-only -r HEAD | grep "^packages/" | cut -d/ -f2 | sort -u)
fi

# Publish packages
for package in $PACKAGES; do
    echo "Publishing $package..."
    cd "packages/$package"
    pnpm exec noeldemartin-publish-package
    cd ../..
done
