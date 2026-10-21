import { Browser, sleep } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

async function runAudit() {
  console.log('--- STARTING AEGIS-GIS E2E REAL BROWSER AUDIT ---');
  const browser = await Browser.launch({ width: 1440, height: 900 });
  const page = await browser.newPage({ width: 1440, height: 900 });

  const consoleErrors = [];
  const consoleWarns = [];
  const failedRequests = [];
  const httpErrors = [];

  // Enable Network tracking
  await page.send('Network.enable');

  browser.on(page.sessionId, 'Network.responseReceived', (params) => {
    const status = params.response.status;
    const url = params.response.url;
    if (status >= 400) {
      httpErrors.push({ url, status, statusText: params.response.statusText });
    }
  });

  browser.on(page.sessionId, 'Network.loadingFailed', (params) => {
    // Ignore canceled requests (e.g. aborts from fast changes)
    if (params.errorText !== 'net::ERR_ABORTED') {
      failedRequests.push({ requestId: params.requestId, errorText: params.errorText, type: params.type });
    }
  });

  browser.on(page.sessionId, 'Runtime.consoleAPICalled', (params) => {
    const type = params.type;
    const text = params.args.map(a => a.value || a.description || '').join(' ');
    if (type === 'error') {
      consoleErrors.push(text);
    } else if (type === 'warning') {
      // Ignore Leaflet deprecation warnings if any
      if (!text.includes('mozPressure') && !text.includes('mozInputSource')) {
        consoleWarns.push(text);
      }
    }
  });

  browser.on(page.sessionId, 'Runtime.exceptionThrown', (params) => {
    const desc = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'Unknown JS error';
    consoleErrors.push('UNCAUGHT EXCEPTION: ' + desc);
  });

  try {
    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { timeoutMs: 20000, settleMs: 2500 });

    // Step A: Check if AuthGate is present, if so click Evaluator mode
    console.log('2. Checking authentication state...');
    const hasAuthGate = await page.eval(() => {
      return !!document.querySelector('button');
    });

    await page.eval(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const evalBtn = btns.find(b => b.textContent && b.textContent.includes('evaluator'));
      if (evalBtn) evalBtn.click();
    });
    await sleep(1500);

    // Step B: Iterate through every tab
    console.log('3. Clicking through every navigation tab...');
    const tabLabels = [
      'Tactical Cartography & RF Analysis',
      'Global Incident Simulations',
      'Model Diagnostics (Table 2)',
      'GIS Topology & PyQGIS (Sec 8.4)',
      'Research Paper & Poster Matrix',
      'Forensic Copilot'
    ];

    for (const label of tabLabels) {
      console.log(`   - Activating tab: "${label}"`);
      await page.eval((tabName) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const tab = btns.find(b => b.textContent && b.textContent.includes(tabName));
        if (tab) tab.click();
      }, label);
      await sleep(1200);
    }

    // Step C: Test Forensic Copilot trigger
    console.log('4. Testing Forensic Copilot quick prompt...');
    await page.eval(() => {
      const qp = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Generate full forensic'));
      if (qp) qp.click();
    });
    await sleep(2500);

    // Step D: Return to Command tab and exercise all controls
    console.log('5. Returning to Command tab to exercise simulation controls...');
    await page.eval(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Tactical Cartography'));
      if (tab) tab.click();
    });
    await sleep(1000);

    // Test scenario dropdown options
    console.log('   - Testing scenario dropdown selections...');
    const scenarioValues = ['vilnius_aviation_adsb', 'uav_lidar_survey', 'precision_ag_tractor', 'baltic_maritime_c4ads'];
    for (const sc of scenarioValues) {
      await page.eval((val) => {
        const selects = Array.from(document.querySelectorAll('select'));
        if (selects[0]) {
          selects[0].value = val;
          selects[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, sc);
      await sleep(800);
    }

    // Test attack override dropdown
    console.log('   - Testing attack override selections...');
    await page.eval(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      if (selects[1]) {
        selects[1].value = 'INTERMEDIATE_SYNC';
        selects[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(800);

    // Test slider, EKF checkbox, and play/reset
    console.log('   - Testing power slider, EKF toggle, and playback controls...');
    await page.eval(() => {
      const range = document.querySelector('input[type="range"]');
      if (range) {
        range.value = '6';
        range.dispatchEvent(new Event('input', { bubbles: true }));
        range.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const cb = document.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.click();
        cb.click(); // toggle back
      }
      const playBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('Play'));
      if (playBtn) playBtn.click();
    });
    await sleep(1200);

    // Pause and reset
    await page.eval(() => {
      const pauseBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('Pause'));
      if (pauseBtn) pauseBtn.click();
      const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('Reset'));
      if (resetBtn) resetBtn.click();
    });
    await sleep(800);

    // Test Expert view modal
    console.log('6. Testing Expert view modal...');
    await page.eval(() => {
      const expBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Expert view'));
      if (expBtn) expBtn.click();
    });
    await sleep(600);
    await page.eval(() => {
      const closeBtn = document.querySelector('button[title*="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    });
    await sleep(500);

    // Final settle
    await sleep(1000);

    console.log('\n--- AUDIT RESULTS ---');
    console.log(`Console Errors count: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', JSON.stringify(consoleErrors, null, 2));
    }
    console.log(`Console Warnings count: ${consoleWarns.length}`);
    if (consoleWarns.length > 0) {
      console.log('Console Warnings:', JSON.stringify(consoleWarns, null, 2));
    }
    console.log(`HTTP 4xx/5xx Errors count: ${httpErrors.length}`);
    if (httpErrors.length > 0) {
      console.log('HTTP Errors:', JSON.stringify(httpErrors, null, 2));
    }
    console.log(`Failed Network Requests count: ${failedRequests.length}`);
    if (failedRequests.length > 0) {
      console.log('Failed Requests:', JSON.stringify(failedRequests, null, 2));
    }

    if (consoleErrors.length === 0 && httpErrors.length === 0 && failedRequests.length === 0) {
      console.log('\nSUCCESS: 0 errors, 0 failed network requests! Complete audit passed.');
      process.exitCode = 0;
    } else {
      console.log('\nFAILURE: Found errors or failed network requests.');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Audit exception:', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

runAudit();
