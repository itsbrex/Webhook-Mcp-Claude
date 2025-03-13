# MCP Webhook Server

An MCP server implementation that integrates with webhooks, providing message sending capabilities with automatic response handling.

## Features

* **Generic Webhook Support**: Send messages to any webhook endpoint
* **Automatic Response Handling**: Automatically waits for and returns webhook responses
* **Custom Username**: Set custom display name for messages
* **Avatar Support**: Customize message avatar
* **MCP Integration**: Works with Dive and other MCP-compatible LLMs
* **Response Timeout**: Configurable response timeout (default: 5 minutes)

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
        "send_message"
      ]
    }
  }
}
```

3. Click "Save" to install the MCP server

## Tool Documentation

* **send_message**
  * Send message to webhook endpoint and wait for response
  * Inputs:
    * `content` (string, required): Message content to send
    * `username` (string, optional): Display name
    * `avatar_url` (string, optional): Avatar URL
  * Returns:
    * Message confirmation and webhook response data
  * Response Format:
    ```
    Message sent successfully.
    Status: COMPLETED
    Response: {
      // Your webhook response data here
    }
    ```

## Usage Examples

Ask your LLM to:
```
"Send a message to webhook: Hello World!"
"Send a message with custom name: content='Testing', username='Bot'"
```

The response will be returned automatically - no need to ask for it separately!

## Manual Start

If needed, start the server manually:

```bash
npx @abdo-el-mobayad/mcp-webhook
```

## Requirements

* Node.js 18+
* MCP-compatible LLM service

## Response Handling

The server automatically handles webhook responses:
- Waits up to 5 minutes for a response
- Returns both send confirmation and response data
- Includes response status and full response body
- Handles timeouts and errors gracefully

Response statuses:
- COMPLETED: Successfully received response
- FAILED: Error occurred
- TIMEOUT: No response within timeout period

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
