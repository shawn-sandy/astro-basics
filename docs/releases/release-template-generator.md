# Release Template Generator Guide

## Overview

This guide provides templates and automation scripts for generating release documentation in the astro-basics project. Use these templates to ensure consistency across all releases.

## Template Structure

Each release requires the following standardized documents:

1. **Release Epic** - Overall release planning and coordination
2. **Security Audit Checklist** - Mandatory security assessment
3. **Release Notes** - User-facing feature and change documentation
4. **Migration Guide** - Breaking change instructions (if applicable)

## File Naming Convention

All release files use version-prefixed naming with "RELEASE" suffix:

```
docs/releases/
├── vX.Y.Z-RELEASE-epic.md
├── vX.Y.Z-RELEASE-security-audit-checklist.md
├── vX.Y.Z-RELEASE-notes.md
└── vX.Y.Z-RELEASE-migration-guide.md (if needed)
```

## Template Generation

### 1. Release Epic Template

```markdown
# Version X.Y.Z RELEASE Epic

## Epic Overview

**Epic Name:** Astro-Basics vX.Y.Z [Release Name]  
**Release Version:** X.Y.Z  
**Status:** Planning  
**Target Release Date:** [DATE]  
**Release Manager:** [NAME]  
**Priority:** [Critical/High/Medium]

### Release Goals

[Describe the main objectives and improvements for this release]

## Release Phases

### Phase 1: Pre-Release Preparation (Week 1)

- [ ] **Story 1.1:** Feature Freeze & Code Review
- [ ] **Story 1.2:** Comprehensive Security Audit ⚠️ **BLOCKS RELEASE**
- [ ] **Story 1.3:** Performance Benchmarking
- [ ] **Story 1.4:** Documentation Update

### Phase 2: Release Preparation (Week 2)

- [ ] **Story 2.1:** Version Bump & Changelog
- [ ] **Story 2.2:** Build Verification
- [ ] **Story 2.3:** Comprehensive Testing
- [ ] **Story 2.4:** Database Migration Verification

### Phase 3: Release Execution (Release Day)

- [ ] **Story 3.1:** Final Pre-Release Checks
- [ ] **Story 3.2:** Production Deployment
- [ ] **Story 3.3:** Post-Deployment Verification
- [ ] **Story 3.4:** Release Communication

### Phase 4: Post-Release Monitoring (Week 3)

- [ ] **Story 4.1:** Production Monitoring

## Success Metrics

- [ ] Zero critical bugs in production
- [ ] <1% error rate
- [ ] <2s page load time
- [ ] > 95% uptime
- [ ] All security audits passed

## Team Assignments

- **Release Manager:** [NAME]
- **Security Lead:** [NAME]
- **QA Lead:** [NAME]
- **DevOps Lead:** [NAME]
- **Documentation Lead:** [NAME]

---

**📋 Full Details:** See complete epic template for detailed checklists and procedures.
```

### 2. Security Audit Template

```markdown
# Security Audit Checklist for vX.Y.Z RELEASE

## ⚠️ RELEASE BLOCKER

**Project:** Astro-Basics  
**Version:** X.Y.Z  
**Audit Date:** [DATE]  
**Auditor:** [NAME]  
**Audit Type:** Pre-Release Security Audit

## Executive Summary

- **Overall Risk Level:** [ ] Low [ ] Medium [ ] High [ ] Critical
- **Audit Result:** [ ] PASS [ ] FAIL [ ] CONDITIONAL PASS

## OWASP Top 10 2021 Compliance

- [ ] **A01:** Broken Access Control
- [ ] **A02:** Cryptographic Failures
- [ ] **A03:** Injection
- [ ] **A04:** Insecure Design
- [ ] **A05:** Security Misconfiguration
- [ ] **A06:** Vulnerable Components
- [ ] **A07:** Authentication Failures
- [ ] **A08:** Data Integrity Failures
- [ ] **A09:** Security Logging Failures
- [ ] **A10:** Server-Side Request Forgery

## Technology-Specific Checks

### Astro Framework

- [ ] SSR security properly configured
- [ ] API routes secured
- [ ] Middleware security validated

### Clerk Integration

- [ ] Publishable key client-side only
- [ ] Secret key server-side secured
- [ ] Webhook endpoints protected

### Supabase Integration

- [ ] RLS policies configured
- [ ] Anonymous key restricted
- [ ] Service key protected

### Turso Integration

- [ ] Connection string secured
- [ ] Auth token protected
- [ ] Query parameterization verified

## Audit Approval

- **Security Lead:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***
- **Technical Lead:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***
- **Release Manager:** **\*\*\*\***\_**\*\*\*\*** Date: \***\*\_\*\***
```

### 3. Release Notes Template

```markdown
# Astro-Basics vX.Y.Z Release

**Release Date:** [DATE]  
**Release Type:** [Major/Minor/Patch]  
**Git Tag:** vX.Y.Z

## 🎉 What's New

### ✨ New Features

- [Feature description with brief explanation]
- [Another feature with user benefit]

### 🚀 Enhancements

- [Performance improvement description]
- [User experience enhancement]

### 🔧 Improvements

- [Technical improvement]
- [Developer experience enhancement]

## 🐛 Bug Fixes

- [Bug fix description and impact]
- [Another fix with reference to issue]

## 🔒 Security Updates

- [Security improvement description]
- [Vulnerability patch information]

## ⚠️ Breaking Changes

> **Note:** This section only applies to major releases

- [Breaking change description]
- [Migration instructions reference]

## 📚 Documentation

- [Documentation updates]
- [New guides or examples]

## 🏗️ Infrastructure

- [Deployment improvements]
- [Build process enhancements]

## 📈 Performance

- [Performance metrics and improvements]
- [Lighthouse score improvements]

## 🧪 Testing

- [New test coverage]
- [Testing improvements]

## 📦 Dependencies

- [Major dependency updates]
- [Security dependency patches]

## 🙏 Contributors

Thanks to all contributors who made this release possible:

- [Contributor names and contributions]

## 📋 Upgrade Instructions

### For Users

1. Update your dependencies: `npm install astro-basics-website@X.Y.Z`
2. [Any additional user steps]

### For Developers

1. Pull latest changes: `git pull origin primary`
2. Install dependencies: `npm install`
3. [Any migration steps if needed]

## 🔗 Links

- [GitHub Release](https://github.com/shawn-sandy/astro-basics/releases/tag/vX.Y.Z)
- [Full Changelog](https://github.com/shawn-sandy/astro-basics/compare/vPREV...vX.Y.Z)
- [Migration Guide](./vX.Y.Z-RELEASE-migration-guide.md) (if applicable)

---

**Full Release Epic:** [vX.Y.Z-RELEASE-epic.md](./vX.Y.Z-RELEASE-epic.md)
```

### 4. Migration Guide Template (for breaking changes)

````markdown
# Migration Guide: vPREV → vX.Y.Z

## Overview

This guide helps you migrate from version [PREV] to version X.Y.Z of astro-basics.

## Breaking Changes Summary

- [List of breaking changes with impact assessment]

## Migration Steps

### 1. [Breaking Change Category]

**What Changed:** [Description of the change]  
**Impact:** [Who is affected and how]  
**Action Required:** [Step-by-step migration instructions]

#### Before

```javascript
// Old code example
```
````

#### After

```javascript
// New code example
```

### 2. [Another Breaking Change]

[Follow same format]

## Automated Migration

If available, use our migration script:

```bash
npm run migrate:vX.Y.Z
```

## Troubleshooting

Common issues and solutions during migration:

### Issue: [Problem description]

**Solution:** [How to resolve]

## Support

If you encounter issues during migration:

- [Create an issue](https://github.com/shawn-sandy/astro-basics/issues)
- [Check discussions](https://github.com/shawn-sandy/astro-basics/discussions)
- [Review documentation](./README.md)

````

## Automation Scripts

### Release Template Generator Script

```bash
#!/bin/bash
# generate-release-templates.sh

VERSION=$1
RELEASE_NAME=$2

if [ -z "$VERSION" ] || [ -z "$RELEASE_NAME" ]; then
  echo "Usage: ./generate-release-templates.sh <version> <release-name>"
  echo "Example: ./generate-release-templates.sh v0.3.0 'Enhanced-Security-Release'"
  exit 1
fi

RELEASE_DIR="docs/releases"

# Create release epic
sed "s/X.Y.Z/$VERSION/g; s/\[Release Name\]/$RELEASE_NAME/g" \
  "$RELEASE_DIR/templates/epic-template.md" > \
  "$RELEASE_DIR/$VERSION-RELEASE-epic.md"

# Create security audit checklist
sed "s/X.Y.Z/$VERSION/g" \
  "$RELEASE_DIR/templates/security-template.md" > \
  "$RELEASE_DIR/$VERSION-RELEASE-security-audit-checklist.md"

# Create release notes
sed "s/X.Y.Z/$VERSION/g" \
  "$RELEASE_DIR/templates/notes-template.md" > \
  "$RELEASE_DIR/$VERSION-RELEASE-notes.md"

echo "✅ Generated release templates for $VERSION"
echo "📁 Files created in $RELEASE_DIR/"
echo "📋 Next steps:"
echo "  1. Review and customize epic: $VERSION-RELEASE-epic.md"
echo "  2. Create GitHub issues using the templates"
echo "  3. Begin release process execution"
````

### GitHub Issue Generator Script

```bash
#!/bin/bash
# create-release-issues.sh

VERSION=$1
RELEASE_NAME=$2

# Create epic issue
gh issue create \
  --title "Epic: $VERSION RELEASE - $RELEASE_NAME" \
  --body-file "docs/releases/$VERSION-RELEASE-epic.md" \
  --label "epic,enhancement,priority:critical" \
  --assignee "@me"

# Create security audit issue
gh issue create \
  --title "Security: Security Audit Required for $VERSION RELEASE" \
  --body-file "docs/releases/$VERSION-RELEASE-security-audit-checklist.md" \
  --label "security,priority:high,enhancement" \
  --assignee "@me"

echo "✅ Created GitHub issues for $VERSION release"
```

## Usage Instructions

### Quick Start

1. **Generate Templates**

   ```bash
   ./scripts/generate-release-templates.sh v0.3.0 "Performance-Boost"
   ```

2. **Customize Documents**

   - Edit the generated epic with specific features and goals
   - Update security checklist with version-specific requirements
   - Prepare release notes draft

3. **Create GitHub Issues**

   ```bash
   ./scripts/create-release-issues.sh v0.3.0 "Performance-Boost"
   ```

4. **Execute Release Process**
   - Follow the 4-phase process in the epic
   - Complete all security audit requirements
   - Validate all quality gates

### Manual Process

If automation scripts are not available:

1. Copy templates from this document
2. Replace placeholder values:

   - `X.Y.Z` → actual version number
   - `[DATE]` → target dates
   - `[NAME]` → team member names
   - `[Release Name]` → descriptive release name

3. Create files in `docs/releases/` with proper naming
4. Generate GitHub issues manually using gh CLI

## Best Practices

### Planning

- Start release planning 2 weeks before target date
- Ensure all team members are available during release window
- Coordinate with stakeholders for feature freeze

### Documentation

- Keep release notes user-focused, not technical
- Include visual examples for major UI changes
- Provide clear upgrade instructions
- Document any breaking changes thoroughly

### Security

- Never skip security audit, regardless of release urgency
- Ensure all OWASP Top 10 items are addressed
- Get explicit security approval before deployment

### Communication

- Announce feature freeze clearly to all contributors
- Send release updates to stakeholders
- Document any delays or scope changes
- Thank contributors in release notes

---

**Documentation Version:** 1.0.0  
**Last Updated:** 2025-01-15  
**Related:** [Release Process Guide](./RELEASE-PROCESS.md), [Release Manager Agent](@docs/agents/astro-basics-release-manager.md)
