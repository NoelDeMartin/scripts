#!/usr/bin/env bash

set -e

# Parse arguments
ATTW_ARGS=""
i=1
while [ $i -le $# ]; do
    arg="${!i}"

    if [ "$arg" == "--exclude-entrypoints" ]; then
        if [ $((i + 1)) -le $# ]; then
            next_arg=$(eval echo \$$((i + 1)))
            ATTW_ARGS="$ATTW_ARGS --exclude-entrypoints $next_arg"
            i=$((i + 1))
        fi
    fi

    i=$((i + 1))
done

# Run checks
npm pack
npx publint *.tgz
npx attw *.tgz --profile esm-only $ATTW_ARGS
