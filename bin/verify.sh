#!/usr/bin/env bash

npm pack
npx publint *.tgz
npx attw *.tgz --profile esm-only
