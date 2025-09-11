# Events Feature Implementation Guide

## Overview

This document provides a complete implementation guide for the Events feature, which connects to the Supabase `events` table and provides a comprehensive viewing system for event management.

## Database Schema

The `events` table in Supabase has the following structure:

```sql
events {
  id: uuid (primary key, auto-generated)
  name: text (required)
  description: text (nullable)
  start_time: timestamptz (required)
  end_time: timestamptz (required)
  location: text (nullable)
  status: text (enum: 'planned', 'active', 'completed', 'cancelled')
  organization_id: text (default: 'serve513-beta')
  created_at: timestamptz (auto)
  updated_at: timestamptz (auto)
}
```

**Note:** Row Level Security (RLS) is enabled on this table.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
├───────────────────────────────────────────────────┤
│  Pages                │  Components              │
│  - /events            │  - EventsList.astro      │
│  - /events/[id]       │  - EventCard.astro       │
│  - /dashboard/events  │  - EventsFilter.tsx      │
├───────────────────────────────────────────────────┤
│                    API Layer                     │
│  - /api/events.ts (GET, POST, PATCH, DELETE)    │
├───────────────────────────────────────────────────┤
│                   Data Layer                     │
│  - Supabase Client                              │
│  - TypeScript Types                             │
└─────────────────────────────────────────────────┘
```

## Implementation Files

### 1. Type Definitions (`src/types/events.ts`)

```typescript
/**
 * Event status enumeration
 */
export type EventStatus = 'planned' | 'active' | 'completed' | 'cancelled'

/**
 * Event database row type (matches Supabase schema)
 */
export interface EventRow {
  id: string
  name: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  status: EventStatus
  organization_id: string
  created_at: string
  updated_at: string
}

/**
 * Event display type with parsed dates
 */
export interface Event
  extends Omit<EventRow, 'start_time' | 'end_time' | 'created_at' | 'updated_at'> {
  start_time: Date
  end_time: Date
  created_at: Date
  updated_at: Date
}

/**
 * Event filter options
 */
export interface EventFilters {
  status?: EventStatus
  organization_id?: string
  start_date?: string
  end_date?: string
  search?: string
}

/**
 * API response types
 */
export interface EventsResponse {
  success: boolean
  data?: EventRow[]
  error?: string
  count?: number
  page?: number
  pageSize?: number
}

export interface EventResponse {
  success: boolean
  data?: EventRow
  error?: string
}

/**
 * Event creation/update payload
 */
export interface EventPayload {
  name: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  status?: EventStatus
  organization_id?: string
}
```

### 2. API Endpoint (`src/pages/api/events.ts`)

```typescript
import type { APIRoute } from 'astro'
import { getSupabase, isSupabaseConfigured } from '#libs/supabase'
import type { EventRow, EventFilters, EventsResponse, EventPayload } from '#types/events'

/**
 * GET /api/events - Fetch events with optional filters
 */
export const GET: APIRoute = async ({ url, request }) => {
  try {
    if (!isSupabaseConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supabase not configured',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = getSupabase()
    if (!supabase) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to initialize Supabase client',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse query parameters
    const params = url.searchParams
    const filters: EventFilters = {
      status: params.get('status') as EventFilters['status'],
      organization_id: params.get('organization_id') || undefined,
      start_date: params.get('start_date') || undefined,
      end_date: params.get('end_date') || undefined,
      search: params.get('search') || undefined,
    }

    const page = parseInt(params.get('page') || '1')
    const pageSize = parseInt(params.get('pageSize') || '10')
    const offset = (page - 1) * pageSize

    // Build query
    let query = supabase.from('events').select('*', { count: 'exact' })

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.organization_id) {
      query = query.eq('organization_id', filters.organization_id)
    }
    if (filters.start_date) {
      query = query.gte('start_time', filters.start_date)
    }
    if (filters.end_date) {
      query = query.lte('end_time', filters.end_date)
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Apply pagination and ordering
    query = query.order('start_time', { ascending: false }).range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const response: EventsResponse = {
      success: true,
      data: data as EventRow[],
      count: count || 0,
      page,
      pageSize,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * POST /api/events - Create a new event
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    if (!isSupabaseConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supabase not configured',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = getSupabase()
    if (!supabase) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to initialize Supabase client',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body: EventPayload = await request.json()

    // Validate required fields
    if (!body.name || !body.start_time || !body.end_time) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: name, start_time, end_time',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabase.from('events').insert([body]).select().single()

    if (error) {
      console.error('Supabase insert error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

### 3. EventCard Component (`src/components/astro/EventCard.astro`)

```astro
---
import type { EventRow } from '#types/events'

export type Props = {
  event: EventRow
  showDescription?: boolean
  linkToDetail?: boolean
}

const { event, showDescription = true, linkToDetail = false } = Astro.props

// Format dates for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Status colors
const statusColors = {
  planned: 'status-planned',
  active: 'status-active',
  completed: 'status-completed',
  cancelled: 'status-cancelled',
}

const statusClass = statusColors[event.status] || 'status-default'
---

<article class="event-card" data-event-id={event.id}>
  <header class="event-header">
    {
      linkToDetail ? (
        <h3 class="event-title">
          <a href={`/events/${event.id}`}>{event.name}</a>
        </h3>
      ) : (
        <h3 class="event-title">{event.name}</h3>
      )
    }
    <span class={`event-status ${statusClass}`}>
      {event.status}
    </span>
  </header>

  <div class="event-meta">
    <div class="event-time">
      <svg class="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clip-rule="evenodd"></path>
      </svg>
      <div>
        <div class="event-date">{formatDate(event.start_time)}</div>
        <div class="event-hours">
          {formatTime(event.start_time)} - {formatTime(event.end_time)}
        </div>
      </div>
    </div>

    {
      event.location && (
        <div class="event-location">
          <svg class="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path
              fill-rule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clip-rule="evenodd"
            />
          </svg>
          <span>{event.location}</span>
        </div>
      )
    }
  </div>

  {showDescription && event.description && <p class="event-description">{event.description}</p>}
</article>

<style>
  .event-card {
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    padding: 1.5rem;
    background: var(--color-bg-card, #ffffff);
    transition: box-shadow 0.2s ease;
  }

  .event-card:hover {
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .event-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary, #111827);
  }

  .event-title a {
    color: inherit;
    text-decoration: none;
  }

  .event-title a:hover {
    color: var(--color-primary, #3b82f6);
  }

  .event-status {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .status-planned {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .status-active {
    background-color: #d1fae5;
    color: #065f46;
  }

  .status-completed {
    background-color: #e5e7eb;
    color: #374151;
  }

  .status-cancelled {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .event-meta {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .event-time,
  .event-location {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    color: var(--color-text-secondary, #6b7280);
    font-size: 0.875rem;
  }

  .icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .event-date {
    font-weight: 500;
    color: var(--color-text-primary, #111827);
  }

  .event-hours {
    font-size: 0.875rem;
  }

  .event-description {
    margin: 0;
    color: var(--color-text-secondary, #6b7280);
    line-height: 1.5;
  }

  @media (min-width: 640px) {
    .event-meta {
      flex-direction: row;
      gap: 1.5rem;
    }
  }
</style>
```

### 4. EventsList Component (`src/components/astro/EventsList.astro`)

```astro
---
import EventCard from './EventCard.astro'
import type { EventRow } from '#types/events'

export type Props = {
  events: EventRow[]
  showDescriptions?: boolean
  linkToDetails?: boolean
  emptyMessage?: string
}

const {
  events,
  showDescriptions = true,
  linkToDetails = true,
  emptyMessage = 'No events found',
} = Astro.props
---

<div class="events-list">
  {
    events.length > 0 ? (
      <div class="events-grid">
        {events.map(event => (
          <EventCard
            event={event}
            showDescription={showDescriptions}
            linkToDetail={linkToDetails}
          />
        ))}
      </div>
    ) : (
      <div class="empty-state">
        <svg
          class="empty-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="empty-message">{emptyMessage}</p>
      </div>
    )
  }
</div>

<style>
  .events-list {
    width: 100%;
  }

  .events-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-secondary, #6b7280);
  }

  .empty-icon {
    width: 4rem;
    height: 4rem;
    margin: 0 auto 1rem;
    opacity: 0.3;
  }

  .empty-message {
    margin: 0;
    font-size: 1.125rem;
  }

  @media (min-width: 768px) {
    .events-grid {
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    }
  }
</style>
```

### 5. Events Page (`src/pages/events/index.astro`)

```astro
---
import BaseLayout from '#layouts/BaseLayout.astro'
import EventsList from '#components/astro/EventsList.astro'
import type { EventRow } from '#types/events'

// Fetch events from API
let events: EventRow[] = []
let error: string | null = null

try {
  const response = await fetch(`${Astro.url.origin}/api/events?pageSize=20`)
  const data = await response.json()

  if (data.success) {
    events = data.data || []
  } else {
    error = data.error || 'Failed to load events'
  }
} catch (e) {
  console.error('Error fetching events:', e)
  error = 'Failed to connect to the server'
}

// Group events by status for display
const upcomingEvents = events.filter(e => e.status === 'planned' || e.status === 'active')
const pastEvents = events.filter(e => e.status === 'completed')
---

<BaseLayout title="Events" description="View and manage upcoming and past events">
  <main class="events-page">
    <header class="page-header">
      <h1>Events</h1>
      <p class="page-description">Discover upcoming events and activities</p>
    </header>

    {
      error ? (
        <div class="error-message">
          <p>Error loading events: {error}</p>
        </div>
      ) : (
        <>
          <section class="events-section">
            <h2>Upcoming Events</h2>
            <EventsList events={upcomingEvents} emptyMessage="No upcoming events scheduled" />
          </section>

          {pastEvents.length > 0 && (
            <section class="events-section">
              <h2>Past Events</h2>
              <EventsList
                events={pastEvents}
                showDescriptions={false}
                emptyMessage="No past events"
              />
            </section>
          )}
        </>
      )
    }
  </main>
</BaseLayout>

<style>
  .events-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: var(--color-text-primary, #111827);
  }

  .page-description {
    font-size: 1.125rem;
    color: var(--color-text-secondary, #6b7280);
  }

  .events-section {
    margin-bottom: 3rem;
  }

  .events-section h2 {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    color: var(--color-text-primary, #111827);
  }

  .error-message {
    background-color: #fee2e2;
    color: #991b1b;
    padding: 1rem;
    border-radius: 0.5rem;
    text-align: center;
  }

  @media (min-width: 768px) {
    .events-page {
      padding: 3rem 2rem;
    }
  }
</style>
```

### 6. Interactive Filter Component (`src/components/react/EventsFilter.tsx`)

```tsx
import { useState, useEffect } from 'react'
import type { EventRow, EventStatus, EventFilters } from '#types/events'

export type Props = {
  onFilterChange: (filters: EventFilters) => void
  initialFilters?: EventFilters
}

/**
 * Interactive event filtering component
 */
export function EventsFilter({ onFilterChange, initialFilters = {} }: Props) {
  const [filters, setFilters] = useState<EventFilters>(initialFilters)

  const statusOptions: { value: EventStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'planned', label: 'Planned' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as EventStatus | ''
    setFilters(prev => ({
      ...prev,
      status: value || undefined,
    }))
  }

  const handleDateChange =
    (field: 'start_date' | 'end_date') => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters(prev => ({
        ...prev,
        [field]: e.target.value || undefined,
      }))
    }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      search: e.target.value || undefined,
    }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  return (
    <div className="events-filter">
      <div className="filter-group">
        <label htmlFor="search">Search</label>
        <input
          id="search"
          type="text"
          placeholder="Search events..."
          value={filters.search || ''}
          onChange={handleSearchChange}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="status">Status</label>
        <select id="status" value={filters.status || ''} onChange={handleStatusChange}>
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="start_date">From Date</label>
        <input
          id="start_date"
          type="date"
          value={filters.start_date || ''}
          onChange={handleDateChange('start_date')}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="end_date">To Date</label>
        <input
          id="end_date"
          type="date"
          value={filters.end_date || ''}
          onChange={handleDateChange('end_date')}
        />
      </div>

      <button type="button" className="clear-button" onClick={clearFilters}>
        Clear Filters
      </button>
    </div>
  )
}
```

## Usage Examples

### Basic Usage

```astro
---
// In a page or component
import EventsList from '#components/astro/EventsList.astro'

// Fetch events
const response = await fetch('/api/events')
const { data: events } = await response.json()
---

<EventsList events={events} />
```

### With Filters

```astro
---
// Fetch filtered events
const params = new URLSearchParams({
  status: 'active',
  pageSize: '10',
})

const response = await fetch(`/api/events?${params}`)
const { data: events } = await response.json()
---

<EventsList events={events} showDescriptions={false} emptyMessage="No active events" />
```

### Client-Side Filtering

```tsx
// In a React component
import { useState } from 'react'
import { EventsFilter } from '#components/react/EventsFilter'

function EventsPage() {
  const [events, setEvents] = useState([])

  const handleFilterChange = async filters => {
    const params = new URLSearchParams(filters)
    const response = await fetch(`/api/events?${params}`)
    const { data } = await response.json()
    setEvents(data)
  }

  return (
    <>
      <EventsFilter onFilterChange={handleFilterChange} />
      {/* Render events */}
    </>
  )
}
```

## Security Considerations

1. **Row Level Security (RLS)**: The events table has RLS enabled. Ensure proper policies are configured in Supabase.

2. **Authentication**: Consider adding authentication checks in the API endpoint for sensitive operations:

   ```typescript
   import { getAuth } from '@clerk/nextjs/server'

   // In API route
   const { userId } = getAuth(request)
   if (!userId) {
     return new Response('Unauthorized', { status: 401 })
   }
   ```

3. **Input Validation**: Always validate user input before database operations.

4. **Rate Limiting**: Consider implementing rate limiting for API endpoints.

## Testing

### Unit Tests

```typescript
// tests/events.test.ts
import { describe, it, expect } from 'vitest'
import type { EventRow } from '#types/events'

describe('Events Feature', () => {
  it('should format event dates correctly', () => {
    const event: EventRow = {
      id: '123',
      name: 'Test Event',
      start_time: '2025-01-15T10:00:00Z',
      end_time: '2025-01-15T12:00:00Z',
      // ... other fields
    }

    // Test date formatting logic
  })
})
```

### E2E Tests

```typescript
// e2e/events.spec.ts
import { test, expect } from '@playwright/test'

test('should display events list', async ({ page }) => {
  await page.goto('/events')
  await expect(page.locator('h1')).toContainText('Events')
  await expect(page.locator('.events-grid')).toBeVisible()
})

test('should filter events by status', async ({ page }) => {
  await page.goto('/events')
  await page.selectOption('#status', 'active')
  await page.waitForResponse('**/api/events*')
  // Assert filtered results
})
```

## Performance Optimization

1. **Pagination**: Always use pagination for large datasets
2. **Caching**: Consider implementing caching for frequently accessed events
3. **Lazy Loading**: Load event descriptions on demand for long lists
4. **Database Indexes**: Ensure proper indexes on filtered columns (status, start_time, organization_id)

## Future Enhancements

1. **Event Registration**: Allow users to register for events
2. **Calendar View**: Implement a calendar view for events
3. **Recurring Events**: Support for recurring event patterns
4. **Event Categories**: Add categorization and tagging
5. **Email Notifications**: Send reminders for upcoming events
6. **iCal Export**: Allow users to export events to their calendar
7. **Admin Dashboard**: Create management interface for event organizers
8. **Analytics**: Track event attendance and engagement

## Troubleshooting

### Common Issues

1. **"Supabase not configured" error**

   - Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env

2. **RLS policy violations**

   - Check Supabase dashboard for proper RLS policies
   - Ensure user has proper permissions

3. **Date formatting issues**
   - Verify timezone handling in both frontend and backend
   - Use ISO 8601 format for API communication

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Astro Documentation](https://docs.astro.build)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
