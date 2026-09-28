'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const portalData = require('./assets/js/data.js');

const ROOT = __dirname;
const API_PREFIX = '/api/v1';
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': contentType.startsWith('application/json') ? 'no-store' : 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  res.end(payload);
}

function contains(value, query) {
  return String(value ?? '').toLowerCase().includes(query.toLowerCase());
}

function exact(value, query) {
  return !query || String(value ?? '').toLowerCase() === query.toLowerCase();
}

function filterMaster(searchParams) {
  const q = searchParams.get('q') || '';
  const hsn = searchParams.get('hsn') || '';
  const flag = searchParams.get('flag') || '';
  const category = searchParams.get('category') || '';
  const fund = searchParams.get('fund') || '';
  const endUse = searchParams.get('endUse') || '';
  const changed = searchParams.get('changed') || '';

  return portalData.master.filter((item) => {
    const searchable = Object.values(item).join(' ');
    return (!q || contains(searchable, q))
      && (!hsn || contains(item.hsn, hsn))
      && exact(item.flag, flag)
      && exact(item.cat, category)
      && exact(item.fund, fund)
      && (!endUse || exact(item.enduse || item.eu, endUse))
      && (!changed || contains(`${item.gst} ${item.note}`, changed));
  });
}

function apiResponse(req, res, url) {
  if (req.method !== 'GET') {
    send(res, 405, { error: 'method_not_allowed', message: 'This API is read-only.' });
    return true;
  }

  if (url.pathname === '/api/health') {
    send(res, 200, { status: 'ok', service: 'nrgstitc', schemaVersion: portalData.meta.schemaVersion });
    return true;
  }
  if (url.pathname === `${API_PREFIX}/meta`) {
    send(res, 200, { ...portalData.meta, counts: {
      master: portalData.master.length,
      procurementFaq: portalData.procurementFaq.length,
      circulars: portalData.circulars.length,
      construction: portalData.construction.length
    } });
    return true;
  }
  if (url.pathname === `${API_PREFIX}/master`) {
    const items = filterMaster(url.searchParams);
    send(res, 200, { count: items.length, items });
    return true;
  }
  if (url.pathname.startsWith(`${API_PREFIX}/master/`)) {
    const sr = decodeURIComponent(url.pathname.slice(`${API_PREFIX}/master/`.length));
    const item = portalData.master.find((entry) => String(entry.sr) === sr);
    send(res, item ? 200 : 404, item || { error: 'not_found', message: `No master record found for serial ${sr}.` });
    return true;
  }
  if (url.pathname === `${API_PREFIX}/faqs`) {
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    const items = portalData.procurementFaq.filter((item) => (
      (!q || contains(`${item.q} ${item.a}`, q)) && (!category || exact(item.c, category))
    ));
    send(res, 200, { count: items.length, items });
    return true;
  }
  if (url.pathname === `${API_PREFIX}/circulars`) {
    send(res, 200, { count: portalData.circulars.length, items: portalData.circulars });
    return true;
  }
  if (url.pathname === `${API_PREFIX}/construction`) {
    send(res, 200, { count: portalData.construction.length, items: portalData.construction });
    return true;
  }
  if (url.pathname === `${API_PREFIX}/search`) {
    const q = url.searchParams.get('q') || '';
    if (!q.trim()) {
      send(res, 400, { error: 'missing_query', message: 'Provide the q query parameter.' });
      return true;
    }
    const master = portalData.master.filter((item) => contains(Object.values(item).join(' '), q));
    const faqs = portalData.procurementFaq.filter((item) => contains(`${item.q} ${item.a}`, q));
    const circulars = portalData.circulars.filter((item) => contains(`${item.title} ${item.body}`, q));
    send(res, 200, { query: q, counts: { master: master.length, faqs: faqs.length, circulars: circulars.length }, master, faqs, circulars });
    return true;
  }
  return false;
}

function serveStatic(res, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    send(res, 400, { error: 'bad_request', message: 'Invalid URL encoding.' });
    return;
  }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const segments = relative.split(/[\\/]+/);
  if (segments.some((segment) => segment.startsWith('.')) || segments.includes('node_modules')) {
    send(res, 403, { error: 'forbidden' });
    return;
  }
  const filePath = path.resolve(ROOT, relative);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    send(res, 403, { error: 'forbidden' });
    return;
  }
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      send(res, 404, { error: 'not_found', message: 'Resource not found.' });
      return;
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/') && !apiResponse(req, res, url)) {
      send(res, 404, { error: 'not_found', message: 'API endpoint not found.' });
      return;
    }
    if (!url.pathname.startsWith('/api/')) serveStatic(res, url.pathname);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`NR GST ITC portal: http://localhost:${port}`);
  });
}

module.exports = { createServer, filterMaster };
