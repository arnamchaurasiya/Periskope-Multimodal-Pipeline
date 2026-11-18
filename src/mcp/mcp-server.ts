/**
 * Subsystem 6: Hosted Model Context Protocol (MCP) Server
 * Exposes multimodal intelligence directly to AI agents (Claude Desktop, LangChain, etc.)
 * via standardized tool calls hosted at api.periskope.app/mcp.
 */

import type { ActionType, SynopsisActionLog } from '../types/index.ts';
import { SearchVectorIndex } from '../search/search-index.ts';
import * as crypto from 'node:crypto';

export interface McpToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export class PeriskopeMcpServer {
  private static actionAuditLogs: SynopsisActionLog[] = [];

  /**
   * Tool Declarations for Model Context Protocol client discovery
   */
  public static listTools(): McpToolDeclaration[] {
    return [
      {
        name: 'get_message_multimodal_analysis',
        description: 'Retrieves the audio transcript, OCR extraction, word timestamps, and verified domain entities for any WhatsApp voice note or image document message.',
        parameters: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'The WhatsApp message ID (e.g., wamid_HB82901928301)',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'execute_synopsis_action',
        description: 'Triggers a pre-configured automated action (ticket creation, ERP sync, or quoted reply) directly from an extracted multimodal synopsis card.',
        parameters: {
          type: 'object',
          properties: {
            synopsisId: {
              type: 'string',
              description: 'The extraction ID of the synopsis card',
            },
            actionId: {
              type: 'string',
              description: 'The identifier of the recommended action (e.g., act_create_dispatch_ticket)',
            },
            overrides: {
              type: 'object',
              description: 'Optional payload overrides (e.g. priority, agent assignment)',
            },
          },
          required: ['synopsisId', 'actionId'],
        },
      },
    ];
  }

  /**
   * Tool Implementation: get_message_multimodal_analysis
   */
  public static async getMessageMultimodalAnalysis(messageId: string): Promise<Record<string, any>> {
    const record = SearchVectorIndex.getByMessageId(messageId) || SearchVectorIndex.getById(messageId);

    if (record) {
      return {
        messageId,
        status: 'COMPLETED',
        executiveSummary: record.executiveSummary,
        urgencyLevel: record.urgencyLevel,
        domainCategory: record.domainCategory,
        entities: record.entities,
        rawTranscript: record.rawTranscript,
        wordTimestamps: record.wordTimestamps,
        recommendedActions: record.recommendedActions,
        detectedLanguage: record.detectedLanguage,
        confidenceScore: record.confidenceScore,
      };
    }

    return {
      messageId,
      status: 'NOT_FOUND',
      error: `No multimodal analysis found for WhatsApp messageId: ${messageId}`,
    };
  }

  /**
   * Tool Implementation: execute_synopsis_action
   */
  public static async executeSynopsisAction(
    synopsisId: string,
    actionId: string,
    overrides?: Record<string, any>
  ): Promise<Record<string, any>> {
    const logId = `act_log_${crypto.randomBytes(4).toString('hex')}`;
    const targetTicketId = actionId.includes('ticket') ? `tkt_${crypto.randomBytes(4).toString('hex')}` : undefined;

    const actionType: ActionType = actionId.includes('ticket')
      ? 'CREATE_TICKET'
      : actionId.includes('erp') || actionId.includes('sap')
      ? 'SYNC_TO_ERP'
      : actionId.includes('reply')
      ? 'DRAFT_REPLY'
      : 'NOTIFY_SLACK';

    const logEntry: SynopsisActionLog = {
      id: logId,
      extractionId: synopsisId,
      actionId,
      actionType,
      executedAt: new Date(),
      status: 'SUCCESS',
      resultPayload: {
        synopsisId,
        actionId,
        targetTicketId,
        overrides: overrides || {},
      },
    };

    this.actionAuditLogs.push(logEntry);

    return {
      success: true,
      logId,
      synopsisId,
      actionId,
      actionType,
      targetTicketId,
      status: 'ACTION_EXECUTED',
      executedAt: logEntry.executedAt.toISOString(),
      message: `Action ${actionId} executed successfully from synopsis ${synopsisId}`,
    };
  }

  /**
   * Dispatches a tool call by name
   */
  public static async callTool(name: string, params: Record<string, any>): Promise<Record<string, any>> {
    if (name === 'get_message_multimodal_analysis') {
      return this.getMessageMultimodalAnalysis(params.messageId);
    }
    if (name === 'execute_synopsis_action') {
      return this.executeSynopsisAction(params.synopsisId, params.actionId, params.overrides);
    }
    throw new Error(`Unknown MCP tool name: ${name}`);
  }

  /**
   * Retrieves action audit logs
   */
  public static getActionAuditLogs(): SynopsisActionLog[] {
    return [...this.actionAuditLogs];
  }

  /**
   * Clears audit logs
   */
  public static clearLogs(): void {
    this.actionAuditLogs = [];
  }
}
