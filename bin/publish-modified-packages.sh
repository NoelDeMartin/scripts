#!/usr/bin/env bash

# Abort on errors
set -e

# Find packages modified in the last commit
PACKAGES=$(git diff-tree --no-commit-id --name-only -r HEAD | grep "^packages/" | cut -d/ -f2 | sort -u)

# Publish packages
for package in $PACKAGES; do
    echo "Publishing $package..."
    cd "packages/$package"
    vp exec noeldemartin-publish-package
    cd ../..
done
