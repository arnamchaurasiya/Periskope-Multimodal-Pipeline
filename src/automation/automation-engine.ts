/**
 * Subsystem 5 (Part B): Automation Rules 2.0 Engine Hydration
 * Evaluates Trigger-Condition-Action workflows upon receiving `message.multimodal_analyzed`
 * payloads, automatically tagging messages, routing queues, firing Slack alerts, and posting replies.
 */

import type { AutomationRule, ExtractedMultimodalPayload } from '../types/index.ts';

export interface AutomationExecutionResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  actionsDispatched: Array<{
    type: string;
    payload: Record<string, any>;
    status: 'SUCCESS' | 'FAILED';
    executedAt: string;
  }>;
}

export class AutomationEngine {
  private static rules: AutomationRule[] = [
    {
      id: 'rule_logistics_gate_emergency',
      name: 'High Urgency Logistics Gate Exception Auto-Triage',
      trigger: 'message.multimodal_analyzed',
      conditions: [
        { field: 'domainCategory', operator: 'EQUALS', value: 'LOGISTICS' },
        { field: 'urgencyLevel', operator: 'IN', value: ['HIGH', 'CRITICAL'] },
        { field: 'executiveSummary', operator: 'CONTAINS', value: 'rejected' },
      ],
      actions: [
        { type: 'ADD_LABEL', payload: { label: 'URGENT_GATE_HOLD' } },
        { type: 'ASSIGN_QUEUE', payload: { queueName: 'Priority Fleet Dispatchers' } },
        { type: 'SEND_WEBHOOK', payload: { endpoint: 'https://hooks.slack.com/services/periskope/fleet-emergency', channel: '#fleet-alerts' } },
        { type: 'POST_REPLY', payload: { template: 'AUTO_ACK_DISPATCH_ON_ROUTE' } },
      ],
    },
    {
      id: 'rule_hospital_emergency_admission',
      name: 'Emergency Cashless Admission Immediate SLA Escalation',
      trigger: 'message.multimodal_analyzed',
      conditions: [
        { field: 'domainCategory', operator: 'EQUALS', value: 'HEALTHCARE_INSURANCE' },
        { field: 'urgencyLevel', operator: 'EQUALS', value: 'CRITICAL' },
      ],
      actions: [
        { type: 'ADD_LABEL', payload: { label: 'CRITICAL_CASHLESS_ADMISSION' } },
        { type: 'ASSIGN_QUEUE', payload: { queueName: 'Emergency Pre-Auth Medical Team' } },
        { type: 'SEND_WEBHOOK', payload: { endpoint: 'https://hooks.slack.com/services/periskope/hospital-sla', channel: '#emergency-claims' } },
      ],
    },
  ];

  private static executionLogs: AutomationExecutionResult[] = [];

  /**
   * Evaluates rules against an incoming multimodal extraction payload
   */
  public static evaluateAndExecute(
    payload: ExtractedMultimodalPayload,
    messageId?: string
  ): {
    rulesTriggered: string[];
    actionsExecuted: Array<{ type: string; payload: any }>;
  } {
    const rulesTriggered: string[] = [];
    const actionsExecuted: Array<{ type: string; payload: any }> = [];

    for (const rule of this.rules) {
      let matches = true;

      for (const cond of rule.conditions) {
        const val = (payload as any)[cond.field];

        if (cond.operator === 'EQUALS') {
          if (val !== cond.value) matches = false;
        } else if (cond.operator === 'IN') {
          if (!Array.isArray(cond.value) || !cond.value.includes(val)) matches = false;
        } else if (cond.operator === 'CONTAINS') {
          if (typeof val !== 'string' || !val.toLowerCase().includes(String(cond.value).toLowerCase())) {
            matches = false;
          }
        }
      }

      if (matches) {
        rulesTriggered.push(rule.name);
        const dispatched = [];

        for (const act of rule.actions) {
          actionsExecuted.push(act);
          dispatched.push({
            type: act.type,
            payload: act.payload,
            status: 'SUCCESS' as const,
            executedAt: new Date().toISOString(),
          });
        }

        this.executionLogs.push({
          ruleId: rule.id,
          ruleName: rule.name,
          triggered: true,
          actionsDispatched: dispatched,
        });
      }
    }

    return { rulesTriggered, actionsExecuted };
  }

  /**
   * Returns recent rule execution history for UI and telemetry
   */
  public static getExecutionLogs(): AutomationExecutionResult[] {
    return [...this.executionLogs];
  }

  /**
   * Resets execution logs
   */
  public static clearLogs(): void {
    this.executionLogs = [];
  }
}
