#!/bin/bash
[ -e CodeCoverage ] && rm -r CodeCoverage
mkdir tmp
cd tmp
curl https://www.nuget.org/api/v2/package/Microsoft.CodeCoverage/16.0.1 -L -o microsoft.coverage.nupkg
unzip microsoft.coverage.nupkg
cp -r build/netstandard1.0/CodeCoverage ..
cd ..
rm -r tmp
