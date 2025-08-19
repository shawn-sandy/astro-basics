# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Optional Clerk Authentication**: Complete refactoring to make Clerk authentication optional
- New `src/utils/clerk-config.ts` utility for centralized authentication configuration detection
- Wrapper authentication components in `src/components/astro/auth/`:
  - `OptionalSignedIn.astro` - Conditionally renders content for authenticated users
  - `OptionalSignedOut.astro` - Conditionally renders content for unauthenticated users  
  - `OptionalUserButton.astro` - User menu with fallback when auth disabled
  - `OptionalSignInButton.astro` - Sign-in button with fallback when auth disabled
  - `AuthStatusBanner.astro` - Status banner for disabled authentication
- Comprehensive documentation in `docs/authentication/clerk-optional-integration.md`
- API endpoint guards for graceful degradation when auth is disabled

### Changed
- **BREAKING**: Modified authentication behavior to be progressive enhancement
- `astro.config.mjs`: Always include Clerk integration, validate at runtime instead of build-time
- `src/middleware.ts`: Enhanced with conditional Clerk middleware loading and fallback protection
- `src/layouts/Base.astro`: Replaced direct Clerk imports with wrapper components
- `src/pages/dashboard/*.astro`: Added auth-disabled messaging and conditional rendering
- `src/pages/profile/index.astro`: Added conditional rendering based on auth status
- `src/pages/login.astro`: Added fallback messaging for disabled authentication
- `src/pages/register.astro`: Added fallback messaging for disabled authentication
- `src/pages/admin.astro`: Updated to use wrapper components
- `src/pages/organization/index.astro`: Updated auth handling
- `src/pages/api/user/*.ts`: Added authentication guards and proper error responses
- `.env.example`: Updated documentation to indicate Clerk is optional

### Fixed
- Build failures when Clerk environment variables are missing or contain placeholder values
- Runtime errors in components when authentication is not configured
- Incorrect detection of valid Clerk test keys (starting with `pk_test_` and `sk_test_`)
- Environment variable availability issues during Astro configuration evaluation
- Misleading "Clerk integration disabled" warnings with valid test keys

### Developer Experience Improvements
- ✅ Project builds immediately without any environment configuration
- ✅ Clear error messages and setup instructions when auth features are accessed
- ✅ Graceful degradation with helpful user feedback
- ✅ Faster onboarding for new contributors
- ✅ Flexible deployment options (with or without authentication)

### Technical Implementation Details

#### Authentication Detection
- Created `isClerkEnabled` flag based on environment variable validation
- Distinguishes between real keys and common placeholder values
- Supports both test (`pk_test_*`, `sk_test_*`) and live (`pk_live_*`, `sk_live_*`) keys

#### Progressive Enhancement Pattern  
- Authentication enhances base functionality rather than gating it
- Protected routes return 503 status with helpful messages when auth disabled
- API endpoints provide informative error responses
- UI components show appropriate fallbacks and status messages

#### Runtime vs Build-time Validation
- Moved authentication validation from build-time to runtime
- Clerk integration always loaded to avoid environment variable availability issues
- Validation happens in middleware where environment variables are accessible

### Migration Notes
- Existing installations with valid Clerk keys continue to work without changes
- New installations work immediately without requiring authentication setup
- Protected routes and auth-dependent features show helpful setup instructions when accessed without configuration

---

## Previous Versions

_This changelog was started with the optional authentication refactoring. Previous changes are not documented here._