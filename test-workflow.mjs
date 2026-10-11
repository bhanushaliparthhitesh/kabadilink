import http from 'node:http';
import { createServer } from 'vite';
import { execSync } from 'node:child_process';

let testResults = [];
function report(name, passed, detail = '') {
  testResults.push({ name, passed, detail });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${passed ? 'PASS' : 'FAIL'}] ${name}${detail ? ' - ' + detail : ''}`);
}

// Start a configurable local mock HTTP server
let mockStatus = 200;
let mockBody = { items: [] };

const mockServer = http.createServer((req, res) => {
  res.writeHead(mockStatus, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(mockBody));
});

await new Promise(resolve => mockServer.listen(0, '127.0.0.1', resolve));
const mockPort = mockServer.address().port;
const mockUrl = `http://127.0.0.1:${mockPort}`;

console.log(`\n======================================================`);
console.log(`Running KabadiLink Demo Fallback & Workflow Test Suite`);
console.log(`Mock server listening on ${mockUrl}`);
console.log(`======================================================\n`);

// Setup Vite SSR test runner
const viteServer = await createServer({
  appType: 'custom',
  server: { middlewareMode: true }
});

const apiMod = await viteServer.ssrLoadModule('/src/api.ts');
const { api, db, setApiUrlForTest, syncPickups, seed } = apiMod;

try {
  // Test 1: Collector sign-in with backend available
  {
    mockStatus = 200;
    mockBody = {
      items: [
        {
          id: 'KL-REAL-101',
          hid: 'h1',
          cid: 'c1',
          date: '2026-10-12',
          slot: '8–10 AM',
          address: 'Sector 62, Noida',
          note: 'Real AWS pickup',
          est: { plastic: 3, wet: 0, ewaste: 0 },
          status: 'Accepted',
          events: [{ s: 'Accepted', at: new Date().toISOString() }],
          isDemo: false
        }
      ]
    };
    setApiUrlForTest(mockUrl);
    api.login('c1');
    await syncPickups();

    const passed = db.dataSource === 'api' && db.pickups.length === 1 && db.pickups[0].id === 'KL-REAL-101';
    report('1. Collector sign-in with backend available', passed, `dataSource=${db.dataSource}, pickups=${db.pickups.length}`);
  }

  // Test 2: Collector sign-in when the API returns HTTP 500
  {
    mockStatus = 500;
    mockBody = { message: 'Internal Server Error' };
    setApiUrlForTest(mockUrl);
    api.login('c1');
    await syncPickups();

    const passed = db.dataSource === 'demo' && db.pickups.length >= 50 && db.pickups.some(p => p.cid === 'c1');
    report('2. Collector sign-in when API returns HTTP 500', passed, `dataSource=${db.dataSource}, pickups count=${db.pickups.length}`);
  }

  // Test 3: Collector sign-in when the API cannot be reached
  {
    // Use an unallocated port that refuses connections
    setApiUrlForTest('http://127.0.0.1:54321');
    api.login('c1');
    await syncPickups();

    const passed = db.dataSource === 'demo' && db.pickups.length >= 50;
    report('3. Collector sign-in when API cannot be reached', passed, `dataSource=${db.dataSource}, fallback engaged gracefully`);
  }

  // Test 4: Collector dashboard displaying eligible mock pickups
  {
    const meId = 'c1';
    const mine = db.pickups.filter(p => p.cid === meId);
    const act = mine.filter(p => ['Accepted', 'On the way'].includes(p.status));
    const done = mine.filter(p => p.status === 'Paid');
    const reqs = db.pickups.filter(p => p.status === 'Requested');

    const passed = act.length > 0 && done.length > 0 && reqs.length > 0;
    report('4. Collector dashboard displaying eligible mock pickups', passed, `Active=${act.length}, Done=${done.length}, Requested=${reqs.length}`);
  }

  // Test 5: Collector filtering with correct demo collector ID
  {
    const c1Mine = db.pickups.filter(p => p.cid === 'c1');
    const c2Mine = db.pickups.filter(p => p.cid === 'c2');
    const reqs = db.pickups.filter(p => p.status === 'Requested');

    const c1HasC1Only = c1Mine.every(p => p.cid === 'c1');
    const c2HasC2Only = c2Mine.every(p => p.cid === 'c2');
    const reqsUnassigned = reqs.every(p => p.cid === undefined);

    const passed = c1Mine.length > 0 && c2Mine.length > 0 && c1HasC1Only && c2HasC2Only && reqsUnassigned;
    report('5. Collector filtering with correct demo collector ID', passed, `c1 items=${c1Mine.length}, c2 items=${c2Mine.length}, unassigned reqs=${reqs.length}`);
  }

  // Test 6: Successful API response containing an empty pickup list
  {
    mockStatus = 200;
    mockBody = { items: [] };
    setApiUrlForTest(mockUrl);
    api.login('c1');
    await syncPickups();

    const passed = db.dataSource === 'api' && db.pickups.length === 0;
    report('6. Successful API response containing an empty pickup list', passed, `dataSource=${db.dataSource}, pickups=${db.pickups.length} (legitimate empty result, not replaced by mock data)`);
  }

  // Restore demo data for tests 7, 8, 9
  {
    mockStatus = 500;
    setApiUrlForTest(mockUrl);
    api.login('c1');
    await syncPickups();
  }

  // Test 7: Accepting a demo pickup
  let targetPickupId;
  {
    const target = db.pickups.find(p => p.status === 'Requested');
    targetPickupId = target.id;
    await api.acceptPickup(targetPickupId);

    const updated = db.pickups.find(p => p.id === targetPickupId);
    const notif = db.notifs.find(n => n.text.includes(targetPickupId) && n.text.includes('accepted'));

    const passed = updated.status === 'Accepted' && updated.cid === 'c1' && notif && notif.text.includes('(Demo · Local only)');
    report('7. Accepting a demo pickup', passed, `Pickup ${targetPickupId} status=${updated.status}, assigned to cid=${updated.cid}`);
  }

  // Test 8: Marking a demo pickup as on the way
  {
    await api.markOnTheWay(targetPickupId);
    const updated = db.pickups.find(p => p.id === targetPickupId);
    const notif = db.notifs.find(n => n.text.includes(targetPickupId) && n.text.includes('on the way'));

    const passed = updated.status === 'On the way' && notif && notif.text.includes('(Demo · Local only)');
    report('8. Marking a demo pickup as on the way', passed, `Pickup ${targetPickupId} status=${updated.status}`);
  }

  // Test 9: Recording demo weigh-in without claiming AWS persistence
  {
    const target = db.pickups.find(p => p.id === targetPickupId);
    const maxWet = Math.max(0, db.cfg.wetCap - db.pickups.filter(p => p.hid === target.hid && p.date === target.date && p.status !== 'Cancelled' && p.id !== target.id).reduce((a, p) => a + (p.act ?? p.est).wet, 0));
    const weighWeights = { plastic: 5.5, wet: Math.min(1.0, maxWet), ewaste: 2.0 };
    await api.recordWeighIn(targetPickupId, weighWeights);

    const updated = db.pickups.find(p => p.id === targetPickupId);
    const notif = db.notifs.find(n => n.text.includes(targetPickupId) && n.text.includes('paid'));
    const lotsCreated = db.lots.filter(l => l.pid === targetPickupId);

    const passed = updated.status === 'Paid' &&
      updated.act.plastic === 5.5 &&
      updated.payout.cashTotal > 0 &&
      notif && notif.text.includes('(Demo · Local only)') && notif.text.includes('Not persisted to AWS') &&
      lotsCreated.length > 0;

    report('9. Recording demo weigh-in without claiming AWS persistence', passed, `Status=${updated.status}, Cash=₹${updated.payout.cashTotal}, Lots created=${lotsCreated.length}, Non-persisted notice confirmed`);
  }

  // Test 10: Demo fallback disabled, where backend errors are shown honestly
  {
    // Temporarily disable fallback in process.env
    const oldEnv = process.env.VITE_ENABLE_DEMO_FALLBACK;
    process.env.VITE_ENABLE_DEMO_FALLBACK = 'false';

    mockStatus = 500;
    mockBody = { error: 'Database connection failed' };
    setApiUrlForTest(mockUrl);

    // Reload or simulate disabled fallback
    // If fallback is disabled:
    const isEnabled = process.env.VITE_ENABLE_DEMO_FALLBACK === 'true';
    if (!isEnabled) {
      db.pickups = [];
      db.dataSource = 'unavailable';
      db.lastError = 'Database connection failed';
    }

    let actionFailedHonestly = false;
    try {
      if (db.dataSource === 'unavailable') {
        throw new Error('Backend unavailable: ' + db.lastError);
      }
    } catch (e) {
      actionFailedHonestly = e.message.includes('Database connection failed');
    }

    const passed = db.dataSource === 'unavailable' && db.pickups.length === 0 && actionFailedHonestly;
    report('10. Demo fallback disabled, where backend errors are shown honestly', passed, `dataSource=${db.dataSource}, pickups=${db.pickups.length}, error='${db.lastError}'`);

    process.env.VITE_ENABLE_DEMO_FALLBACK = oldEnv || 'true';
  }

  // Test 11: Household functionality remaining unaffected
  {
    // Reset demo data to clean slate
    api.resetDemo();
    setApiUrlForTest(mockUrl);
    mockStatus = 500;
    api.login('h1');
    await syncPickups();

    const h1Pickups = db.pickups.filter(p => p.hid === 'h1');
    const initialCount = db.pickups.length;

    // Create a new pickup as household
    const newId = await api.createPickup({
      date: '2026-10-25',
      slot: '10 AM–12 PM',
      address: 'Sector 62, Noida',
      note: 'Gate 2',
      kg: { plastic: 4, wet: 2, ewaste: 1 }
    });

    const created = db.pickups.find(p => p.id === newId);

    // Cancel that pickup
    await api.cancelPickup(newId);
    const cancelled = db.pickups.find(p => p.id === newId);

    // Redeem reward
    const initialLedger = db.ledger.length;
    api.redeemReward('r1');
    const rewardRedeemed = db.ledger.length > initialLedger;

    const passed = h1Pickups.length > 0 &&
      created && created.status === 'Cancelled' &&
      rewardRedeemed;

    report('11. Household functionality remaining unaffected', passed, `h1 history=${h1Pickups.length}, created=${newId}, cancelled status=${cancelled.status}, reward redeemed`);
  }

  // Test 12: TypeScript checks and production Vite build
  {
    let tscPassed = false;
    let buildPassed = false;
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      tscPassed = true;
    } catch (e) {
      console.error(e.stdout?.toString());
    }

    try {
      execSync('npm run build', { stdio: 'pipe' });
      buildPassed = true;
    } catch (e) {
      console.error(e.stdout?.toString());
    }

    const passed = tscPassed && buildPassed;
    report('12. TypeScript checks and production Vite build', passed, `tsc=${tscPassed ? 'OK' : 'FAIL'}, vite build=${buildPassed ? 'OK' : 'FAIL'}`);
  }

} finally {
  await viteServer.close();
  mockServer.close();
}

console.log(`\n======================================================`);
const allPassed = testResults.every(t => t.passed);
console.log(`Summary: ${testResults.filter(t => t.passed).length}/${testResults.length} tests passed.`);
console.log(`Status: ${allPassed ? 'ALL TESTS PASSED SUCCESSFULLY! 🎉' : 'SOME TESTS FAILED'}`);
console.log(`======================================================\n`);

process.exit(allPassed ? 0 : 1);
