#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { store, WebhookRequest } from './store.js';

interface SendMessageArgs {
  url: string;
  content: string;
  username?: string;
  avatar_url?: string;
}

interface GetResponseArgs {
  requestId: string;
}

const isValidSendMessageArgs = (args: unknown): args is SendMessageArgs => {
  if (typeof args !== 'object' || args === null) {
    return false;
  }
  const { content, url } = args as Record<string, unknown>;
  return typeof content === 'string' && typeof url === 'string';
};

const isValidGetResponseArgs = (args: unknown): args is GetResponseArgs => {
  if (typeof args !== 'object' || args === null) {
    return false;
  }
  const { requestId } = args as Record<string, unknown>;
  return typeof requestId === 'string';
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Helper function to wait for response with timeout
const waitForResponse = async (requestId: string, timeoutMs: number = 300000): Promise<WebhookRequest | undefined> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const request = store.getRequest(requestId);
    if (request?.status === 'COMPLETED' || request?.status === 'FAILED') {
      return request;
    }
    await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
  }
  
  return undefined;
};

class WebhookServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'webhook-mcp',
        version: '0.4.0',
      },
      {
        capabilities: {
          tools: {
            alwaysAllow: ['send_message']
          },
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
      process.exit(1);
    };
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'send_message',
          description: 'Send message to a webhook endpoint and wait for response',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The webhook URL to send the message to',
              },
              content: {
                type: 'string',
                description: 'Message content to send',
              },
              username: {
                type: 'string',
                description: 'Display name (optional)',
              },
              avatar_url: {
                type: 'string', 
                description: 'Avatar URL (optional)',
              }
            },
            required: ['url', 'content'],
          },
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'send_message') {
        return this.handleSendMessage(request.params.arguments);
      }

      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
    });
  }

  private async handleSendMessage(args: unknown) {
    if (!isValidSendMessageArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'URL and content parameters are required'
      );
    }

    if (!args.content.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Message content cannot be empty',
          },
        ],
        isError: true,
      };
    }

    if (!isValidUrl(args.url)) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Invalid webhook URL format',
          },
        ],
        isError: true,
      };
    }

    const requestId = store.generateRequestId();

    // Store request information
    store.saveRequest({
      requestId,
      content: args.content,
      url: args.url,
      username: args.username,
      avatar_url: args.avatar_url,
      status: 'PENDING',
      sentAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });

    try {
      // Send the webhook request
      const response = await axios.post(args.url, {
        text: args.content,
        username: args.username,
        avatar_url: args.avatar_url,
      });

      // Store successful response
      store.updateRequest(requestId, {
        status: 'COMPLETED',
        response: {
          status: response.status,
          headers: response.headers as Record<string, string>,
          body: response.data,
          receivedAt: Date.now(),
        },
      });

      // Wait briefly for any additional webhook processing
      const finalRequest = await waitForResponse(requestId);
      
      return {
        content: [
          {
            type: 'text',
            text: `Message sent successfully.\nStatus: ${finalRequest?.status || 'COMPLETED'}\nResponse: ${JSON.stringify(finalRequest?.response?.body || response.data, null, 2)}`,
          },
        ],
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error('[Webhook Error]', {
          response: error.response?.data,
          status: error.response?.status
        });

        // Store error response
        store.updateRequest(requestId, {
          status: 'FAILED',
          response: {
            status: error.response?.status || 0,
            body: errorMessage,
            receivedAt: Date.now(),
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: `Webhook error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  private async handleGetResponse(args: unknown) {
    if (!isValidGetResponseArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Request ID is required'
      );
    }

    const request = store.getRequest(args.requestId);

    if (!request) {
      return {
        content: [
          {
            type: 'text',
            text: 'Request not found',
          },
        ],
        isError: true,
      };
    }

    // Check for timeout
    if (request.status === 'PENDING' && Date.now() > request.expiresAt) {
      store.updateRequest(args.requestId, { status: 'TIMEOUT' });
      return {
        content: [
          {
            type: 'text',
            text: 'Request timed out',
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Status: ${request.status}\nResponse: ${JSON.stringify(request.response?.body || 'No response data', null, 2)}`,
        },
      ],
    };
  }

  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('[MCP Server] Webhook server running on stdio');
    } catch (error) {
      console.error('[MCP Server] Failed to start:', error);
      process.exit(1);
    }
  }
}

const server = new WebhookServer();
server.run().catch(console.error);
