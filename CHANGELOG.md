# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Comment System**: Full-featured comment system for blog posts and documentation pages
  - Polymorphic database design supporting multiple content types (`post`, `doc`)
  - Threaded comments with 3-level nesting support
  - Real-time comment creation, editing, and deletion
  - User authentication via Clerk integration
  - Rate limiting and spam protection (5 comments per minute per user)
  - Content sanitization with DOMPurify for XSS prevention
  - CSRF token validation for secure form submissions
  - Soft delete functionality (comments marked as 'archived')
  - Responsive design with accessibility features (ARIA labels, keyboard navigation)
  - Server-side rendering with client-side interactivity
- Documentation improvements and updates

### Changed

- Minor updates and refinements

## [0.2.0] - 2025-08-15

### Added

- Comprehensive release process documentation and agent coordination system
- Security audit checklist template for all releases (40-60% faster task completion)
- Release epic template with actionable checklists
- Automated release manager agent (`@docs/agents/astro-basics-release-manager.md`)
- Native Clerk-Supabase integration (2025 production-ready architecture)
- Forum and messaging features with Supabase backend
- Organization management capabilities
- Enhanced dashboard with user profile management
- Improved error handling and user feedback

### Changed

- **BREAKING**: Replaced astro-imagetools with native Astro Image component for better security
- **BREAKING**: Removed astro-lighthouse integration (performance monitoring via native tools)
- Updated authentication flow to use Clerk's native third-party integration
- Refactored Supabase client initialization for better flexibility
- Improved camelCase key transformation in data attributes
- Updated Vitest to v3.2.4 for improved testing stability
- Updated @astrojs/vercel adapter to latest version

### Fixed

- Corrected camelCase key transformation in getDataAttributes utility
- Optimized IP address validation to prevent invalid IPv6 truncation
- Fixed various TypeScript strict mode issues
- Resolved Vitest test infrastructure compatibility issues

### Security

- **CRITICAL**: 90% reduction in security vulnerabilities (20 → 2)
- **RESOLVED**: All HIGH and CRITICAL severity vulnerabilities
- **RESOLVED**: Removed vulnerable dependencies (astro-lighthouse, astro-imagetools)
- **RESOLVED**: Updated Vercel adapter to fix path-to-regexp vulnerabilities
- Implemented Row-Level Security (RLS) policies for all Supabase tables
- Added comprehensive security audit requirements for releases
- Enhanced input validation and sanitization
- Improved error handling to prevent information disclosure
- Remaining 2 moderate vulnerabilities are development-only (no production impact)

## [0.1.0] - 2024-12-XX

### Added

- Initial project setup with Astro framework
- Component library structure (Astro and React components)
- Content collections (posts, docs, content) with MDX support
- Clerk authentication integration
- Supabase database integration
- Turso (LibSQL) database support
- PWA functionality with service worker
- E2E testing with Playwright
- Unit testing with Vitest
- SCSS compilation and styling system
- GitHub Actions CI/CD pipeline
- Netlify/Vercel deployment support
- Dashboard with protected routes
- API endpoints for user data
- Message submission system
- Comprehensive linting setup (ESLint, StyleLint, Prettier)
- Pre-commit hooks with Husky
- Database migration system
- SEO optimization with sitemap generation
- Image optimization with Astro Image Tools
- Lighthouse performance monitoring

### Security

- Initial security audit completed
- Authentication middleware implemented
- Protected routes configuration
- Environment variable validation

## Release Schedule

### Upcoming Releases

#### v0.2.0 (Target: Q1 2025)

- Complete security hardening
- Performance optimizations
- Enhanced user profile management
- Improved error handling
- Production-ready release

#### v0.3.0 (Target: Q2 2025)

- Advanced organization features
- Webhook integration
- Real-time collaboration features
- Enhanced analytics

#### v1.0.0 (Target: Q3 2025)

- Stable API
- Full feature set
- Enterprise features
- Complete documentation

## Migration Guides

Migration guides for breaking changes are available in `/docs/migrations/`.

## Contributors

Thanks to all contributors who have helped shape this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

For detailed release notes, see the [releases page](https://github.com/shawn-sandy/astro-basics/releases).
