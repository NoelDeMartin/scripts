#!/usr/bin/env bash
dir=$(pwd)

while [ "$dir" != "/" ] && [ ! -f "$dir/node_modules/@noeldemartin/scripts/config/rollup.config.js" ]; do
    dir=$(dirname "$dir")
done

if [ "$dir" == "/" ]; then
    echo "node_modules folder with @noeldemartin/scripts was not found."
    exit 1
fi

npx rollup -c "$dir/node_modules/@noeldemartin/scripts/config/rollup.config.js"
