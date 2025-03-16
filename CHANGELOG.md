# Changelog

## [0.1.0] - 2025-01-26

### Added
- Initial release
- Basic Discord webhook functionality
- Support for sending messages with custom username and avatar
- Multilingual documentation (English and Japanese)
- Automated publishing workflow with GitHub Actions

### CI/CD Setup Instructions

1. Generate an NPM access token:
   - Go to npmjs.com
   - Visit Account Settings > Access Tokens
   - Generate a new automation token

2. Add the NPM token to GitHub repository secrets:
   - Go to your GitHub repository settings
   - Navigate to Settings > Secrets and variables > Actions
   - Select "Repository secrets" (not Environment secrets)
   - Create a new secret named `NPM_TOKEN` with your NPM access token
   
   Note: Use Repository secrets instead of Environment secrets because:
   - NPM publishing needs to work across all environments
   - The token is used for package publishing, not environment-specific deployments
   - We want the automation to work for all branches and tags

3. Configure GitHub Actions:
   - Create `.github/workflows/publish.yml`
   - Set up Node.js environment
   - Configure NPM authentication using the repository secret
   - Add build and publish steps
   - Configure release creation
   - Set up tag-based triggers

4. Publishing workflow:
   - Update version in package.json
   - Create and push a new tag: `git tag v0.1.0 && git push origin v0.1.0`
   - GitHub Actions will automatically:
     - Build the package
     - Run tests
     - Publish to NPM
     - Create a GitHub release

## [0.2.0] - 2024-03-13

### Added
- Response tracking functionality with `get_response` tool
- In-memory storage for webhook responses
- Request ID generation for response tracking
- Automatic cleanup of expired responses (1-hour retention)
- Response status tracking (PENDING, COMPLETED, FAILED, TIMEOUT)
- Enhanced error handling with response storage

### Changed
- Updated `send_message` to return request IDs
- Enhanced documentation with response handling details
- Added response retrieval examples

## [0.3.1] - 2024-03-13

### Changed
- Updated documentation to reference Claude Desktop instead of Dive Desktop
- Improved configuration instructions clarity

## [0.3.0] - 2024-03-13

### Changed
- Combined send_message and get_response into a single operation
- Increased response timeout to 5 minutes
- Improved response handling with automatic waiting
- Simplified API by removing get_response tool
- Updated documentation for automatic response handling

### Removed
- get_response tool (now integrated into send_message)
- Separate response retrieval step

## [0.4.0] - 2024-03-13

### Changed
- Removed WEBHOOK_URL environment variable requirement
- Added URL parameter to send_message tool
- Updated documentation for dynamic URL support
- Added URL validation
- Simplified configuration

### Added
- Dynamic webhook URL support
- URL validation function
- Updated examples with URL usage