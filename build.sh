#!/bin/sh
set -e
rm -rf dist
mkdir -p dist/css dist/js
cp *.html dist/
cp -r css/. dist/css/
cp -r js/. dist/js/
cp "usa-logo.png" dist/
