# MCP Webhook Server

An MCP server implementation that integrates with webhooks, providing message sending capabilities and response retrieval.

## Features

* **Generic Webhook Support**: Send messages to any webhook endpoint
* **Response Tracking**: Get responses from webhook calls
* **Custom Username**: Set custom display name for messages
* **Avatar Support**: Customize message avatar
* **MCP Integration**: Works with Dive and other MCP-compatible LLMs

## Installation

```bash
npm install @abdo-el-mobayad/mcp-webhook
```

## Configuration with [Dive Desktop](https://github.com/OpenAgentPlatform/Dive)

1. Click "+ Add MCP Server" in Dive Desktop
2. Copy and paste this configuration:

```json
{
  "mcpServers": {
    "webhook": {
      "command": "npx",
      "args": [
        "-y",
        "@abdo-el-mobayad/mcp-webhook"
      ],
      "env": {
        "WEBHOOK_URL": "your-webhook-url"
      },
      "alwaysAllow": [
        "send_message",
        "get_response"
      ]
    }
  }
}
```

3. Click "Save" to install the MCP server

## Tool Documentation

* **send_message**
  * Send message to webhook endpoint
  * Inputs:
    * `content` (string, required): Message content to send
    * `username` (string, optional): Display name
    * `avatar_url` (string, optional): Avatar URL
  * Returns:
    * Request ID for tracking the response

* **get_response**
  * Get the response for a previously sent webhook message
  * Inputs:
    * `requestId` (string, required): Request ID from send_message
  * Returns:
    * Response status and data from the webhook call

## Usage Examples

Ask your LLM to:
```
"Send a message to webhook: Hello World!"
"Send a message with custom name: content='Testing', username='Bot'"
"Get the response for request: requestId='abc-123'"
```

## Manual Start

If needed, start the server manually:

```bash
npx @abdo-el-mobayad/mcp-webhook
```

## Requirements

* Node.js 18+
* MCP-compatible LLM service

## Response Handling

The server keeps track of webhook responses for 1 hour. Each response includes:
- Status (PENDING, COMPLETED, FAILED, TIMEOUT)
- Response data from the webhook
- Timestamps for request and response

## License

MIT

## Author

Abdo El Mobayad

## Repository

[GitHub Repository](https://github.com/Abdo-El-Mobayad/Webhook-Mcp-Claude)

## Keywords

* mcp
* webhook
* chat
* dive
* llm
* automation
