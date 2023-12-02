#!/usr/bin/env bash

# validate status
if [[ $(git status --short) ]]; then
    echo "Git working directory not clean"
    exit
fi

# abort on errors
set -e

# test code
if [[ -f '.eslintrc.js' ]] || grep -q "eslintConfig" package.json; then
    npm run lint
fi

if [[ -f 'jest.config.js' ]]; then
    npm run test
fi

# update version
hash=$(git rev-parse HEAD)
packagespacing=$(head -n 2 package.json | tail -n 1 | grep -o -E "^\s+")
current_version=$(grep -Po "(?<=\"version\"\: \")\d.\d.\d(?=\")" < package.json)
new_version="$current_version-next.$hash"

sed -i "s/^$packagespacing\"version\"\: \"$current_version\"/$packagespacing\"version\"\: \"$new_version\"/" package.json

if [[ -f 'package-lock.json' ]]; then
    packagelockspacing=$(head -n 2 package.json | tail -n 1 | grep -o -E "^\s+")

    sed -i "s/^$packagelockspacing\"version\"\: \"$current_version\"/$packagelockspacing\"version\"\: \"$new_version\"/" package-lock.json
fi

# build
if npm run | grep -q "build"; then
    npm run build
fi

# publish
npm publish --tag next

# clean up
git checkout .
