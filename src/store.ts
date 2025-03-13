import { randomUUID } from 'crypto';

export interface WebhookRequest {
  requestId: string;
  content: string;
  username?: string;
  avatar_url?: string;
  url: string;
  status: 'PENDING' | 'SENT' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  sentAt: number;
  expiresAt: number;
  response?: {
    status: number;
    headers?: Record<string, string>;
    body?: any;
    receivedAt: number;
  };
}

class RequestStore {
  private requests: Map<string, WebhookRequest> = new Map();
  private config = {
    responseRetentionMs: 60 * 60 * 1000, // 1 hour
    maxPayloadSizeBytes: 1024 * 1024, // 1MB
    maxRequestsPerIp: 50,
    requestTimeoutMs: 30 * 60 * 1000, // 30 minutes
    cleanupIntervalMs: 15 * 60 * 1000, // 15 minutes
  };
  
  // ... existing code ...
} 