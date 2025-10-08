# MCP Servers Documentation

Complete guide to Model Context Protocol (MCP) servers configured for the astro-basics project.

## Table of Contents

- [Overview](#overview)
- [Installed MCP Servers](#installed-mcp-servers)
- [Configuration Management](#configuration-management)
- [Quick Reference](#quick-reference)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

## Overview

### What is MCP?

The Model Context Protocol (MCP) is an open protocol that enables AI assistants like Claude to connect with external data sources and tools. MCP servers extend Claude's capabilities beyond basic file operations, enabling:

- **Database Operations**: Direct access to Supabase/PostgreSQL databases
- **Browser Automation**: Web testing and interaction via Chrome DevTools and Playwright
- **Design-to-Code**: Generate code from Figma designs
- **Documentation Access**: Retrieve up-to-date library documentation
- **Authentication Management**: User and organization management via Clerk
- **IDE Integration**: Access editor diagnostics and features

### Benefits for astro-basics

This project leverages MCP servers to enhance development workflows:

- **Unified Database Management**: Query and migrate Supabase databases without leaving Claude
- **Automated Testing**: Run E2E tests and validate user flows
- **Component Development**: Generate UI code from Figma designs
- **Context-Aware Assistance**: Access Astro documentation and library references
- **User Management**: Manage Clerk authentication and organizations

For initial setup instructions, see [MCP-SETUP.md](../MCP-SETUP.md).

## Installed MCP Servers

### 1. Astro Docs MCP

Search and retrieve official Astro framework documentation.

**Purpose**: Provides up-to-date Astro documentation for framework-specific questions.

**Configuration**:

```json
{
  "mcpServers": {
    "astro-docs": {
      "command": "npx",
      "args": ["-y", "@astrojs/mcp-server@latest"]
    }
  }
}
```

**Installation**:

```bash
# Automatically installed via npx on first use
# No manual installation required
```

**Available Tools**:

- `mcp__Astrodocs__search_astro_docs` - Search Astro documentation

**Use Cases**:

- Understand Astro-specific patterns (SSR, content collections)
- Resolve build configuration issues
- Learn about integration APIs
- Check for breaking changes in Astro updates

**Security**: No credentials required - read-only documentation access.

### 2. Supabase MCP

Interact with Supabase projects, databases, and resources.

**Purpose**: Manage Supabase PostgreSQL databases, tables, migrations, and Edge Functions.

**Configuration**:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=your-project-ref"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your-supabase-access-token"
      }
    }
  }
}
```

**Installation**:

```bash
# 1. Copy example configuration
cp example.mcp.json ~/.config/claude-desktop/mcp_settings.json

# 2. Get your project reference from Supabase dashboard URL:
# https://supabase.com/dashboard/project/[PROJECT-REF]

# 3. Generate access token at:
# Supabase Dashboard → Settings → API → Service Role Key
```

**Required Environment Variables**:

- `SUPABASE_ACCESS_TOKEN`: Service role key (NOT anon key)

**Available Tools** (32 tools):

- `list_projects`, `get_project`, `create_project`, `pause_project`, `restore_project`
- `list_tables`, `list_extensions`, `list_migrations`, `apply_migration`, `execute_sql`
- `get_logs`, `get_advisors` (security/performance)
- `get_project_url`, `get_anon_key`, `generate_typescript_types`
- `list_edge_functions`, `get_edge_function`, `deploy_edge_function`
- `create_branch`, `list_branches`, `delete_branch`, `merge_branch`, `reset_branch`, `rebase_branch`

**Use Cases**:

- Create and manage database tables for comments system
- Run migrations for schema changes
- Check security advisors for RLS policy issues
- Generate TypeScript types from database schema
- Deploy Edge Functions for serverless logic
- Manage development branches for testing

**Security Considerations**:

- Use `--read-only` flag for non-destructive operations
- Never commit access tokens to version control
- Rotate tokens regularly
- Use service role key for server-side operations only

### 3. Chrome DevTools MCP

Browser automation and debugging via Chrome DevTools Protocol.

**Purpose**: Control Chrome browser for testing, screenshots, and web interactions.

**Configuration**:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

**Installation**:

```bash
# Automatically installed via npx
# Chrome browser must be installed on system
```

**Available Tools** (20+ tools):

- `browser_navigate`, `browser_close`, `browser_resize`
- `browser_click`, `browser_type`, `browser_fill_form`
- `browser_take_screenshot`, `browser_snapshot`
- `browser_console_messages`, `browser_network_requests`
- `browser_evaluate` (run JavaScript)
- `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`
- `emulate_cpu`, `emulate_network`

**Use Cases**:

- Visual regression testing for component updates
- Performance profiling with Core Web Vitals
- Network request debugging for API endpoints
- Screenshot generation for documentation
- Automated UI testing workflows
- Lighthouse score monitoring

**Security**: Local browser automation - no external credentials needed.

### 4. Context7 MCP

Retrieve up-to-date documentation for JavaScript/TypeScript libraries.

**Purpose**: Access current library documentation beyond Claude's knowledge cutoff.

**Configuration**:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server@latest"]
    }
  }
}
```

**Installation**:

```bash
# Automatically installed via npx on first use
```

**Available Tools**:

- `mcp__context7__resolve-library-id` - Find library by name
- `mcp__context7__get-library-docs` - Retrieve documentation

**Use Cases**:

- Get latest React patterns and hooks documentation
- Understand new Clerk SDK features
- Learn MDX syntax and plugins
- Research Astro integrations

**Workflow**:

1. Resolve library name to Context7 ID: `resolve-library-id("react")`
2. Fetch docs: `get-library-docs("/facebook/react", topic: "hooks")`

**Security**: Public documentation access - no credentials required.

### 5. Playwright MCP

Automated browser testing with Playwright framework.

**Purpose**: Cross-browser E2E testing with full browser control.

**Configuration**:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp-server@latest"]
    }
  }
}
```

**Installation**:

```bash
# Install Playwright browsers
npx playwright install

# Verify installation
npm run test:e2e
```

**Available Tools** (25+ tools):

- `browser_navigate`, `browser_navigate_back`, `browser_close`
- `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option`
- `browser_drag`, `browser_hover`, `browser_press_key`
- `browser_take_screenshot`, `browser_snapshot`
- `browser_evaluate`, `browser_file_upload`
- `browser_console_messages`, `browser_network_requests`
- `browser_handle_dialog`, `browser_wait_for`
- `browser_tabs` (list, new, close, select)
- `browser_install`, `browser_resize`

**Use Cases**:

- E2E testing for authentication flows (Clerk)
- Form submission validation (comments, contact)
- Mobile responsiveness testing
- Accessibility audits
- Visual regression testing
- Multi-page workflows (signup → dashboard)

**Security**: Local browser automation - no external credentials needed.

### 6. Figma Dev Mode MCP

Generate UI code from Figma designs.

**Purpose**: Convert Figma designs to production-ready code with design tokens.

**Configuration**:

```json
{
  "mcpServers": {
    "figma-dev-mode": {
      "command": "npx",
      "args": ["-y", "@figma/mcp-server@latest"]
    }
  }
}
```

**Installation**:

```bash
# Requires Figma Desktop app to be running
# No additional installation needed
```

**Available Tools**:

- `get_code` - Generate UI code from node
- `get_variable_defs` - Extract design tokens
- `get_code_connect_map` - Map to existing components
- `get_screenshot` - Capture design preview
- `get_metadata` - Get layer structure
- `create_design_system_rules` - Generate design rules

**Use Cases**:

- Generate Astro components from Figma designs
- Extract CSS custom properties from design tokens
- Create React components with proper variants
- Document component libraries
- Sync design system with codebase

**Node ID Extraction**:

From Figma URL `https://figma.com/design/:fileKey/:fileName?node-id=1-2`, extract `1:2`.

**Security**: Requires Figma Desktop app authentication - uses local session.

### 7. Clerk MCP

Manage user authentication and organization memberships.

**Purpose**: Administer Clerk users, organizations, and invitations.

**Configuration**:

```json
{
  "mcpServers": {
    "clerk": {
      "command": "npx",
      "args": ["-y", "@clerk/mcp-server@latest"],
      "env": {
        "CLERK_SECRET_KEY": "sk_test_..."
      }
    }
  }
}
```

**Installation**:

```bash
# Get secret key from Clerk Dashboard → API Keys
# Add to MCP configuration (NOT .env file for security)
```

**Required Environment Variables**:

- `CLERK_SECRET_KEY`: Backend API key (starts with `sk_test_` or `sk_live_`)

**Available Tools** (25+ tools):

**User Management**:

- `getUserId`, `getUser`, `getUserCount`, `updateUser`
- `updateUserPublicMetadata`, `updateUserUnsafeMetadata`

**Organization Management**:

- `getOrganization`, `createOrganization`, `updateOrganization`, `deleteOrganization`
- `updateOrganizationMetadata`

**Membership Management**:

- `createOrganizationMembership`, `updateOrganizationMembership`, `deleteOrganizationMembership`
- `updateOrganizationMembershipMetadata`

**Invitation Management**:

- `createOrganizationInvitation`, `revokeOrganizationInvitation`
- `createInvitation`, `revokeInvitation`

**Use Cases**:

- Debug authentication issues in dashboard routes
- Create test users for development
- Manage organization roles and permissions
- Audit user metadata and profiles
- Bulk user operations (testing, seeding)

**Security Considerations**:

- Use test keys in development (`sk_test_*`)
- Never expose secret keys in client code
- Store keys in MCP config (NOT environment files)
- Rotate keys after exposure

### 8. IDE MCP

Access IDE features and diagnostics.

**Purpose**: Retrieve editor diagnostics and LSP information.

**Configuration**:

Built-in MCP server - no configuration required.

**Available Tools**:

- `mcp__ide__getDiagnostics` - Get TypeScript/ESLint errors

**Use Cases**:

- Check for type errors before building
- Review linting issues across files
- Validate code quality during development

**Security**: Local editor access only.

### 9. MCP Resource Tools

Read resources from configured MCP servers.

**Purpose**: List and read resources exposed by MCP servers.

**Configuration**:

Built-in functionality - no configuration required.

**Available Tools**:

- `ListMcpResourcesTool` - List available resources
- `ReadMcpResourceTool` - Read specific resource

**Use Cases**:

- Discover available MCP resources
- Access server-specific data
- Debug MCP server connections

## Configuration Management

### Project vs. Global Configuration

**Global Configuration** (`~/.config/claude-desktop/mcp_settings.json`):

- Applies to all projects
- Stores sensitive credentials
- Shared across Claude Desktop sessions

**Project Configuration** (`.claude/settings.local.json`):

```json
{
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["supabase"],
  "permissions": {
    "allow": [
      "mcp__Astrodocs__search_astro_docs",
      "mcp__supabase__list_tables",
      "mcp__playwright__browser_navigate"
    ]
  }
}
```

### Enabling/Disabling Servers

**Enable All Project Servers**:

```json
{
  "enableAllProjectMcpServers": true
}
```

**Enable Specific Servers**:

```json
{
  "enabledMcpjsonServers": ["supabase", "chrome-devtools"]
}
```

**Disable Server**:

Remove from `enabledMcpjsonServers` array or set `enableAllProjectMcpServers: false`.

### Permission Management

Grant auto-approval for frequently used tools:

```json
{
  "permissions": {
    "allow": [
      "mcp__supabase__list_tables",
      "mcp__supabase__apply_migration",
      "Bash(npm run build:*)",
      "WebFetch(domain:clerk.com)"
    ],
    "deny": ["mcp__supabase__execute_sql"]
  }
}
```

**Wildcard Patterns**:

- `mcp__supabase__*` - All Supabase tools
- `Bash(npm run *:*)` - All npm scripts
- `WebFetch(domain:*.com)` - All .com domains

## Quick Reference

| MCP Server          | Primary Use Case          | Credentials Required | Tools Count |
| ------------------- | ------------------------- | -------------------- | ----------- |
| **Astro Docs**      | Framework documentation   | None                 | 1           |
| **Supabase**        | Database management       | Access Token         | 32          |
| **Chrome DevTools** | Browser automation        | None                 | 20+         |
| **Context7**        | Library documentation     | None                 | 2           |
| **Playwright**      | E2E testing               | None                 | 25+         |
| **Figma Dev Mode**  | Design-to-code            | Figma session        | 6           |
| **Clerk**           | Authentication management | Secret Key           | 25+         |
| **IDE**             | Editor diagnostics        | None                 | 1           |
| **MCP Resources**   | Resource access           | None                 | 2           |

## Troubleshooting

### Common Issues

**"MCP server not found"**

```bash
# Restart Claude Desktop after configuration changes
# Verify JSON syntax in mcp_settings.json
jq . ~/.config/claude-desktop/mcp_settings.json
```

**"Invalid credentials"**

- Check environment variable names match exactly
- Verify tokens are not expired
- Ensure no extra whitespace in keys

**"Permission denied"**

- Add tool to `permissions.allow` in `.claude/settings.local.json`
- Restart Claude Desktop

**"Browser not installed" (Playwright/Chrome DevTools)**

```bash
# Install Playwright browsers
npx playwright install

# Verify Chrome is installed
which google-chrome-stable
```

**"Cannot connect to Figma"**

- Launch Figma Desktop app before using MCP
- Ensure you're logged into Figma
- Check Figma Dev Mode is available (requires paid plan)

### Verification Commands

**Test Supabase Connection**:

```bash
# Ask Claude: "List my Supabase tables"
# Should return tables without errors
```

**Test Browser Automation**:

```bash
# Ask Claude: "Navigate to https://example.com and take a screenshot"
# Should open browser and capture image
```

**Test Documentation Access**:

```bash
# Ask Claude: "Search Astro docs for content collections"
# Should return relevant documentation
```

### Debug Logs

**Claude Desktop Logs** (macOS):

```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

**Check MCP Server Status**:

```bash
# View active MCP connections in Claude Desktop
# Settings → Advanced → MCP Servers
```

## Related Documentation

### Official MCP Resources

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [MCP Server Directory](https://github.com/modelcontextprotocol/servers)
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)

### Server-Specific Documentation

- [Supabase MCP Server](https://github.com/supabase/mcp-server-supabase)
- [Chrome DevTools MCP](https://github.com/anthropics/chrome-devtools-mcp)
- [Playwright MCP](https://github.com/playwright-community/mcp-server-playwright)
- [Figma Dev Mode MCP](https://github.com/figma/mcp-server-figma)
- [Clerk MCP Server](https://github.com/clerk/mcp-server-clerk)

### Project Documentation

- [MCP Setup Guide](../MCP-SETUP.md) - Initial configuration instructions
- [Database Documentation](./DATABASE.md) - Database management with Supabase MCP
- [Testing Guide](./TESTING.md) - E2E testing with Playwright MCP
- [CLAUDE.md](../CLAUDE.md) - Project architecture and guidelines

## Contributing

### Adding New MCP Servers

1. **Install Server**:

   ```bash
   # Add to global MCP config
   # Edit ~/.config/claude-desktop/mcp_settings.json
   ```

2. **Update Documentation**:

   - Add server section to this document
   - Include configuration JSON
   - Document available tools
   - Add use cases specific to astro-basics

3. **Update Permissions**:

   ```json
   // .claude/settings.local.json
   {
     "permissions": {
       "allow": ["mcp__newserver__*"]
     }
   }
   ```

4. **Test Integration**:

   - Verify server connection
   - Test key tools
   - Document any issues

### Reporting Issues

For MCP-related issues:

1. Check troubleshooting section above
2. Review server-specific documentation
3. Report to [astro-basics issues](https://github.com/shawn-sandy/astro-basics/issues) with:
   - MCP server name
   - Error message/logs
   - Configuration (redact credentials)
   - Steps to reproduce

## License

This documentation is part of the astro-basics project (MIT License).

MCP servers are subject to their respective licenses:

- Supabase MCP: Apache 2.0
- Chrome DevTools MCP: MIT
- Playwright MCP: Apache 2.0
- Figma Dev Mode MCP: MIT
- Clerk MCP: MIT
