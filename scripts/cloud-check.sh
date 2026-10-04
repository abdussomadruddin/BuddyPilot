#!/usr/bin/env sh
set -eu
npm ci
npm run check
npm test
npx vercel build
