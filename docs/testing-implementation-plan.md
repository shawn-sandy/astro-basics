# Testing Implementation Plan

## Project Overview

This document outlines the comprehensive testing strategy for **@shawnsandy/astro-kit**, focusing on unit testing with Vitest and end-to-end testing with Playwright to ensure code quality and reliability.

## Current State Analysis

### Existing Setup

- ✅ **Vitest**: Configured with Astro integration (`vitest.config.ts`)
- ✅ **Playwright**: Multi-browser testing setup (`playwright.config.ts`)
- ✅ **Test Scripts**: `npm test` (Vitest), `npx playwright test` (E2E)
- ⚠️ **Coverage Gap**: Limited to basic math tests and placeholder E2E test
- 📦 **Components**: 35+ components and utilities requiring test coverage

### Test Infrastructure

```bash
tests/basic.test.ts          # Basic Vitest setup validation
e2e/home-page.spec.ts        # Placeholder Playwright test
vitest.config.ts             # Excludes e2e folder, includes Astro config
playwright.config.ts         # Multi-browser config (Chrome, Firefox, Safari)
```

## 1. Unit Testing Strategy (Vitest)

### Phase 1: Core Utilities Testing

**Priority: HIGH** - Business logic foundation

#### Target Files

- `src/libs/content.ts`
  - `Slugify()` function - URL slug generation
  - `Truncate()` function - Text truncation with ellipsis
- `src/utils/contact.ts`

  - Form validation logic
  - Email/phone validation functions
  - Error message handling

- `src/utils/site-config.ts`
  - Configuration constants validation
  - Breadcrumb routes structure
  - Contact info configuration

#### Test Coverage Goals

- 100% function coverage for utility functions
- Edge case handling (empty strings, special characters)
- Input validation and sanitization

### Phase 2: React Components Testing

**Priority: MEDIUM** - Interactive component validation

#### Target Components

- `src/components/react/ContactForm.tsx`

  - Form submission validation
  - Field validation states
  - Error message display

- `src/components/react/ContactUsForm.tsx`

  - User interaction flows
  - Form state management
  - Success/error handling

- `src/components/react/Alert.tsx`

  - Different alert types/states
  - Conditional rendering
  - Accessibility attributes

- `src/components/react/astro-breadcrumb.tsx`
  - Navigation logic
  - Route matching
  - Dynamic breadcrumb generation

#### Testing Approach

```javascript
// Example test structure
import { render, screen, fireEvent } from '@testing-library/react'
import { ContactForm } from '../components/react/ContactForm'

describe('ContactForm', () => {
  test('validates required fields', () => {
    // Test implementation
  })
})
```

### Phase 3: Astro Component Integration Tests

**Priority: MEDIUM** - Server-side rendering validation

#### Target Areas

- Component prop handling and type safety
- Slot content rendering behavior
- Conditional rendering logic
- Server-side data fetching integration

## 2. End-to-End Testing Strategy (Playwright)

### Phase 1: Core User Journeys

**Priority: HIGH** - Critical path validation

#### 1. Homepage Navigation Flow

```typescript
test('homepage loads and navigation works', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Astro Kit')

  // Test main navigation links
  await page.click('text=Blog')
  await expect(page.url()).toContain('/posts')
})
```

#### 2. Content Discovery Journey

- Browse blog posts (`/posts/[page]`)
- Navigate documentation (`/docs/[slug]`)
- Explore articles (`/content/[page]`)
- Tag-based filtering (`/tags/[tag]`)

#### 3. Authentication Flow (Clerk Integration)

- Sign in process validation
- Protected route access (`/dashboard`, `/admin`)
- Sign out functionality
- Session persistence testing

#### 4. Contact Form Validation

- Form field validation
- Successful submission flow
- Error handling scenarios
- Netlify form integration

### Phase 2: Content Management Features

**Priority: MEDIUM** - Content-driven functionality

#### 1. Pagination System

- Multi-page navigation
- Page number validation
- First/last page handling
- URL parameter handling

#### 2. Dynamic Route Handling

- Slug-based content loading
- 404 error handling for invalid slugs
- Content metadata display
- Social media integration

#### 3. Search and Discovery

- Tag-based content filtering
- Content listing functionality
- Featured content display
- RSS feed generation validation

### Phase 3: Advanced Features

**Priority: LOW** - Enhanced user experience

#### 1. Media Integration

- YouTube embed functionality
- Image optimization validation
- Responsive image loading

#### 2. Performance & Accessibility

- Page load time benchmarks
- Core Web Vitals validation
- Keyboard navigation testing
- Screen reader compatibility

#### 3. Cross-Browser Testing

- Chrome, Firefox, Safari compatibility
- Mobile responsive design validation
- Touch interaction testing

## 3. Implementation Roadmap

### Week 1: Foundation Setup

**Days 1-2: Enhanced Vitest Configuration**

```bash
npm install --save-dev @testing-library/dom @testing-library/react @testing-library/user-event jsdom
```

Update `vitest.config.ts`:

```typescript
import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/e2e/**', '**/__tests__/**', '**/node_modules/**'],
    coverage: {
      reporter: ['text', 'html', 'json'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
})
```

**Days 3-7: Core Utility Tests**

- Implement tests for `content.ts` functions
- Create validation tests for `contact.ts`
- Add configuration tests for `site-config.ts`

### Week 2: Component Testing

**Days 1-4: React Component Tests**

- Contact form component testing
- Alert component state validation
- Breadcrumb navigation logic testing

**Days 5-7: Basic E2E Implementation**

- Homepage navigation validation
- Content listing page tests
- Contact form submission flow

### Week 3: Integration Testing

**Days 1-4: Authentication E2E Tests**

- Clerk integration testing
- Protected route validation
- User session management

**Days 5-7: Content Management E2E**

- Dynamic content loading tests
- Pagination functionality validation
- Tag-based filtering tests

### Week 4: Advanced Testing & CI/CD

**Days 1-3: Performance & Accessibility**

- Lighthouse integration
- Cross-browser compatibility
- Mobile responsiveness validation

**Days 4-7: CI/CD Pipeline**

- GitHub Actions integration
- Automated test execution
- Coverage reporting setup

## 4. Testing Infrastructure Requirements

### Additional Dependencies

```json
{
  "devDependencies": {
    "@testing-library/dom": "^9.3.4",
    "@testing-library/react": "^14.2.1",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^23.2.0",
    "@vitest/coverage-v8": "^1.4.0"
  }
}
```

### Test Directory Structure

```text
tests/
├── unit/
│   ├── utils/
│   │   ├── content.test.ts
│   │   ├── contact.test.ts
│   │   └── site-config.test.ts
│   └── components/
│       ├── ContactForm.test.tsx
│       ├── Alert.test.tsx
│       └── Breadcrumb.test.tsx
├── integration/
│   └── astro-components/
└── __mocks__/
    └── clerk.ts

e2e/
├── auth/
│   ├── signin.spec.ts
│   └── protected-routes.spec.ts
├── navigation/
│   ├── homepage.spec.ts
│   ├── content-discovery.spec.ts
│   └── pagination.spec.ts
└── forms/
    └── contact-form.spec.ts
```

## 5. Test Coverage Goals

### Quantitative Metrics

- **Unit Tests**: 80%+ line coverage for utilities and React components
- **Integration Tests**: 100% coverage of major user journeys
- **E2E Tests**: All critical paths and authentication flows covered
- **Performance Tests**: Core Web Vitals benchmarks maintained

### Qualitative Standards

- Zero critical bugs in production deployments
- All accessibility standards met (WCAG 2.1 AA compliance)
- Cross-browser compatibility validated
- Mobile-first responsive design confirmed

## 6. Continuous Integration Setup

### GitHub Actions Workflow

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test -- --coverage
      - run: npx playwright install
      - run: npx playwright test
```

### Pre-commit Hooks

- Lint checking with `npm run lint`
- Type checking with TypeScript
- Unit test execution
- Code formatting validation

## 7. Success Criteria

### Technical Metrics

- ✅ All tests pass in CI/CD pipeline
- ✅ 90%+ test coverage maintained
- ✅ Performance budgets respected
- ✅ Zero accessibility violations

### User Experience Metrics

- ✅ Critical user journeys function flawlessly
- ✅ Form submissions work reliably
- ✅ Authentication flows are secure and smooth
- ✅ Content discovery is intuitive and fast

## 8. Maintenance Strategy

### Regular Testing Tasks

- **Weekly**: Review test coverage reports
- **Monthly**: Update test scenarios for new features
- **Quarterly**: Performance baseline reassessment
- **Annually**: Testing strategy comprehensive review

### Test Data Management

- Mock data for consistent testing
- Test environment configuration
- Database seeding for integration tests
- User persona-based test scenarios

---

**Next Steps**: Begin with Week 1 implementation, starting with utility function testing as the foundation for the comprehensive testing strategy.
