#!/usr/bin/env bash

set -e

# ESLint
if [[ -f '.eslintrc.js' ]]; then
    for folder in $@
    do
        echo "Running eslint for $folder..."
        npx eslint $folder
    done
fi

# TypeScript
if [[ -f 'tsconfig.json' ]]; then
    echo "Running tsc..."
    npx tsc --noEmit
fi

# Vue
dir=`pwd`

while [ $dir != "/" ] && [ ! -f "$dir/node_modules/vue-tsc/package.json" ]; do
    dir=`dirname $dir`
done

if [ $dir != "/" ]; then
    echo "Running vue-tsc..."
    npx vue-tsc --noEmit
fi
