/**
 * Phase 4 Test Suite: Automation Rules 2.0 Engine & Hosted MCP Server
 */

import { AutomationEngine } from '../src/automation/automation-engine.ts';
import { PeriskopeMcpServer } from '../src/mcp/mcp-server.ts';
import { SearchVectorIndex } from '../src/search/search-index.ts';
import type { ExtractedMultimodalPayload, MultimodalExtractionRecord } from '../src/types/index.ts';

async function runPhase4Tests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING PHASE 4 TESTS: AUTOMATION RULES & HOSTED MCP SERVER');
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

  try {
    // ------------------------------------------------------------------------
    // Part A: Automation Rules 2.0 Engine Tests
    // ------------------------------------------------------------------------
    console.log('[Test 1] Automation Rules Triggering on Logistics Gate Exception...');
    AutomationEngine.clearLogs();

    const logisticsPayload: ExtractedMultimodalPayload = {
      mediaType: 'VOICE_NOTE',
      languageDetected: 'hi-Latn',
      overallConfidence: 0.97,
      executiveSummary: 'Driver at Pune Warehouse reports consignment on truck MH-12-RN-8841 rejected for Invoice #INV-9902.',
      urgencyLevel: 'HIGH',
      domainCategory: 'LOGISTICS',
      entities: {
        vehiclePlateNumbers: ['MH-12-RN-8841'],
        invoiceNumbers: ['INV-9902'],
      },
      recommendedActions: [],
    };

    const autoResult = AutomationEngine.evaluateAndExecute(logisticsPayload);
    assert(autoResult.rulesTriggered.length === 1, 'Exactly one high-priority automation rule triggered');
    assert(autoResult.rulesTriggered[0] === 'High Urgency Logistics Gate Exception Auto-Triage', 'Correct logistics rule triggered');
    assert(autoResult.actionsExecuted.some((a) => a.type === 'ADD_LABEL' && a.payload.label === 'URGENT_GATE_HOLD'), 'Action ADD_LABEL (URGENT_GATE_HOLD) dispatched');
    assert(autoResult.actionsExecuted.some((a) => a.type === 'ASSIGN_QUEUE'), 'Action ASSIGN_QUEUE dispatched');
    assert(autoResult.actionsExecuted.some((a) => a.type === 'SEND_WEBHOOK'), 'Action SEND_WEBHOOK to Slack dispatched');

    console.log('\n[Test 2] Automation Rules Triggering on Emergency Healthcare Admission...');
    const healthcarePayload: ExtractedMultimodalPayload = {
      mediaType: 'VOICE_NOTE',
      languageDetected: 'en-IN',
      overallConfidence: 0.98,
      executiveSummary: 'Emergency admission at Apollo Mumbai under policy PLUM-882103.',
      urgencyLevel: 'CRITICAL',
      domainCategory: 'HEALTHCARE_INSURANCE',
      entities: {
        policyOrUHIDNumbers: ['PLUM-882103'],
      },
      recommendedActions: [],
    };

    const healthAuto = AutomationEngine.evaluateAndExecute(healthcarePayload);
    assert(healthAuto.rulesTriggered.includes('Emergency Cashless Admission Immediate SLA Escalation'), 'Healthcare critical admission rule triggered');
    assert(healthAuto.actionsExecuted.some((a) => a.payload.label === 'CRITICAL_CASHLESS_ADMISSION'), 'Critical admission label applied');

    console.log('\n[Test 3] Non-Matching Low Urgency Payload (Zero False Alarms)...');
    const lowUrgencyPayload: ExtractedMultimodalPayload = {
      mediaType: 'VOICE_NOTE',
      languageDetected: 'en-IN',
      overallConfidence: 0.95,
      executiveSummary: 'Routine inquiry about warehouse operating hours on weekend.',
      urgencyLevel: 'LOW',
      domainCategory: 'LOGISTICS',
      entities: {},
      recommendedActions: [],
    };

    const lowAuto = AutomationEngine.evaluateAndExecute(lowUrgencyPayload);
    assert(lowAuto.rulesTriggered.length === 0, 'Zero rules triggered for non-emergency routine message');
    assert(AutomationEngine.getExecutionLogs().length === 2, 'Execution logs audit trail preserved');

    // ------------------------------------------------------------------------
    // Part B: Hosted MCP Server Tests
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Hosted MCP Tool Discovery (listTools)...');
    const tools = PeriskopeMcpServer.listTools();
    assert(tools.length === 2, 'Two hosted MCP tools exposed for external AI agents');
    assert(tools.some((t) => t.name === 'get_message_multimodal_analysis'), 'Tool "get_message_multimodal_analysis" declared');
    assert(tools.some((t) => t.name === 'execute_synopsis_action'), 'Tool "execute_synopsis_action" declared');

    console.log('\n[Test 5] MCP Tool Call: get_message_multimodal_analysis...');
    SearchVectorIndex.clear();
    const testRecord: MultimodalExtractionRecord = {
      id: 'ext_test_mcp_001',
      assetId: 'asset_mcp_001',
      messageId: 'wamid_TEST_MCP_MESSAGE_01',
      rawTranscript: 'Bhaiya truck MH 12 RN 8841 stuck with E-Way bill 349281729381.',
      wordTimestamps: [
        { word: 'truck', startMs: 100, endMs: 300, confidence: 0.98 },
        { word: 'MH', startMs: 350, endMs: 500, confidence: 0.99 },
      ],
      detectedLanguage: 'hi-Latn',
      confidenceScore: 0.975,
      executiveSummary: 'Truck MH-12-RN-8841 gate hold at warehouse.',
      urgencyLevel: 'HIGH',
      domainCategory: 'LOGISTICS',
      entities: {
        vehiclePlateNumbers: ['MH-12-RN-8841'],
        eWayBillNumbers: ['349281729381'],
      },
      recommendedActions: [
        {
          actionId: 'act_generate_dispatch_ticket',
          label: 'Generate Dispatch Exception Ticket',
          actionType: 'CREATE_TICKET',
          prefilledPayload: { truck: 'MH-12-RN-8841' },
        },
      ],
      searchTokens: [],
      createdAt: new Date(),
    };
    SearchVectorIndex.indexRecord(testRecord);

    const mcpAnalysis = await PeriskopeMcpServer.callTool('get_message_multimodal_analysis', {
      messageId: 'wamid_TEST_MCP_MESSAGE_01',
    });

    assert(mcpAnalysis.status === 'COMPLETED', 'MCP query returned status COMPLETED');
    assert(mcpAnalysis.entities.vehiclePlateNumbers[0] === 'MH-12-RN-8841', 'Verified vehicle plate returned to MCP agent');
    assert(mcpAnalysis.wordTimestamps.length === 2, 'Millisecond word timestamps returned to MCP agent');

    // Test non-existent message ID lookup
    const mcpNotFound = await PeriskopeMcpServer.callTool('get_message_multimodal_analysis', {
      messageId: 'wamid_NON_EXISTENT',
    });
    assert(mcpNotFound.status === 'NOT_FOUND', 'Proper NOT_FOUND status returned for unknown message ID');

    console.log('\n[Test 6] MCP Tool Call: execute_synopsis_action...');
    PeriskopeMcpServer.clearLogs();
    const actionResult = await PeriskopeMcpServer.callTool('execute_synopsis_action', {
      synopsisId: 'ext_test_mcp_001',
      actionId: 'act_generate_dispatch_ticket',
      overrides: { priority: 'CRITICAL', notes: 'Urgent gate clearance requested by fleet owner' },
    });

    assert(actionResult.success === true, 'Action executed successfully via MCP tool call');
    assert(actionResult.targetTicketId?.startsWith('tkt_') === true, 'Ticket created with unique ID', actionResult.targetTicketId);
    assert(PeriskopeMcpServer.getActionAuditLogs().length === 1, 'Audit log recorded in synopsis_action_logs');

  } catch (err: any) {
    console.error('Unexpected test exception:', err);
    failed++;
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Phase 4 Test Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests();
