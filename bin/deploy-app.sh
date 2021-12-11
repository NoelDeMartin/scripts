#!/usr/bin/env bash

# validate arguments
repository=$1
domain=$2

if [[ -z $repository || -z $domain ]]; then
    echo "Arguments missing"
    exit
fi

# abort on errors
set -e

# build
rm -rf dist
npm run build

# navigate into the build output directory
cd dist

# prepare github pages
echo $domain > CNAME
touch .nojekyll

# publish
git init
git checkout -b main
git add -A
git commit -m 'deploy'
git push -f "git@github.com:$repository.git" main:gh-pages

cd -
