'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const data = require('../assets/js/data.js');
const { createServer } = require('../server.js');

function get(port, pathname) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path: pathname }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

async function run() {
  assert.strictEqual(data.master.length, 165, 'Master record count changed unexpectedly');
  assert.strictEqual(new Set(data.master.map((item) => item.sr)).size, data.master.length, 'Duplicate serial numbers');
  for (const item of data.master) {
    for (const key of ['sr', 'desc', 'hsn', 'cat', 'flag', 'note', 'ref']) {
      assert.ok(String(item[key] ?? '').trim(), `Master ${item.sr || '?'} is missing ${key}`);
    }
  }
  assert.ok(data.master.some((item) => String(item.hsn).includes('85176290')), 'HSN 85176290 is missing');
  assert.ok(data.master.some((item) => String(item.hsn).includes('85181000') && item.flag === 'T3'), 'HSN 85181000 T3 record is missing');
  assert.ok(data.master.some((item) => String(item.hsn).includes('998349')), 'SAC 998349 is missing');

  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(index, /assets\/css\/portal\.css/);
  assert.match(index, /assets\/js\/data\.js/);
  assert.match(index, /assets\/js\/app\.js/);

  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const health = await get(port, '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(JSON.parse(health.body).status, 'ok');

    const page = await get(port, '/');
    assert.strictEqual(page.status, 200);
    assert.match(page.body, /Railway GST ITC Flagging Reference/);

    const hsn = await get(port, '/api/v1/master?hsn=85176290');
    assert.strictEqual(hsn.status, 200);
    assert.ok(JSON.parse(hsn.body).count >= 1);

    const sac = await get(port, '/api/v1/search?q=998349');
    assert.strictEqual(sac.status, 200);
    assert.ok(JSON.parse(sac.body).counts.master >= 1);

    const blocked = await get(port, '/api/v1/master?flag=T3');
    assert.strictEqual(blocked.status, 200);
    assert.ok(JSON.parse(blocked.body).items.every((item) => item.flag === 'T3'));

    const traversal = await get(port, '/..%2FREADME.md');
    assert.strictEqual(traversal.status, 403);

    const hiddenFile = await get(port, '/.git/config');
    assert.strictEqual(hiddenFile.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(`Smoke tests passed: ${data.master.length} master records and all API/static checks.`);
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
