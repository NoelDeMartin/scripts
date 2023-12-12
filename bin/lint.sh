#!/usr/bin/env bash

set -e

# ESLint
if [[ -f '.eslintrc.js' ]] || grep -q "eslintConfig" package.json; then
    for folder in "$@"
    do
        echo "Running eslint for $folder..."
        npx eslint "$folder"
    done
fi

# TypeScript
if [[ -f 'tsconfig.json' ]]; then
    echo "Running tsc..."
    npx tsc --noEmit

    # Vue
    dir=$(pwd)
    vue_files_count=$(find "$dir" -iname "*.vue" | grep -v "node_modules" | wc -l)

    if [ "$vue_files_count" != 0 ]; then

        while [ "$dir" != "/" ] && [ ! -f "$dir/node_modules/vue-tsc/package.json" ]; do
            dir=$(dirname "$dir")
        done

        if [ "$dir" != "/" ]; then
            echo "Running vue-tsc..."
            npx vue-tsc --noEmit
        fi

    fi

fi
