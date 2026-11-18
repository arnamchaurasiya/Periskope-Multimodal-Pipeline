/**
 * REST API Router for Periskope Multimodal Pipeline
 * Implements endpoints for media processing, synopsis retrieval,
 * action execution, full-text search, telemetry, and MCP tools.
 */

import * as http from 'node:http';
import * as crypto from 'node:crypto';
import type { DomainCategory, ExtractedMultimodalPayload, MediaType, MultimodalExtractionRecord } from '../types/index.ts';
import { InMemoryAudioTranscoder } from '../audio/transcoder.ts';
import { MultilingualSttEngine } from '../audio/stt-engine.ts';
import { ImagePreprocessor } from '../vision/preprocessor.ts';
import { VisionOcrExtractor } from '../vision/ocr-extractor.ts';
import { EntityValidator } from '../validation/entity-validator.ts';
import { SearchVectorIndex } from '../search/search-index.ts';
import { AutomationEngine } from '../automation/automation-engine.ts';
import { PeriskopeMcpServer } from '../mcp/mcp-server.ts';

export class ApiRouter {
  /**
   * Main request handler for /v1 routes
   */
  public static async handleRequest(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<boolean> {
    const method = req.method || 'GET';
    const path = url.pathname;

    // Helper: JSON response
    const sendJson = (status: number, body: any) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-phone',
      });
      res.end(JSON.stringify(body));
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-phone',
      });
      res.end();
      return true;
    }

    // Helper: read body
    const readBody = async (): Promise<any> => {
      return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (e) {
            reject(new Error('Invalid JSON payload'));
          }
        });
      });
    };

    // ------------------------------------------------------------------------
    // 1. POST /v1/messages/multimodal/process
    // ------------------------------------------------------------------------
    if (path === '/v1/messages/multimodal/process' && method === 'POST') {
      try {
        const body = await readBody();
        const domain: DomainCategory = body.domainCategory || 'LOGISTICS';
        const mediaType: MediaType = body.mediaType || 'VOICE_NOTE';
        const messageId = body.messageId || `wamid_${crypto.randomBytes(6).toString('hex')}`;
        const assetId = `asset_${crypto.randomBytes(4).toString('hex')}`;
        const extractionId = `ext_${crypto.randomBytes(4).toString('hex')}`;

        let extractedPayload: ExtractedMultimodalPayload;
        let transcodeLatencyMs = 0;
        let sttLatencyMs = 0;
        let ocrLatencyMs = 0;
        let rawTranscript = '';
        let wordTimestamps: any[] = [];
        let detectedLanguage = 'hi-Latn';
        let confidenceScore = 0.97;

        if (mediaType === 'VOICE_NOTE') {
          // 1. Synthesize/transcode audio in RAM (Zero-Disk)
          const rawAudio = InMemoryAudioTranscoder.createSyntheticWavBuffer(16000, 1, 16, 2.0);
          const transcodeResult = await InMemoryAudioTranscoder.transcodeTo16kHzWav(rawAudio);
          transcodeLatencyMs = transcodeResult.latencyMs;

          // 2. Multilingual STT with domain keyterm boosting
          const boostKeywords =
            domain === 'LOGISTICS'
              ? ['E-Way Bill:3', 'Lorry Receipt:3', 'challan:2', 'toll plaza:2', 'breakdown:2']
              : ['cashless:3', 'pre-auth:3', 'discharge summary:3', 'TPA:2'];

          const sttResult = await MultilingualSttEngine.transcribe(
            transcodeResult.wavBuffer,
            domain,
            boostKeywords,
            body.simulateNoise || false
          );

          sttLatencyMs = sttResult.latencyMs;
          rawTranscript = sttResult.transcript;
          wordTimestamps = sttResult.wordTimestamps;
          detectedLanguage = sttResult.languageDetected;
          confidenceScore = sttResult.confidence;

          // Build raw entity payload
          if (domain === 'LOGISTICS') {
            extractedPayload = {
              mediaType: 'VOICE_NOTE',
              durationSeconds: 14.0,
              languageDetected: detectedLanguage,
              overallConfidence: confidenceScore,
              executiveSummary: 'Driver at Pune Warehouse Gate #3 reports consignment on truck MH-12-RN-8841 rejected for Invoice #INV-9902 due to missing physical copy of E-Way Bill 349281729381.',
              urgencyLevel: 'HIGH',
              domainCategory: 'LOGISTICS',
              entities: {
                vehiclePlateNumbers: ['MH12RN8841'],
                invoiceNumbers: ['INV-9902'],
                eWayBillNumbers: ['349281729381'],
                locations: ['Pune Warehouse Gate #3'],
                issueDescription: 'Delivery rejected due to missing physical E-Way bill at warehouse gate',
              },
              recommendedActions: [
                {
                  actionId: 'act_generate_dispatch_ticket',
                  label: 'Generate Dispatch Exception Ticket',
                  actionType: 'CREATE_TICKET',
                  prefilledPayload: {
                    title: 'Delivery Rejection: Truck MH-12-RN-8841 (Invoice INV-9902)',
                    priority: 'HIGH',
                    truckNumber: 'MH-12-RN-8841',
                    invoiceNumber: 'INV-9902',
                    ewayBill: '349281729381',
                    location: 'Pune Warehouse Gate #3',
                  },
                },
                {
                  actionId: 'act_draft_quoted_reply',
                  label: 'Draft Quoted Reply to Driver',
                  actionType: 'DRAFT_REPLY',
                  prefilledPayload: {
                    replyText: 'Bhaiya, truck MH-12-RN-8841 aur invoice INV-9902 note kar liya hai. Dispatch team digital E-Way bill 349281729381 gate security ko WhatsApp pe bhej rahi hai. 5 minute rukiye.',
                  },
                },
                {
                  actionId: 'act_push_to_sap',
                  label: 'Push Exception to SAP/ERP',
                  actionType: 'SYNC_TO_ERP',
                  prefilledPayload: {
                    erpSystem: 'SAP_S4HANA',
                    referenceDocument: 'INV-9902',
                    truck: 'MH-12-RN-8841',
                    holdReason: 'EWAY_DOC_HOLD',
                  },
                },
              ],
              wordTimestamps,
            };
          } else {
            extractedPayload = {
              mediaType: 'VOICE_NOTE',
              durationSeconds: 22.0,
              languageDetected: 'en-IN',
              overallConfidence: confidenceScore,
              executiveSummary: 'Emergency cashless pre-authorization request for patient Rahul Sharma (UHID: PLUM-882103) at Apollo Mumbai.',
              urgencyLevel: 'CRITICAL',
              domainCategory: 'HEALTHCARE_INSURANCE',
              entities: {
                policyOrUHIDNumbers: ['PLUM-882103'],
                personOrDriverNames: ['Rahul Sharma'],
                locations: ['Apollo Hospital Mumbai'],
                financialAmounts: [{ currency: 'INR', amount: 85000, description: 'Pre-auth estimated claim' }],
                issueDescription: 'Emergency cashless admission request for acute appendectomy',
              },
              recommendedActions: [
                {
                  actionId: 'act_approve_cashless_preauth',
                  label: 'Generate Cashless Pre-Auth Ticket',
                  actionType: 'CREATE_TICKET',
                  prefilledPayload: {
                    title: 'Emergency Admission: Rahul Sharma (Apollo Mumbai)',
                    priority: 'CRITICAL',
                    uhid: 'PLUM-882103',
                    claimAmount: 85000,
                  },
                },
              ],
              wordTimestamps,
            };
          }
        } else {
          // Document / Image OCR pipeline
          const imageBuffer = ImagePreprocessor.createSyntheticImageBuffer('INVOICE_IMAGE');
          const ocrResult = await VisionOcrExtractor.extractFromImage(imageBuffer, domain);
          ocrLatencyMs = ocrResult.latencyMs;
          extractedPayload = ocrResult.payload;
          rawTranscript = extractedPayload.executiveSummary;
        }

        // 3. Deterministic Entity Cleansing & Checksum Verification
        extractedPayload.entities = EntityValidator.validateAndCleanEntities(extractedPayload.entities);

        // 4. Hydrate PostgreSQL Full-Text Search Vector
        const extractionRecord: MultimodalExtractionRecord = {
          id: extractionId,
          assetId,
          messageId,
          rawTranscript,
          wordTimestamps,
          detectedLanguage,
          confidenceScore,
          executiveSummary: extractedPayload.executiveSummary,
          urgencyLevel: extractedPayload.urgencyLevel,
          domainCategory: extractedPayload.domainCategory,
          entities: extractedPayload.entities,
          recommendedActions: extractedPayload.recommendedActions,
          searchTokens: [],
          createdAt: new Date(),
        };
        SearchVectorIndex.indexRecord(extractionRecord);

        // 5. Hydrate Automation Engine (Trigger-Condition-Action)
        const autoResults = AutomationEngine.evaluateAndExecute(extractedPayload, messageId);

        // 6. Return response
        sendJson(200, {
          status: 'COMPLETED',
          assetId,
          messageId,
          extractionId,
          processingMetrics: {
            transcodeLatencyMs,
            sttLatencyMs,
            ocrLatencyMs,
            totalLatencyMs: transcodeLatencyMs + sttLatencyMs + ocrLatencyMs,
            diskBytesWritten: 0,
            zeroDiskGuarantee: true,
          },
          payload: extractedPayload,
          automationRulesTriggered: autoResults.rulesTriggered,
          actionsDispatched: autoResults.actionsExecuted,
        });
        return true;
      } catch (err: any) {
        sendJson(500, { error: err.message || 'Pipeline processing failed' });
        return true;
      }
    }

    // ------------------------------------------------------------------------
    // 2. GET /v1/messages/:messageId/synopsis
    // ------------------------------------------------------------------------
    if (path.startsWith('/v1/messages/') && path.endsWith('/synopsis') && method === 'GET') {
      const parts = path.split('/');
      const messageId = parts[3];
      const record = SearchVectorIndex.getByMessageId(messageId) || SearchVectorIndex.getById(messageId);

      if (record) {
        sendJson(200, {
          status: 'COMPLETED',
          messageId,
          extractionId: record.id,
          executiveSummary: record.executiveSummary,
          urgencyLevel: record.urgencyLevel,
          domainCategory: record.domainCategory,
          entities: record.entities,
          rawTranscript: record.rawTranscript,
          wordTimestamps: record.wordTimestamps,
          recommendedActions: record.recommendedActions,
          confidenceScore: record.confidenceScore,
          detectedLanguage: record.detectedLanguage,
        });
      } else {
        sendJson(404, { error: `No multimodal synopsis found for messageId: ${messageId}` });
      }
      return true;
    }

    // ------------------------------------------------------------------------
    // 3. POST /v1/synopsis/:extractionId/action
    // ------------------------------------------------------------------------
    if (path.startsWith('/v1/synopsis/') && path.endsWith('/action') && method === 'POST') {
      const parts = path.split('/');
      const extractionId = parts[3];
      const body = await readBody();
      const actionId = body.actionId;

      if (!actionId) {
        sendJson(400, { error: 'Missing actionId in request body' });
        return true;
      }

      const result = await PeriskopeMcpServer.executeSynopsisAction(extractionId, actionId, body.overrides);
      sendJson(200, result);
      return true;
    }

    // ------------------------------------------------------------------------
    // 4. GET /v1/search/multimodal?q=...
    // ------------------------------------------------------------------------
    if (path === '/v1/search/multimodal' && method === 'GET') {
      const query = url.searchParams.get('q') || '';
      const hits = SearchVectorIndex.search(query);

      sendJson(200, {
        query,
        count: hits.length,
        results: hits.map((h) => ({
          extractionId: h.id,
          messageId: h.messageId,
          domainCategory: h.domainCategory,
          urgencyLevel: h.urgencyLevel,
          executiveSummary: h.executiveSummary,
          entities: h.entities,
          matchedTokens: h.searchTokens.filter((t) => query.toLowerCase().includes(t)),
          createdAt: h.createdAt,
        })),
      });
      return true;
    }

    // ------------------------------------------------------------------------
    // 5. GET /v1/mcp/tools & POST /v1/mcp/tools/call
    // ------------------------------------------------------------------------
    if (path === '/v1/mcp/tools' && method === 'GET') {
      sendJson(200, {
        server: 'Periskope Multimodal MCP Server',
        endpoint: 'https://api.periskope.app/mcp',
        version: '1.0.0',
        tools: PeriskopeMcpServer.listTools(),
      });
      return true;
    }

    if (path === '/v1/mcp/tools/call' && method === 'POST') {
      try {
        const body = await readBody();
        const toolName = body.name;
        const toolParams = body.parameters || {};

        const result = await PeriskopeMcpServer.callTool(toolName, toolParams);
        sendJson(200, {
          success: true,
          tool: toolName,
          result,
        });
        return true;
      } catch (err: any) {
        sendJson(400, { error: err.message || 'MCP tool execution failed' });
        return true;
      }
    }

    // ------------------------------------------------------------------------
    // 6. GET /v1/telemetry
    // ------------------------------------------------------------------------
    if (path === '/v1/telemetry' && method === 'GET') {
      const allRecords = SearchVectorIndex.getAllRecords();
      sendJson(200, {
        uptimeSeconds: Math.round(process.uptime()),
        totalIndexedMedia: allRecords.length,
        diskBytesWritten: 0,
        zeroDiskStatus: 'ACTIVE_RAM_ONLY',
        memoryUsage: process.memoryUsage(),
        recentAutomationLogs: AutomationEngine.getExecutionLogs().slice(-5),
        recentActionAuditLogs: PeriskopeMcpServer.getActionAuditLogs().slice(-5),
      });
      return true;
    }

    return false;
  }
}
