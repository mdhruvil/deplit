#!/usr/bin/env bash

npm i -g pnpm

pnpx drizzle-kit migrate

pm2 start dist/index.cjs --no-daemon