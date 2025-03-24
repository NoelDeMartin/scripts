#!/usr/bin/env bash

set -e
npm pack
npx publint *.tgz
npx attw *.tgz --profile esm-only
