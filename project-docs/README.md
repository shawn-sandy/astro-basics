# Specs Directory - Navigation Hub

Welcome to the astro-basics project documentation. This directory contains all specifications, guides, implementation plans, and reference materials for the project.

## Quick Navigation

**New to the project?** Start here:

1. Read [QUICK-START.md](./QUICK-START.md) for a 5-minute orientation
2. Follow the [Getting Started Guide](./01-getting-started/setup-guide.md) for detailed setup
3. Check [Authentication Guide](./01-getting-started/authentication-guide.md) for auth setup

**Need something specific?** Use the directory index below.

---

## Directory Structure

### 01-getting-started/

**First-time setup and onboarding materials**

Essential guides for getting the project running:

- `setup-guide.md` - Complete project setup walkthrough
- `authentication-guide.md` - Clerk authentication setup
- `database-setup.md` - Database configuration (Turso/Supabase)
- `linting-guide.md` - Code quality and linting setup
- `mcp-servers.md` - Model Context Protocol server setup

### 02-guides/

**How-to guides for specific tasks**

Step-by-step tutorials for common operations:

- `clerk-supabase-setup.md` - Integrating Clerk with Supabase
- `configurable-roles.md` - Setting up custom role systems
- `database-switching-guide.md` - Switching between database providers
- `database-troubleshooting-guide.md` - Common database issues
- `role-guard-usage-guide.md` - Using role-based access control

### 03-features/

**Feature specifications and implementation details**

Documentation for major features:

- `comment-system.md` - Polymorphic comment system architecture
- `events-implementation.md` - Event system design
- `starlight-integration-implementation.md` - Starlight docs integration
- `turso-comments-implementation-plan.md` - Turso-specific comment features

### 04-integrations/

**Third-party service integrations**

Organized by provider:

#### clerk/

- `setup-guide.md` - Basic Clerk setup
- `integration-plan.md` - Clerk-Supabase integration strategy
- `user-profile-fixes.md` - User profile troubleshooting
- `react-integration.md` - Clerk with React components
- `roles-reset-guide.md` - Role system reset procedures

#### supabase/

- `setup-guide.md` - Supabase project setup
- `migration-guide-jwt.md` - Migrating from JWT to native auth
- `native-integration.md` - Modern Clerk-Supabase integration

#### turso/

- `README.md` - Turso database overview
- `optimization-guide.md` - Performance optimization tips

#### Other

- `pwa-setup.md` - Progressive Web App configuration

### 05-database/

**Database schemas, migrations, and architecture**

- `comments-table-feature.md` - Comment system database design
- `migration-usage-guide.md` - Database migration workflows
- `supabase-migration-refactor-plan.md` - Migration consolidation plan

### 06-implementation-plans/

**Detailed implementation roadmaps for major changes**

Active implementation plans:

- `README.md` - Implementation plans overview and critical path
- `clerk-supabase-modernization.md` - Modernizing Clerk integration
- `clerk-supabase-role-sync.md` - Organization role synchronization
- `database-refactoring.md` - Database abstraction layer
- `default-member-role.md` - Default role assignment
- `testing-implementation.md` - Test suite implementation

#### next-steps/

- `epic.md` - Next steps epic for Clerk-Supabase
- `overview.md` - Future improvements overview

### 07-prd/

**Product Requirements Documents**

Business requirements and feature specifications:

- `authentication-system-prd.md` - Authentication system requirements
- `clerk-supabase-integration-prd.md` - Integration requirements
- `message-security-prd.md` - Message security features
- `security-improvements-prd.md` - Security enhancement roadmap
- `newsletter-system-prd.md` - Newsletter feature requirements

### 08-testing/

**Testing strategies and documentation**

- `e2e-testing.md` - End-to-end testing with Playwright
- `auth-testing-plan.md` - Authentication testing strategy
- `e2e-workflow.md` - E2E workflow implementation
- `ngrok-webhook-testing.md` - Local webhook testing with ngrok

### 09-releases/

**Release planning and management**

- `RELEASE-PROCESS.md` - Release workflow and procedures
- `v0.2.0-RELEASE-epic.md` - Version 0.2.0 release epic
- `release-template-generator.md` - Release document templates
- Version-specific release notes and security audits

### 10-security/

**Security documentation and audit reports**

- `overview.md` - Security overview and best practices

#### audits/

- `security-audit-report.md` - Comprehensive security audit
- `v0.2.0-findings.md` - Release-specific security findings

#### fixes/

- `role-sync-fix.md` - Role synchronization security fix

### 11-reference/

**Reference materials and historical documents**

Technical references and deep-dives:

- `authentication-review.md` - Authentication architecture review
- `git-workflow.md` - Git branching and workflow standards
- `jwt-implementation.md` - JWT implementation details
- `astro-db-integration.md` - Astro DB integration reference
- `claude-code-setup.md` - Claude Code configuration

### 12-utilities/

**Utility scripts and tools**

- `clerk-configuration-utility.md` - Clerk config automation

### 13-agents/

**AI agent configurations and workflows**

- `release-manager-optimized.md` - Release management agent
- `agent-coordination-system.md` - Multi-agent coordination
- `security-audit.md` - Security audit agent
- `documentation.md` - Documentation agent

### 14-logging/

**Logging strategies and implementations**

Application logging documentation and patterns.

### 15-commands/

**Custom CLI commands and scripts**

Documentation for project-specific commands.

### completed/

**Completed implementation work**

Historical record of completed projects:

- `implementation-summary.md` - Overall implementation summary
- `implementation-complete.md` - Completion reports
- `post-migration-checklist.md` - Migration verification
- `phase-1-verification.md` - Phase 1 completion report
- `phase-2-migration.md` - Phase 2 completion report
- `role-sync-resolution.md` - Role sync completion
- `clerk-user-profile-impl.md` - User profile implementation

### archived/

**Deprecated and historical documents**

Old documents kept for historical reference. See `archived/README.md` for archive policy.

---

## Document Types Guide

### Specifications (Specs)

Detailed technical specifications for features or systems. Found in `03-features/` and `05-database/`.

### Guides

Step-by-step tutorials for specific tasks. Found in `01-getting-started/` and `02-guides/`.

### Implementation Plans

Detailed roadmaps for major changes. Found in `06-implementation-plans/`.

### PRDs (Product Requirements Documents)

Business and product requirements. Found in `07-prd/`.

### Reference Materials

Technical deep-dives and architecture reviews. Found in `11-reference/`.

### Completed Work

Historical record of finished implementations. Found in `completed/`.

---

## Finding What You Need

### I want to

**...set up the project for the first time**
→ Start with [01-getting-started/setup-guide.md](./01-getting-started/setup-guide.md)

**...understand authentication**
→ Read [01-getting-started/authentication-guide.md](./01-getting-started/authentication-guide.md)
→ Then check [04-integrations/clerk/](./04-integrations/clerk/) for advanced topics

**...work with the database**
→ Start with [01-getting-started/database-setup.md](./01-getting-started/database-setup.md)
→ See [02-guides/database-switching-guide.md](./02-guides/database-switching-guide.md) for provider switching
→ Check [05-database/](./05-database/) for schema details

**...implement a new feature**
→ Review existing feature docs in [03-features/](./03-features/)
→ Check [06-implementation-plans/](./06-implementation-plans/) for examples
→ Review relevant PRDs in [07-prd/](./07-prd/)

**...run tests**
→ See [08-testing/e2e-testing.md](./08-testing/e2e-testing.md) for E2E tests
→ Check [08-testing/auth-testing-plan.md](./08-testing/auth-testing-plan.md) for auth testing

**...prepare a release**
→ Follow [09-releases/RELEASE-PROCESS.md](./09-releases/RELEASE-PROCESS.md)
→ Use templates in [09-releases/release-template-generator.md](./09-releases/release-template-generator.md)

**...review security**
→ Start with [10-security/overview.md](./10-security/overview.md)
→ Review audit reports in [10-security/audits/](./10-security/audits/)

**...understand the architecture**
→ Browse [11-reference/](./11-reference/) for architecture reviews
→ Check [03-features/](./03-features/) for feature architecture

---

## Contributing to Documentation

### Adding New Documents

1. **Choose the right directory** based on document type (see Directory Structure above)
2. **Use clear naming** - descriptive kebab-case filenames
3. **Add frontmatter** if using templates (see existing docs for examples)
4. **Update this README** if adding a new major section
5. **Cross-reference** related documents

### Document Organization Principles

- **One topic, one document** - Keep documents focused
- **Progressive disclosure** - Start simple, link to advanced topics
- **Clear hierarchy** - Use numbered directories for browsing order
- **Living documentation** - Update docs as code changes
- **Archive old content** - Move outdated docs to `archived/`

### When to Archive

Documents should be moved to `archived/` when:

- Implementation is complete and documented elsewhere
- Technology/approach has been deprecated
- Information is outdated but may be useful for reference
- Superseded by newer documentation

---

## Quick Links

- **Project README**: [../README.md](../README.md)
- **CLAUDE.md** (AI instructions): [../CLAUDE.md](../CLAUDE.md)
- **Package.json** (scripts): [../package.json](../package.json)
- **Main Docs** (Starlight): [../docs/](../docs/)

---

**Last Updated**: 2025-10-10
**Maintained By**: Development Team
