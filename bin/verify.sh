#!/usr/bin/env bash

set -e

# Parse arguments
ATTW_ARGS=()
while [ $# -gt 0 ]; do
    if [ "$1" == "--exclude-entrypoints" ] && [ $# -gt 1 ]; then
        ATTW_ARGS+=(--exclude-entrypoints "$2")
        shift
    fi

    shift
done

# Run checks
pnpm pack
pnpm exec publint ./*.tgz
pnpm exec attw ./*.tgz --profile esm-only "${ATTW_ARGS[@]}"
