#!/usr/bin/env bash

if [[ -f '.eslintrc.js' ]]; then
    for folder in $@
    do
        npx eslint $folder
    done
fi

if [[ -f 'tsconfig.json' ]]; then
    npx tsc --noEmit
fi

if [[ -f 'node_modules/vue-tsc/package.json' ]]; then
    npx vue-tsc --noEmit
fi
