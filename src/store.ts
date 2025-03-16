import { randomUUID } from 'node:crypto';

export interface WebhookRequest {
  requestId: string;
  content: string;
  url: string;
  username?: string;
  avatar_url?: string;
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
  
  constructor() {
    setInterval(() => this.cleanup(), this.config.cleanupIntervalMs);
  }
  
  saveRequest(request: WebhookRequest): void {
    this.requests.set(request.requestId, request);
  }
  
  getRequest(requestId: string): WebhookRequest | undefined {
    return this.requests.get(requestId);
  }
  
  updateRequest(requestId: string, updates: Partial<WebhookRequest>): void {
    const request = this.requests.get(requestId);
    if (request) {
      this.requests.set(requestId, { ...request, ...updates });
    }
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [requestId, request] of this.requests.entries()) {
      if (request.expiresAt < now) {
        this.requests.delete(requestId);
      }
    }
  }

  generateRequestId(): string {
    return randomUUID();
  }
}

export const store = new RequestStore(); 