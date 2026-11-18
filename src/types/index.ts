/**
 * Data contracts and type specifications for Periskope Multimodal Pipeline
 */

export type MediaType = 'VOICE_NOTE' | 'IMAGE_DOCUMENT' | 'PDF';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DomainCategory = 'LOGISTICS' | 'HEALTHCARE_INSURANCE' | 'HOSPITALITY' | 'GENERAL_SUPPORT';
export type ActionType = 'CREATE_TICKET' | 'SYNC_TO_ERP' | 'NOTIFY_SLACK' | 'DRAFT_REPLY';

export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface ExtractedEntities {
  invoiceNumbers?: string[];
  trackingOrLRNumbers?: string[];
  eWayBillNumbers?: string[];
  vehiclePlateNumbers?: string[];
  financialAmounts?: Array<{ currency: string; amount: number; description: string }>;
  policyOrUHIDNumbers?: string[];
  personOrDriverNames?: string[];
  locations?: string[];
  issueDescription?: string;
  validationFlags?: Record<string, { isValid: boolean; warning?: string }>;
}

export interface RecommendedAction {
  actionId: string;
  label: string;
  actionType: ActionType;
  prefilledPayload: Record<string, any>;
}

export interface ExtractedMultimodalPayload {
  mediaType: MediaType;
  durationSeconds?: number;
  languageDetected: string;
  overallConfidence: number;
  executiveSummary: string;
  urgencyLevel: UrgencyLevel;
  domainCategory: DomainCategory;
  entities: ExtractedEntities;
  recommendedActions: RecommendedAction[];
  wordTimestamps?: WordTimestamp[];
  audioBase64?: string;
  imageBase64?: string;
}

export interface MultimodalAsset {
  id: string;
  messageId: string;
  orgId: string;
  chatId: string;
  senderPhone: string;
  senderName: string;
  mediaType: MediaType;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds?: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  rawBuffer?: Buffer;
  createdAt: Date;
}

export interface MultimodalExtractionRecord {
  id: string;
  assetId: string;
  messageId: string;
  rawTranscript?: string;
  wordTimestamps?: WordTimestamp[];
  detectedLanguage: string;
  confidenceScore: number;
  executiveSummary: string;
  urgencyLevel: UrgencyLevel;
  domainCategory: DomainCategory;
  entities: ExtractedEntities;
  recommendedActions: RecommendedAction[];
  searchTokens: string[];
  createdAt: Date;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: 'message.multimodal_analyzed';
  conditions: Array<{
    field: string;
    operator: 'EQUALS' | 'CONTAINS' | 'IN';
    value: any;
  }>;
  actions: Array<{
    type: 'ADD_LABEL' | 'ASSIGN_QUEUE' | 'SEND_WEBHOOK' | 'POST_REPLY';
    payload: Record<string, any>;
  }>;
}

export interface SynopsisActionLog {
  id: string;
  extractionId: string;
  actionId: string;
  actionType: ActionType;
  executedAt: Date;
  status: 'SUCCESS' | 'FAILED';
  resultPayload: Record<string, any>;
}
