#!/usr/bin/env node
// Serve the generated node lists the way the addnodes vhost does, so what you
// test locally is what wallets will actually fetch.
//
// It deliberately mirrors nginx rather than just exposing the directory:
// the two cycy-compatible aliases (`/` and `/testnet`) exist only in the
// vhost, so a plain static server would 404 on exactly the paths every
// existing wallet config already points at.
//
//   npm run serve:out            # serves ./out on :8099
//   npm run serve:out -- 9000 ./somewhere-else
//
// Keep the route table below in step with
// grc-infra/prod-gridconin-club/nginx/addnodes.gridcoin.club.conf.example.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

const port = Number(process.argv[2]) || 8099;
const root = path.resolve(process.argv[3] || 'out');

// Exact-match aliases, matching the vhost's `location =` blocks.
const ALIASES = new Map([
  ['/', 'mainnet.txt'],
  ['/testnet', 'testnet.txt'],
  ['/status', 'status.json'],
]);

// Everything else is served by filename, so the URL and the file agree.
const SERVED = new Set([
  'mainnet.txt', 'testnet.txt',
  'mainnet.json', 'testnet.json',
  'mainnet-all.json', 'testnet-all.json',
  'status.json', 'robots.txt', 'llms.txt',
]);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const file = ALIASES.get(url.pathname) ?? url.pathname.slice(1);

  if (!SERVED.has(file)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
    return;
  }

  try {
    const body = await readFile(path.join(root, file));
    res.writeHead(200, {
      'content-type': file.endsWith('.json')
        ? 'application/json; charset=utf-8'
        : 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=900',
    });
    res.end(body);
  } catch {
    // try_files ... =503 in the vhost: a missing file means the generator is
    // broken, not that the endpoint does not exist.
    res.writeHead(503, { 'content-type': 'text/plain' });
    res.end('list unavailable\n');
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`serving ${root} on http://127.0.0.1:${port}\n`);
  for (const p of [...ALIASES.keys(), ...[...SERVED].map((f) => `/${f}`)]) {
    process.stdout.write(`  http://127.0.0.1:${port}${p}\n`);
  }
});
