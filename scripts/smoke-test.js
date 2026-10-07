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
  assert.strictEqual(data.master.length, 208, 'Master record count changed unexpectedly');
  assert.strictEqual(new Set(data.master.map((item) => item.sr)).size, data.master.length, 'Duplicate serial numbers');
  for (const item of data.master) {
    for (const key of ['sr', 'desc', 'hsn', 'cat', 'flag', 'note', 'ref']) {
      assert.ok(String(item[key] ?? '').trim(), `Master ${item.sr || '?'} is missing ${key}`);
    }
  }
  assert.ok(data.master.some((item) => String(item.hsn).includes('85176290')), 'HSN 85176290 is missing');
  assert.ok(data.master.some((item) => String(item.hsn).includes('85181000') && item.flag === 'T3'), 'HSN 85181000 T3 record is missing');
  for (const sac of ['998313', '998315', '998319', '998333', '998336', '998337', '998338', '998361', '998371', '997112', '997134', '996712', '996743', '996811', '996911', '996921']) {
    assert.ok(data.master.some((item) => String(item.hsn).includes(sac)), `SAC ${sac} is missing`);
  }
  const legal = data.master.find((item) => item.sr === 'E39');
  assert.ok(legal && legal.flag !== 'EX' && String(legal.hsn).includes('998212'), 'Legal-service classification was not corrected');
  assert.ok(data.master.filter((item) => ['5', '6', 'E42'].includes(item.sr)).every((item) => item.hsn === '996791'), 'GTA rows must use exact SAC 996791');
  for (const sac of ['996512', '996421', '997313', '997319', '997221', '998631', '998711', '998712', '998715', '998729', '998731', '998735', '998739', '998873', '998882', '998112']) {
    assert.ok(data.master.some((item) => String(item.hsn).includes(sac)), `Railway-relevant SAC ${sac} is missing`);
  }
  for (const hsn of ['4406', '2516', '25151210', '2523', '8704', '4011', '8511', '8415']) {
    assert.ok(data.master.some((item) => String(item.hsn).includes(hsn) && item.flag === 'T3'), `Railway input-goods HSN ${hsn} T3 record is missing`);
  }
  assert.ok(data.master.some((item) => String(item.hsn).includes('998349')), 'SAC 998349 is missing');
  const rbaRateFaq = data.procurementFaq.filter((item) => item.c === 'RBA 27/2025 - Rate Transition');
  assert.strictEqual(rbaRateFaq.length, 12, 'RBA 27/2025 transition FAQ must contain all 12 questions');
  assert.ok(rbaRateFaq.some((item) => /e-way bill/i.test(item.q)), 'RBA 27/2025 e-way bill FAQ is missing');

  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(index, /assets\/css\/portal\.css/);
  assert.match(index, /assets\/js\/data\.js/);
  assert.match(index, /assets\/js\/app\.js/);
  assert.match(index, /class="master-table"/);
  const app = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'app.js'), 'utf8');
  assert.match(app, /function toggleMasterDetail/);
  assert.match(app, /master-detail-row/);

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
