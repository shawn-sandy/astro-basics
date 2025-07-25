# Claude Code Setup Guide

This guide covers how to install and configure Claude Code for the @shawnsandy/astro-kit project.

## Prerequisites

- Node.js 18+ and npm
- Git
- An Anthropic API key

## Installation

### 1. Install Claude Code CLI

```bash
npm install -g @anthropic/claude-code
```

### 2. Authentication

Set up your Anthropic API key:

```bash
claude auth login
```

Or set the environment variable:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

## Project Configuration

The project includes Claude Code configuration files:

- `.claude/settings.local.json` - Local settings (not committed to git)
- `CLAUDE.md` - Project instructions for Claude

### Environment Setup

Create or update `.claude/settings.local.json`:

```json
{
  "projectName": "@shawnsandy/astro-kit",
  "enabledTools": ["bash", "edit", "read", "write"],
  "defaultModel": "claude-3-5-sonnet-20241022"
}
```

## Usage

### Starting Claude Code

From the project root:

```bash
claude
```

### Common Commands

- `/help` - Get help with Claude Code
- `/exit` - Exit the CLI
- `@filename` - Reference specific files in context

### Project-Specific Context

Claude Code will automatically use the `CLAUDE.md` file for project context, which includes:

- Project architecture and structure
- Essential npm commands
- Testing setup
- Authentication configuration
- Development workflow

## Key Features for This Project

### Development Workflow

Claude Code understands the project's npm scripts:

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm test` - Run unit tests
- `npm run lint` - Code linting

### Component Development

Claude Code can help with:

- Creating new Astro components in `src/components/astro/`
- Building React components in `src/components/react/`
- Updating component exports in `src/components/index.ts`

### Content Management

Assistance with content collections:

- Blog posts in `src/content/posts/`
- Documentation in `src/content/docs/`
- General content in `src/content/content/`

## Best Practices

1. **Be Specific**: Reference exact file paths and component names
2. **Use Project Structure**: Follow the established architecture
3. **Test Changes**: Always run tests after making changes
4. **Follow Conventions**: Maintain existing code style and patterns

## Troubleshooting

### Authentication Issues

```bash
claude auth logout
claude auth login
```

### Permission Errors

Ensure proper file permissions:

```bash
chmod +x node_modules/.bin/claude
```

### Project Context

If Claude Code doesn't recognize project structure, verify:

- `CLAUDE.md` exists and is up to date
- Working directory is project root
- `.git` folder is present

## Resources

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Project README](../README.md)
- [Development Guide](./development.md)
