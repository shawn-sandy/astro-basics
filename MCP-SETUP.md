# MCP Server Configuration Guide

This guide explains how to set up MCP (Model Context Protocol) servers for the astro-basics project.

## Quick Setup

1. Copy the example configuration:

   ```bash
   cp example.mcp.json ~/.config/claude-desktop/mcp_settings.json
   ```

2. Replace the placeholder values in your copied file with actual credentials.

## Configuration Details

### Supabase MCP Server

The Supabase MCP server provides Claude with access to your Supabase database for queries and operations.

**Required Configuration:**

- `<your-project-ref>`: Your Supabase project reference ID
  - Found in your Supabase dashboard URL: `https://supabase.com/dashboard/project/[PROJECT-REF]`
- `<your-supabase-access-token>`: Your Supabase access token
  - Generate at: Supabase Dashboard → Settings → API → Service Role Key
  - **Security Note**: Use the service role key for server-side operations

**Example:**

```json
"args": [
    "-y",
    "@supabase/mcp-server-supabase@latest",
    "--read-only",
    "--project-ref=abcdefghijklmnop"
],
"env": {
    "SUPABASE_ACCESS_TOKEN": "sbp_1234567890abcdef..."
}
```

### Chrome DevTools MCP Server

Provides Claude with browser automation capabilities for testing and debugging.

**Features:**

- Browser automation for E2E testing
- Web page inspection and interaction
- Performance monitoring and analysis

**No additional configuration required** - works out of the box.

## Security Best Practices

1. **Never commit real tokens to version control**
2. **Use environment variables** for sensitive values when possible
3. **Regularly rotate access tokens**
4. **Use read-only permissions** when write access isn't needed
5. **Keep your MCP configuration file secure** (`~/.config/claude-desktop/mcp_settings.json`)

## Troubleshooting

### Common Issues

1. **"Invalid project ref"**

   - Verify your project reference ID is correct
   - Check that the project exists and is accessible

2. **"Authentication failed"**

   - Ensure your access token is valid and not expired
   - Verify the token has the necessary permissions

3. **"MCP server not found"**
   - Check that the MCP configuration file is in the correct location
   - Restart Claude Desktop after making configuration changes

### Verification

To test your configuration:

1. Ask Claude to list your Supabase tables
2. Try a simple browser automation task
3. Check Claude Desktop logs for any error messages

## Related Documentation

- [Supabase MCP Server Documentation](https://github.com/supabase/mcp-server-supabase)
- [Chrome DevTools MCP Documentation](https://github.com/anthropics/chrome-devtools-mcp)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
