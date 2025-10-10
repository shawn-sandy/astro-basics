# Newsletter System Integration - Product Requirements Document

## Executive Summary

This document outlines the requirements for integrating a comprehensive newsletter system into the astro-basics project. The system will enable visitor subscriptions, email campaign management, and content distribution while maintaining compliance with email regulations and privacy standards.

## 1. Project Overview

### 1.1 Objectives

- Enable visitors to subscribe to email newsletters through the website
- Provide double opt-in confirmation for GDPR/CAN-SPAM compliance
- Deliver content-rich newsletters using existing MDX content
- Offer seamless unsubscribe functionality
- Provide administrative tools for newsletter management
- Track engagement metrics and subscriber analytics

### 1.2 Success Metrics

- Subscription conversion rate > 2%
- Email delivery rate > 95%
- Unsubscribe rate < 5%
- Email open rate > 20%
- Click-through rate > 3%
- Zero compliance violations

## 2. Technical Architecture

### 2.1 Technology Stack

- **Database**: Turso (LibSQL) - Leverage existing database infrastructure
- **Email Service**: Resend API for transactional and bulk emails
- **Email Templates**: React Email for responsive templates
- **Authentication**: Clerk for admin access control
- **Content**: MDX collections for newsletter content
- **Framework**: Astro with SSR for dynamic endpoints

### 2.2 System Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Web Forms     │────▶│  API Routes  │────▶│   Turso DB  │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │                     ▲
                               ▼                     │
                        ┌──────────────┐     ┌──────────────┐
                        │  Resend API  │     │  Admin Panel │
                        └──────────────┘     └──────────────┘
```

### 2.3 Data Flow

1. User submits subscription form
2. System generates confirmation token
3. Confirmation email sent via Resend
4. User confirms subscription
5. Subscriber added to active list
6. Newsletter content created in MDX
7. Bulk send initiated through admin
8. Tracking data collected and stored

## 3. Database Schema

### 3.1 Subscribers Table

```sql
CREATE TABLE newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    status TEXT CHECK(status IN ('pending', 'active', 'unsubscribed', 'bounced')) DEFAULT 'pending',
    confirmation_token TEXT UNIQUE,
    unsubscribe_token TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    unsubscribed_at DATETIME,
    last_email_sent DATETIME,
    tags TEXT, -- JSON array of tags
    preferences TEXT, -- JSON object for preferences
    source TEXT, -- Where they subscribed from
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX idx_subscriber_email ON newsletter_subscribers(email);
CREATE INDEX idx_subscriber_status ON newsletter_subscribers(status);
CREATE INDEX idx_confirmation_token ON newsletter_subscribers(confirmation_token);
CREATE INDEX idx_unsubscribe_token ON newsletter_subscribers(unsubscribe_token);
```

### 3.2 Newsletter Campaigns Table

```sql
CREATE TABLE newsletter_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content_path TEXT NOT NULL, -- Path to MDX file
    status TEXT CHECK(status IN ('draft', 'scheduled', 'sending', 'sent')) DEFAULT 'draft',
    scheduled_for DATETIME,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT, -- Clerk user ID
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    unsubscribe_count INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    metadata TEXT -- JSON for additional data
);
```

### 3.3 Email Events Table

```sql
CREATE TABLE newsletter_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    subscriber_id INTEGER,
    event_type TEXT CHECK(event_type IN ('sent', 'delivered', 'opened', 'clicked', 'unsubscribed', 'bounced', 'complained')),
    event_data TEXT, -- JSON with event details
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES newsletter_campaigns(id),
    FOREIGN KEY (subscriber_id) REFERENCES newsletter_subscribers(id)
);

CREATE INDEX idx_event_campaign ON newsletter_events(campaign_id);
CREATE INDEX idx_event_subscriber ON newsletter_events(subscriber_id);
CREATE INDEX idx_event_type ON newsletter_events(event_type);
```

## 4. API Endpoints

### 4.1 Public Endpoints

#### POST /api/newsletter/subscribe

- **Purpose**: Handle new subscriptions
- **Request Body**:

  ```json
  {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "source": "homepage-footer",
    "tags": ["interested-in-astro"]
  }
  ```

- **Response**:

  ```json
  {
    "success": true,
    "message": "Please check your email to confirm subscription"
  }
  ```

- **Security**: Rate limiting, CSRF protection, email validation

#### GET /api/newsletter/confirm

- **Purpose**: Confirm email subscription
- **Query Parameters**: `token` (confirmation token)
- **Response**: Redirect to success page or error page
- **Security**: Token expiration (24 hours), one-time use

#### GET /api/newsletter/unsubscribe

- **Purpose**: Handle unsubscribe requests
- **Query Parameters**: `token` (unsubscribe token)
- **Response**: Confirmation page with feedback option
- **Security**: Direct unsubscribe, no authentication required

### 4.2 Protected Admin Endpoints (Clerk Auth Required)

#### GET /api/admin/newsletter/subscribers

- **Purpose**: List all subscribers with filtering
- **Query Parameters**: `status`, `page`, `limit`, `search`
- **Response**: Paginated subscriber list

#### POST /api/admin/newsletter/campaigns

- **Purpose**: Create new campaign
- **Request Body**:

  ```json
  {
    "name": "January Newsletter",
    "subject": "New Year Updates",
    "contentPath": "/content/newsletters/2025-01.mdx",
    "scheduledFor": "2025-01-15T10:00:00Z"
  }
  ```

#### POST /api/admin/newsletter/send

- **Purpose**: Send campaign to subscribers
- **Request Body**: `{ "campaignId": 123 }`
- **Security**: Admin role verification, send confirmation

#### GET /api/admin/newsletter/analytics

- **Purpose**: Get campaign analytics
- **Response**: Detailed metrics and engagement data

## 5. User Interface Components

### 5.1 Subscription Forms

#### Newsletter Signup Component

```astro
<!-- src/components/astro/NewsletterSignup.astro -->- Email input with validation - Optional name
fields - Interest checkboxes/tags - GDPR consent checkbox - Loading states - Success/error messages
```

#### Inline Subscription Widget

```astro
<!-- src/components/astro/NewsletterWidget.astro -->- Compact form for sidebars - Email-only quick
signup - Expandable for more fields
```

### 5.2 Subscription Management Pages

#### /newsletter/confirm

- Confirmation success message
- Preference management options
- Welcome content

#### /newsletter/unsubscribe

- Unsubscribe confirmation
- Feedback form (optional)
- Re-subscribe option

#### /newsletter/preferences

- Update email frequency
- Manage topic interests
- Update personal information

### 5.3 Admin Dashboard

#### /dashboard/newsletter

- Subscriber statistics
- Recent signups
- Campaign performance
- Quick actions

#### /dashboard/newsletter/subscribers

- Searchable subscriber list
- Bulk actions (export, delete)
- Individual subscriber details
- Tag management

#### /dashboard/newsletter/campaigns

- Campaign list
- Create/edit campaigns
- Preview functionality
- Send/schedule interface
- Performance metrics

## 6. Email Templates

### 6.1 Transactional Emails

#### Confirmation Email

```tsx
// src/emails/newsletter-confirmation.tsx
- Welcome message
- Confirmation button
- What to expect
- Privacy/unsubscribe info
```

#### Welcome Email

```tsx
// src/emails/newsletter-welcome.tsx
- Thank you message
- Recent content highlights
- Community links
- Preference management
```

### 6.2 Newsletter Template

```tsx
// src/emails/newsletter-template.tsx
- Header with branding
- Content sections from MDX
- Social links
- Unsubscribe footer
- Responsive design
```

## 7. Content Management

### 7.1 Newsletter Content Collection

```typescript
// src/content/config.ts extension
const newsletters = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subject: z.string(),
    preheader: z.string(),
    publishDate: z.date(),
    featured: z.boolean().default(false),
    sections: z.array(
      z.object({
        title: z.string(),
        content: z.string(),
        cta: z
          .object({
            text: z.string(),
            url: z.string(),
          })
          .optional(),
      })
    ),
  }),
})
```

### 7.2 MDX Newsletter Format

```mdx
---
title: 'January 2025 Newsletter'
subject: 'New Year, New Features!'
preheader: "Discover what's new in astro-basics"
publishDate: 2025-01-15
---

## Introduction

Welcome to our January newsletter...

## Feature Highlight

This month we've added...

## Community Spotlight

Check out these amazing projects...
```

## 8. Security & Compliance

### 8.1 Data Protection

- **Encryption**: All sensitive tokens encrypted
- **PII Handling**: Minimal data collection, secure storage
- **Access Control**: Admin-only access to subscriber data
- **Data Retention**: Automatic cleanup of old unsubscribed data

### 8.2 Email Compliance

- **GDPR Compliance**:

  - Double opt-in required
  - Clear consent language
  - Easy data export/deletion
  - Privacy policy link

- **CAN-SPAM Compliance**:

  - Physical address in footer
  - Clear sender identification
  - Unsubscribe link in every email
  - No misleading subjects

- **One-Click Unsubscribe**:
  - List-Unsubscribe header
  - Direct unsubscribe link
  - No login required

### 8.3 Rate Limiting & Abuse Prevention

- Subscription rate limiting (5 per hour per IP)
- CAPTCHA for suspicious activity
- Email validation and MX record checking
- Bounce handling and list hygiene

## 9. Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

- [ ] Database schema creation
- [ ] Basic subscription API
- [ ] Confirmation flow
- [ ] Unsubscribe mechanism
- [ ] Basic email templates

### Phase 2: Email Service Integration (Week 3)

- [ ] Resend API setup
- [ ] React Email templates
- [ ] Transactional email flows
- [ ] Error handling and retries

### Phase 3: Admin Dashboard (Week 4-5)

- [ ] Subscriber management UI
- [ ] Campaign creation interface
- [ ] Basic analytics display
- [ ] Bulk operations

### Phase 4: Content Integration (Week 6)

- [ ] Newsletter content collection
- [ ] MDX to email conversion
- [ ] Preview functionality
- [ ] Content scheduling

### Phase 5: Analytics & Optimization (Week 7-8)

- [ ] Event tracking implementation
- [ ] Analytics dashboard
- [ ] A/B testing framework
- [ ] Performance optimization

### Phase 6: Advanced Features (Future)

- [ ] Segmentation and targeting
- [ ] Automation workflows
- [ ] RSS to newsletter
- [ ] Multi-language support

## 10. Testing Strategy

### 10.1 Unit Tests

- API endpoint validation
- Token generation and validation
- Database operations
- Email template rendering

### 10.2 Integration Tests

- End-to-end subscription flow
- Email delivery verification
- Unsubscribe process
- Admin operations

### 10.3 E2E Tests

- User subscription journey
- Email confirmation flow
- Newsletter delivery
- Analytics tracking

## 11. Performance Requirements

- Subscription API response < 200ms
- Bulk email sending > 1000 emails/minute
- Dashboard load time < 1 second
- Zero data loss during sends
- 99.9% uptime for subscription endpoints

## 12. Monitoring & Alerts

- Email delivery rates
- Bounce rate monitoring
- Subscription rate tracking
- Error rate alerts
- Performance metrics dashboard

## 13. Documentation Requirements

- API documentation
- Admin user guide
- Email template guide
- Troubleshooting guide
- Privacy policy updates

## 14. Migration Strategy

For existing contact form submissions:

1. Export current contacts (if stored)
2. Send opt-in campaign
3. Import confirmed subscribers
4. Archive old data

## 15. Success Criteria

- Functional subscription system
- Successful delivery of first campaign
- < 1% complaint rate
- Positive user feedback
- No security incidents

## 16. Risks & Mitigation

| Risk                        | Impact | Mitigation                                       |
| --------------------------- | ------ | ------------------------------------------------ |
| Email deliverability issues | High   | Proper domain authentication, gradual sending    |
| GDPR compliance violation   | High   | Double opt-in, clear consent, audit trail        |
| Database performance        | Medium | Indexing, query optimization, caching            |
| Resend API limits           | Medium | Rate limiting, queue management                  |
| Spam complaints             | High   | Clear opt-in, relevant content, easy unsubscribe |

## 17. Dependencies

- Resend API account and credits
- Email domain authentication (SPF, DKIM, DMARC)
- Privacy policy updates
- Terms of service updates
- Admin training materials

## 18. Cost Estimates

- Resend API: ~$20/month for 10,000 emails
- Additional Turso storage: Minimal
- Development time: 8 weeks
- Maintenance: 2-4 hours/month

## 19. Future Enhancements

- SMS notifications
- Push notifications
- Webhook integrations
- Advanced personalization
- AI-powered content suggestions
- Multi-channel campaigns

## Approval

This PRD requires approval from:

- [ ] Project Owner
- [ ] Technical Lead
- [ ] Legal/Compliance
- [ ] Marketing Team

---

_Last Updated: January 2025_
_Version: 1.0_
