#!/usr/bin/env bash
dir=`pwd`

while [ $dir != "/" ] && [ ! -d "$dir/node_modules" ]; do
    dir=`dirname $dir`
done

if [ $dir == "/" ]; then
    echo "node_modules folder not found."
    exit 1
fi

npx rollup -c "$dir/node_modules/@noeldemartin/scripts/config/rollup.config.js"
