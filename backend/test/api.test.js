import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Configure the app for the file store BEFORE it is imported (env is read at
// import time), so the tests never need a running MongoDB.
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = '';
const dataDir = await mkdtemp(join(tmpdir(), 'voltwise-test-'));
process.env.DATA_DIR = dataDir;

const { createApp } = await import('../src/app.js');

let server;
let base;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(dataDir, { recursive: true, force: true });
});

const api = async (path, options = {}) => {
  const res = await fetch(`${base}${path}`, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const sampleLoads = [
  { name: 'Borewell pumps', quantity: 4, ratedKw: 7.5, powerFactor: 0.82, demandFactor: 0.75, phases: 3 },
  { name: 'Air conditioners', quantity: 10, ratedKw: 2.2, powerFactor: 0.9, demandFactor: 0.8, phases: 1 },
  { name: 'Lighting', quantity: 1, ratedKw: 12, powerFactor: 0.95, demandFactor: 0.9, phases: 1 },
  { name: 'Lift', quantity: 2, ratedKw: 11, powerFactor: 0.8, demandFactor: 0.5, phases: 3 },
  { name: 'Workshop machines', quantity: 6, ratedKw: 5.5, powerFactor: 0.8, demandFactor: 0.6, phases: 3 },
  { name: 'Socket outlets', quantity: 1, ratedKw: 15, powerFactor: 0.9, demandFactor: 0.4, phases: 1 },
];

test('GET /api/health reports the active store', async () => {
  const { status, body } = await api('/api/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.store, 'file');
});

test('GET /api/reference returns the cable table', async () => {
  const { status, body } = await api('/api/reference');
  assert.equal(status, 200);
  assert.equal(body.cableTable.length, 15);
  assert.equal(body.cableTable[0].sizeSqmm, 2.5);
  assert.ok(body.transformerRatings.includes(160));
});

test('POST /api/estimate matches the reference Python result', async () => {
  const { status, body } = await api('/api/estimate', {
    method: 'POST',
    body: JSON.stringify({
      loads: sampleLoads,
      settings: { voltage: 415, diversityFactor: 1.15, derating: 0.9, cableLengthM: 60 },
    }),
  });
  assert.equal(status, 200);
  assert.equal(body.summary.demandKw, 87.7);
  assert.equal(body.summary.demandKva, 102.88);
  assert.ok(Math.abs(body.feeder.current - 124.5) < 0.2);
  assert.equal(body.cable.sizeSqmm, 35);
  assert.equal(body.transformer.kva, 160);
  assert.equal(body.breakdown.length, 6);
  assert.equal(body.meta.loadCount, 6);
});

test('POST /api/estimate rejects a bad power factor', async () => {
  const { status, body } = await api('/api/estimate', {
    method: 'POST',
    body: JSON.stringify({ loads: [{ name: 'Bad', quantity: 1, ratedKw: 5, powerFactor: 1.4 }] }),
  });
  assert.equal(status, 400);
  assert.match(body.error, /power factor/i);
});

test('POST /api/import/csv parses JSON and text/csv bodies', async () => {
  const csv = 'name,quantity,rated_kw,power_factor,demand_factor,phases\nPumps,2,7.5,0.82,0.75,3\n';

  const asJson = await api('/api/import/csv', { method: 'POST', body: JSON.stringify({ csv }) });
  assert.equal(asJson.status, 200);
  assert.equal(asJson.body.count, 1);
  assert.equal(asJson.body.loads[0].ratedKw, 7.5);

  const res = await fetch(`${base}/api/import/csv`, {
    method: 'POST',
    headers: { 'content-type': 'text/csv' },
    body: csv,
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).count, 1);
});

test('project lifecycle: create, read, update, estimate, delete', async () => {
  const created = await api('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ name: 'Sample apartment block', client: 'Voltwise', loads: sampleLoads }),
  });
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.ok(id);
  assert.equal(created.body.lastReport.cable.sizeSqmm, 35);

  const list = await api('/api/projects');
  assert.equal(list.body.count, 1);

  const fetched = await api(`/api/projects/${id}`);
  assert.equal(fetched.body.name, 'Sample apartment block');

  const updated = await api(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ settings: { diversityFactor: 1.4, cableLengthM: 120 } }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.settings.diversityFactor, 1.4);
  assert.ok(updated.body.lastReport.summary.maxDemandKva < 100);

  const reEstimated = await api(`/api/projects/${id}/estimate`, {
    method: 'POST',
    body: JSON.stringify({ settings: { cableLengthM: 400 } }),
  });
  assert.equal(reEstimated.status, 200);
  assert.equal(reEstimated.body.cable.limitedBy, 'voltage drop');

  const removed = await fetch(`${base}/api/projects/${id}`, { method: 'DELETE' });
  assert.equal(removed.status, 204);

  const gone = await api(`/api/projects/${id}`);
  assert.equal(gone.status, 404);
});

test('unknown routes return a JSON 404', async () => {
  const { status, body } = await api('/api/nope');
  assert.equal(status, 404);
  assert.match(body.error, /No route/);
});

test('GET /api lists the endpoints', async () => {
  const { status, body } = await api('/api');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.endpoints));
  assert.ok(body.endpoints.includes('POST /api/estimate'));
});

test('GET / serves the UI when built, otherwise explains how to get it', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  const type = res.headers.get('content-type') || '';
  const text = await res.text();
  if (type.includes('text/html')) {
    assert.match(text, /<div id="root">/);
  } else {
    assert.match(text, /web app is not built|Voltwise API/);
  }
});
