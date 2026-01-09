#!/usr/bin/env bash

# Optional domain
domain=$1

# Abort on errors
set -e

# Build
rm -rf dist
pnpm build

# Navigate into the build output directory
cd dist

# Prepare github pages
if [[ -n $domain ]]; then
    echo "$domain" > CNAME
fi

touch .nojekyll

# Publish
git init
git config user.name 'github-actions[bot]'
git config user.email 'github-actions[bot]@users.noreply.github.com'
git checkout -b gh-pages
git add -A
git commit -m 'deploy'
git push -f https://${GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git gh-pages

cd -
