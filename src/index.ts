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
  const { content } = args as Record<string, unknown>;
  return typeof content === 'string';
};

const isValidGetResponseArgs = (args: unknown): args is GetResponseArgs => {
  if (typeof args !== 'object' || args === null) {
    return false;
  }
  const { requestId } = args as Record<string, unknown>;
  return typeof requestId === 'string';
};

class WebhookServer {
  private server: Server;
  private webhookUrl: string;

  constructor() {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('WEBHOOK_URL environment variable is required');
    }
    this.webhookUrl = webhookUrl;

    this.server = new Server(
      {
        name: 'webhook-mcp',
        version: '0.1.11',
      },
      {
        capabilities: {
          tools: {
            alwaysAllow: ['send_message', 'get_response']
          },
        },
      }
    );

    this.setupToolHandlers();
    
    // 加強錯誤處理
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
      process.exit(1);  // 遇到嚴重錯誤時結束程序
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
          description: 'Send message to webhook endpoint',
          inputSchema: {
            type: 'object',
            properties: {
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
            required: ['content'],
          },
        },
        {
          name: 'get_response',
          description: 'Get the response for a previously sent webhook message',
          inputSchema: {
            type: 'object',
            properties: {
              requestId: {
                type: 'string',
                description: 'The request ID returned from send_message',
              },
            },
            required: ['requestId'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'send_message') {
        return this.handleSendMessage(request.params.arguments);
      } else if (request.params.name === 'get_response') {
        return this.handleGetResponse(request.params.arguments);
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
        'Content parameter is required'
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

    const requestId = store.generateRequestId();

    // Store request information
    store.saveRequest({
      requestId,
      content: args.content,
      username: args.username,
      avatar_url: args.avatar_url,
      url: this.webhookUrl,
      status: 'PENDING',
      sentAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });

    try {
      const response = await axios.post(this.webhookUrl, {
        text: args.content,
        username: args.username,
        avatar_url: args.avatar_url,
      });

      // Store response
      store.updateRequest(requestId, {
        status: 'COMPLETED',
        response: {
          status: response.status,
          headers: response.headers as Record<string, string>,
          body: response.data,
          receivedAt: Date.now(),
        },
      });

      return {
        content: [
          {
            type: 'text',
            text: `Message sent successfully. Request ID: ${requestId}`,
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
              text: `Webhook error: ${errorMessage}. Request ID: ${requestId}`,
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
