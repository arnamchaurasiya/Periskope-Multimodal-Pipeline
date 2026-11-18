/**
 * Phase 5 Test Suite: Full End-to-End Vertical Slice Integration
 * Validates the complete pipeline running through live HTTP API requests.
 */

import * as http from 'node:http';
import { createServer } from '../src/app.ts';

async function httpRequest(
  port: number,
  path: string,
  method: string = 'GET',
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any; rawText: string }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
          resolve({ status: res.statusCode || 0, headers: res.headers, data, rawText: text });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runPhase5Tests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING PHASE 5 TESTS: END-TO-END VERTICAL SLICE INTEGRATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  const TEST_PORT = 4336;
  const server = createServer();

  try {
    await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[Setup] Test server running on http://localhost:${TEST_PORT}\n`);

    // Test 1: GET /health
    console.log('[Test 1] Health Check & Zero-Disk Flag Verification...');
    const health = await httpRequest(TEST_PORT, '/health');
    assert(health.status === 200, 'HTTP 200 OK from /health');
    assert(health.data.status === 'UP', 'Service status is UP');
    assert(health.data.zeroDiskGuarantee === true, 'Zero-Disk In-Memory guarantee confirmed');

    // Test 2: GET / (Dashboard HTML)
    console.log('\n[Test 2] Frontend Dashboard HTML Serving...');
    const dashboard = await httpRequest(TEST_PORT, '/');
    assert(dashboard.status === 200, 'HTTP 200 OK from root route');
    assert(dashboard.headers['content-type']?.includes('text/html') === true, 'Content-Type is text/html');
    assert(dashboard.rawText.includes('Periskope Multimodal Pipeline'), 'Dashboard HTML contains brand header');
    assert(dashboard.rawText.includes('Mumbai-Pune Fast Freight Ops'), 'Dashboard HTML contains chat timeline');

    // Test 3: POST /v1/messages/multimodal/process (BlackBuck Voice Note)
    console.log('\n[Test 3] End-to-End Voice Note Processing Pipeline...');
    const messageId = `wamid_E2E_${Date.now()}`;
    const processRes = await httpRequest(TEST_PORT, '/v1/messages/multimodal/process', 'POST', {
      mediaType: 'VOICE_NOTE',
      domainCategory: 'LOGISTICS',
      messageId,
    });

    if (processRes.status !== 200) {
      console.error('Processing failed with status:', processRes.status, 'Body:', processRes.data);
    }

    assert(processRes.status === 200, 'HTTP 200 OK from /v1/messages/multimodal/process');
    assert(processRes.data.status === 'COMPLETED', 'Processing status is COMPLETED');
    assert(processRes.data.processingMetrics.diskBytesWritten === 0, 'Zero disk I/O verified: 0 bytes written');
    assert(processRes.data.payload.entities.vehiclePlateNumbers[0] === 'MH-12-RN-8841', 'Regex validated vehicle plate MH-12-RN-8841 extracted');
    assert(processRes.data.payload.entities.invoiceNumbers[0] === 'INV-9902', 'Invoice #INV-9902 extracted');
    assert(processRes.data.payload.entities.eWayBillNumbers[0] === '349281729381', '12-digit E-Way bill 349281729381 extracted');
    assert(processRes.data.automationRulesTriggered.includes('High Urgency Logistics Gate Exception Auto-Triage'), 'Automation Rules 2.0 triggered');
    assert(processRes.data.actionsDispatched.length >= 3, 'Dispatched automated labels, queues, and Slack webhook');

    const extractionId = processRes.data.extractionId;

    // Test 4: GET /v1/messages/:messageId/synopsis
    console.log('\n[Test 4] Synopsis Retrieval by Message ID...');
    const synopsisRes = await httpRequest(TEST_PORT, `/v1/messages/${messageId}/synopsis`);
    assert(synopsisRes.status === 200, 'HTTP 200 OK from /v1/messages/:messageId/synopsis');
    assert(synopsisRes.data.extractionId === extractionId, 'Correct extraction record retrieved');
    assert(synopsisRes.data.urgencyLevel === 'HIGH', 'Urgency level preserved');
    assert(synopsisRes.data.recommendedActions.length >= 2, 'Actionable CTAs preserved');

    // Test 5: POST /v1/synopsis/:id/action (One-Click CTA Execution)
    console.log('\n[Test 5] One-Click CTA Action Execution...');
    const actionRes = await httpRequest(TEST_PORT, `/v1/synopsis/${extractionId}/action`, 'POST', {
      actionId: 'act_generate_dispatch_ticket',
      overrides: { priority: 'CRITICAL', notes: 'Automated test execution' },
    });
    assert(actionRes.status === 200, 'HTTP 200 OK from /v1/synopsis/:id/action');
    assert(actionRes.data.success === true, 'Action executed successfully');
    assert(actionRes.data.targetTicketId?.startsWith('tkt_') === true, 'New ticket generated with ID', actionRes.data.targetTicketId);

    // Test 6: GET /v1/search/multimodal?q=INV-9902
    console.log('\n[Test 6] Full-Text Search Retrieval via tsvector...');
    const searchRes = await httpRequest(TEST_PORT, '/v1/search/multimodal?q=INV-9902');
    assert(searchRes.status === 200, 'HTTP 200 OK from /v1/search/multimodal');
    assert(searchRes.data.count >= 1, 'Search query for "INV-9902" returned at least 1 hit');
    assert(searchRes.data.results[0].messageId === messageId, 'Search correctly resolved the target voice note');

    // Test 7: Hosted MCP Server Endpoints
    console.log('\n[Test 7] Hosted MCP Server Tool Calling (api.periskope.app/mcp)...');
    const mcpToolsRes = await httpRequest(TEST_PORT, '/v1/mcp/tools');
    assert(mcpToolsRes.status === 200, 'HTTP 200 OK from /v1/mcp/tools');
    assert(mcpToolsRes.data.tools.length === 2, 'Hosted MCP server exposes 2 tools');

    const mcpCallRes = await httpRequest(TEST_PORT, '/v1/mcp/tools/call', 'POST', {
      name: 'get_message_multimodal_analysis',
      parameters: { messageId },
    });
    assert(mcpCallRes.status === 200, 'HTTP 200 OK from /v1/mcp/tools/call');
    assert(mcpCallRes.data.success === true, 'MCP tool call succeeded');
    assert(mcpCallRes.data.result.entities.vehiclePlateNumbers[0] === 'MH-12-RN-8841', 'MCP returned verified vehicle plate');

    // Test 8: GET /v1/telemetry
    console.log('\n[Test 8] Telemetry & Memory Hygiene...');
    const telemetryRes = await httpRequest(TEST_PORT, '/v1/telemetry');
    assert(telemetryRes.status === 200, 'HTTP 200 OK from /v1/telemetry');
    assert(telemetryRes.data.diskBytesWritten === 0, 'Telemetry confirms 0 disk bytes written across entire run');
    assert(telemetryRes.data.totalIndexedMedia >= 1, 'Telemetry confirms active tsvector media index');

  } catch (err: any) {
    console.error('Unexpected test exception:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Phase 5 Test Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests();
