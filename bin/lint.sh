#!/usr/bin/env bash

if [[ -f '.eslintrc.js' ]]; then
    for folder in $@
    do
        echo "Running eslint for $folder..."
        npx eslint $folder
    done
fi

if [[ -f 'tsconfig.json' ]]; then
    echo "Running tsc..."
    npx tsc --noEmit
fi

if [[ -f 'node_modules/vue-tsc/package.json' ]]; then
    echo "Running vue-tsc..."
    npx vue-tsc --noEmit
fi
