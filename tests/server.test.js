const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');

process.env.QR_SIGNING_SECRET = 'test-signing-secret';

const {
  createServer,
  extractVerificationToken,
  readQrPayload,
  requireRegisteredScannerDevice,
  scanAction,
  signQrPayload,
  shouldRotateVerificationToken
} = require('../server');

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function snapshotFile(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function restoreFile(file, snapshot) {
  if (snapshot === null) {
    fs.rmSync(file, { force: true });
    return;
  }
  fs.writeFileSync(file, snapshot);
}

test('signed QR payloads resolve to the original verification token', () => {
  const qrToken = signQrPayload({ id: 'JIX/DEV/001', verificationToken: 'plain-secret-token' });
  const parsed = readQrPayload(qrToken);

  assert.equal(parsed.signed, true);
  assert.equal(parsed.cardId, 'JIX/DEV/001');
  assert.equal(parsed.verificationToken, 'plain-secret-token');
});

test('tampered signed QR payloads are rejected', () => {
  const qrToken = signQrPayload({ id: 'JIX/DEV/001', verificationToken: 'plain-secret-token' });
  const tampered = qrToken.replace(/.$/, qrToken.endsWith('a') ? 'b' : 'a');
  const parsed = readQrPayload(tampered);

  assert.equal(parsed.signed, true);
  assert.equal(parsed.invalidSignature, true);
  assert.equal(parsed.verificationToken, '');
});

test('signed QR URLs can be parsed from scanned card links', () => {
  const qrToken = signQrPayload({ id: 'JIX/DEV/001', verificationToken: 'plain-secret-token' });
  const parsed = extractVerificationToken(`https://example.test/?token=${encodeURIComponent(qrToken)}`);

  assert.equal(parsed.signed, true);
  assert.equal(parsed.cardId, 'JIX/DEV/001');
  assert.equal(parsed.verificationToken, 'plain-secret-token');
});

test('scan actions use company sign in and sign out wording', () => {
  assert.equal(scanAction('sign-in'), 'sign-in');
  assert.equal(scanAction('signin'), 'sign-in');
  assert.equal(scanAction('sign-out'), 'sign-out');
  assert.equal(scanAction('signout'), 'sign-out');
  assert.equal(scanAction('enter'), '');
  assert.equal(scanAction('leave'), '');
});

test('inactive, suspended, and lost statuses rotate verification tokens', () => {
  assert.equal(shouldRotateVerificationToken('Inactive'), true);
  assert.equal(shouldRotateVerificationToken('Suspended'), true);
  assert.equal(shouldRotateVerificationToken('Lost'), true);
  assert.equal(shouldRotateVerificationToken('Approved'), false);
});

test('local QR endpoint returns SVG without external service dependency', async () => {
  const server = createServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/qr?data=${encodeURIComponent('hello')}`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /image\/svg\+xml/);
    assert.match(body, /<svg/);
  } finally {
    await close(server);
  }
});

test('public pages and master link are served for deployment routes', async () => {
  const server = createServer();
  const baseUrl = await listen(server);
  try {
    for (const path of ['/', '/admin', '/scanner']) {
      const response = await fetch(`${baseUrl}${path}`);
      const body = await response.text();

      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') || '', /text\/html/);
      assert.match(body, /Jixels/i);
    }

    const masterResponse = await fetch(`${baseUrl}/api/master-link`);
    const master = await masterResponse.json();

    assert.equal(masterResponse.status, 200);
    assert.match(master.url, /\?master=/);
    assert.match(master.url, /#apply$/);
  } finally {
    await close(server);
  }
});

test('backup rejects legacy GET requests', async () => {
  const server = createServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/backup`);
    const body = await response.json();

    assert.equal(response.status, 405);
    assert.match(body.error, /Use POST/);
  } finally {
    await close(server);
  }
});

test('backup requires the current admin password', async () => {
  const server = createServer();
  const baseUrl = await listen(server);
  try {
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '1234' })
    });
    const login = await loginResponse.json();

    assert.equal(loginResponse.status, 200);

    const response = await fetch(`${baseUrl}/api/backup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${login.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentPassword: 'wrong-password' })
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.match(body.error, /current admin password/i);
  } finally {
    await close(server);
  }
});

test('master registration accepts a large photo payload', async () => {
  const trackedFiles = ['cards-db.json', 'audit-log.json', 'master-config.json'];
  const snapshots = Object.fromEntries(trackedFiles.map((file) => [file, snapshotFile(file)]));
  const server = createServer();
  const baseUrl = await listen(server);
  try {
    const masterResponse = await fetch(`${baseUrl}/api/master-link`);
    const master = await masterResponse.json();

    assert.equal(masterResponse.status, 200);

    const masterUrl = new URL(master.url);
    const masterToken = masterUrl.searchParams.get('master');
    assert.ok(masterToken, 'Master token should be present in the master link URL.');
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const response = await fetch(`${baseUrl}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        masterToken,
        name: `Test Worker ${suffix}`,
        location: 'Nairobi',
        branch: 'HQ',
        nationalId: `NID-${suffix}`,
        phone: `070${String(Date.now()).slice(-7)}`,
        email: `worker-${suffix}@example.com`,
        position: 'Staff',
        photo: `data:image/png;base64,${'A'.repeat(9_000_000)}`
      })
    });
    const data = await response.json();

    assert.equal(response.status, 201);
    assert.equal(data.card.status, 'Pending');
    assert.match(data.card.qrToken, /^v1\./);
  } finally {
    await close(server);
    for (const file of trackedFiles) {
      restoreFile(file, snapshots[file]);
    }
  }
});

test('scan endpoint requires a registered scanner phone', async () => {
  const server = createServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'plain-secret-token', action: 'sign-in' })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /not registered/i);
  } finally {
    await close(server);
  }
});

test('scanner phone validation rejects unregistered devices', async () => {
  await assert.rejects(
    () => requireRegisteredScannerDevice({ deviceId: 'unregistered-phone' }),
    /not registered/i
  );
});
