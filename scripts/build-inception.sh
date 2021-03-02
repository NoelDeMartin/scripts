#!/usr/bin/env bash

rm node_modules/@noeldemartin/scripts -rf
rollup -c
cp package.json node_modules/@noeldemartin/scripts
mkdir node_modules/@noeldemartin/scripts/config
cp config/rollup.config.js node_modules/@noeldemartin/scripts/config
