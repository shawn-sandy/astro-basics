# Login Analytics Queries for Axiom

**Version:** 1.0.0
**Last Updated:** 2025-10-11
**Purpose:** Pre-built Axiom queries for user login analytics and authentication monitoring

## Overview

This guide provides ready-to-use Axiom Processing Language (APL) queries for analyzing user login patterns, detecting authentication anomalies, and monitoring authentication system health in the astro-basics project.

## Table of Contents

- [Login Event Queries](#login-event-queries)
- [User Activity Analysis](#user-activity-analysis)
- [Authentication Health Monitoring](#authentication-health-monitoring)
- [Performance Metrics](#performance-metrics)
- [Security & Anomaly Detection](#security--anomaly-detection)
- [User Session Patterns](#user-session-patterns)

---

## Login Event Queries

### All Login Events (Last 24 Hours)

```apl
['astro-basics']
| where message in ("User login successful", "User login failed", "Admin login attempt", "Login error")
| where _time > ago(24h)
| order by _time desc
| project _time, level, message, userId, source, endpoint, correlationId
```

**Use Case:** Review all recent login activity across all authentication touchpoints.

### Successful Logins Only

```apl
['astro-basics']
| where message == "User login successful"
| where _time > ago(7d)
| order by _time desc
| project _time, userId, loginTimestamp, source, eventType, correlationId
```

**Use Case:** Track successful authentication events from Clerk webhooks.

### Login Event Timeline

```apl
['astro-basics']
| where message == "User login successful"
| where _time > ago(30d)
| summarize login_count = count() by bin(_time, 1d)
| order by _time asc
| render timechart
```

**Use Case:** Visualize daily login trends over the past month.

---

## User Activity Analysis

### Most Active Users (by Login Count)

```apl
['astro-basics']
| where message == "User login successful"
| where _time > ago(30d)
| summarize
    login_count = count(),
    first_login = min(_time),
    last_login = max(_time)
  by userId
| order by login_count desc
| limit 50
```

**Use Case:** Identify power users and engagement patterns.

### User Login Frequency Distribution

```apl
['astro-basics']
| where message == "User login successful"
| where _time > ago(30d)
| summarize login_count = count() by userId
| summarize
    single_login = countif(login_count == 1),
    occasional = countif(login_count >= 2 and login_count <= 5),
    regular = countif(login_count >= 6 and login_count <= 20),
    power_users = countif(login_count > 20)
| project
    single_login,
    occasional,
    regular,
    power_users,
    total = single_login + occasional + regular + power_users
```

**Use Case:** Segment users by engagement level.

### Individual User Login History

```apl
['astro-basics']
| where userId == "user_REPLACE_WITH_USER_ID"
| where message contains "login" or message contains "protected route"
| where _time > ago(30d)
| order by _time desc
| project _time, message, endpoint, role, orgId, routeType, correlationId
```

**Use Case:** Debug authentication issues for specific users.

---

## Authentication Health Monitoring

### Authentication Success vs. Failure Rate

```apl
['astro-basics']
| where message contains "login" or message contains "auth"
| where _time > ago(24h)
| summarize
    total_events = count(),
    successful = countif(message == "User login successful"),
    token_failures = countif(message == "Failed to get Clerk token"),
    sync_failures = countif(message == "Background user sync failed")
| extend
    success_rate = round((successful * 100.0) / total_events, 2),
    token_failure_rate = round((token_failures * 100.0) / total_events, 2),
    sync_failure_rate = round((sync_failures * 100.0) / total_events, 2)
| project
    total_events,
    successful,
    success_rate,
    token_failures,
    token_failure_rate,
    sync_failures,
    sync_failure_rate
```

**Use Case:** Monitor overall authentication system health.

### Recent Authentication Errors

```apl
['astro-basics']
| where level == "error" or level == "warn"
| where message contains "auth" or message contains "login" or message contains "sign in"
| where _time > ago(24h)
| order by _time desc
| project _time, level, message, userId, error, errorCode, correlationId
```

**Use Case:** Troubleshoot authentication failures and identify patterns.

### Database Sync Performance

```apl
['astro-basics']
| where dbOperation == "update_last_sign_in"
| where _time > ago(24h)
| summarize
    operation_count = count(),
    avg_duration = avg(requestDuration),
    p50_duration = percentile(requestDuration, 50),
    p95_duration = percentile(requestDuration, 95),
    p99_duration = percentile(requestDuration, 99),
    slow_operations = countif(requestDuration > 1000)
| extend slow_operation_rate = round((slow_operations * 100.0) / operation_count, 2)
```

**Use Case:** Monitor database performance during authentication flows.

---

## Performance Metrics

### Average Login Processing Time

```apl
['astro-basics']
| where message == "User login successful" or message == "API request completed"
| where endpoint == "/api/webhooks/clerk"
| where _time > ago(7d)
| summarize
    avg_duration = avg(requestDuration),
    p50 = percentile(requestDuration, 50),
    p95 = percentile(requestDuration, 95),
    p99 = percentile(requestDuration, 99),
    max_duration = max(requestDuration)
  by bin(_time, 1h)
| order by _time desc
| render timechart
```

**Use Case:** Track webhook processing performance over time.

### Slow Authentication Operations

```apl
['astro-basics']
| where requestDuration > 2000
| where message contains "login" or message contains "auth"
| where _time > ago(24h)
| order by requestDuration desc
| project _time, message, requestDuration, userId, endpoint, correlationId
| limit 100
```

**Use Case:** Identify performance bottlenecks in authentication flow.

### Protected Route Access Performance

```apl
['astro-basics']
| where message == "User accessing protected route"
| where _time > ago(24h)
| summarize
    access_count = count(),
    unique_users = dcount(userId),
    unique_endpoints = dcount(endpoint)
  by endpoint
| order by access_count desc
```

**Use Case:** Understand which protected resources are most accessed.

---

## Security & Anomaly Detection

### Unusual Login Activity (Multiple Logins in Short Time)

```apl
['astro-basics']
| where message == "User login successful"
| where _time > ago(24h)
| summarize
    login_count = count(),
    time_window = max(_time) - min(_time)
  by userId, bin(_time, 1h)
| where login_count > 5
| order by login_count desc
| project userId, login_count, time_window, hour = bin_at(_time, 1h, now())
```

**Use Case:** Detect potential credential sharing or brute-force attempts.

### Failed Token Retrievals by User

```apl
['astro-basics']
| where message == "Failed to get Clerk token"
| where _time > ago(7d)
| summarize
    failure_count = count(),
    first_failure = min(_time),
    last_failure = max(_time)
  by userId
| order by failure_count desc
| limit 50
```

**Use Case:** Identify users experiencing authentication issues.

### New User First Login Tracking

```apl
['astro-basics']
| where message == "User login successful"
| summarize first_login = min(_time) by userId
| where first_login > ago(7d)
| order by first_login desc
| project userId, first_login_time = first_login
```

**Use Case:** Track user onboarding and activation.

---

## User Session Patterns

### Peak Login Times (Hourly Distribution)

```apl
['astro-basics']
| where message == "User login successful"
| where _time > ago(7d)
| extend hour_of_day = hourofday(_time)
| summarize login_count = count() by hour_of_day
| order by hour_of_day asc
| render columnchart
```

**Use Case:** Understand when your application is most active.

### Day-of-Week Login Distribution

```apl
['astro-basics']
| where message == "User login successful"
| where _time > ago(30d)
| extend day_of_week = dayofweek(_time)
| summarize login_count = count() by day_of_week
| extend day_name = case(
    day_of_week == 0d, "Sunday",
    day_of_week == 1d, "Monday",
    day_of_week == 2d, "Tuesday",
    day_of_week == 3d, "Wednesday",
    day_of_week == 4d, "Thursday",
    day_of_week == 5d, "Friday",
    day_of_week == 6d, "Saturday",
    "Unknown"
  )
| order by day_of_week asc
| project day_name, login_count
| render columnchart
```

**Use Case:** Identify weekly usage patterns for capacity planning.

### Average Session Duration Estimation

```apl
['astro-basics']
| where message == "User accessing protected route"
| where _time > ago(7d)
| order by userId, _time asc
| serialize
| extend next_access = next(_time, 1)
| extend same_user = next(userId, 1) == userId
| where same_user
| extend session_gap = datetime_diff('minute', next_access, _time)
| where session_gap <= 30  // Consider gaps >30min as session end
| summarize
    avg_session_duration = avg(session_gap),
    p50 = percentile(session_gap, 50),
    p95 = percentile(session_gap, 95)
```

**Use Case:** Estimate how long users spend in authenticated sessions.

---

## Multi-Layer Authentication Tracking

### Full Authentication Flow Trace

```apl
['astro-basics']
| where correlationId == "REPLACE_WITH_CORRELATION_ID"
| where message contains "login" or message contains "auth" or message contains "sign in"
| order by _time asc
| project _time, level, message, source, endpoint, userId, dbOperation, requestDuration
```

**Use Case:** Debug specific authentication issues by tracing complete flow.

### Authentication Source Comparison

```apl
['astro-basics']
| where message contains "login"
| where _time > ago(7d)
| extend auth_source = case(
    source == "clerk-webhook", "Webhook",
    routeType == "protected", "Protected Route",
    dbOperation == "update_last_sign_in", "Database Sync",
    "Other"
  )
| summarize event_count = count() by auth_source
| order by event_count desc
| render piechart
```

**Use Case:** Understand distribution of login events across authentication layers.

---

## Dashboard Recommendations

### Key Metrics Dashboard

Create an Axiom dashboard with these panels:

1. **Login Rate (24h)** - Timeline of successful logins
2. **Success Rate (%)** - Authentication success vs. failure percentage
3. **Active Users (7d)** - Unique user count accessing protected resources
4. **Slow Operations** - Count of authentication operations >2s
5. **Recent Errors** - List of latest authentication errors
6. **Peak Hours** - Hourly login distribution chart

### Alert Configurations

Set up Axiom alerts for:

- **Authentication failure rate > 5%** in last hour
- **Slow login processing** (p95 > 3000ms) in last 15 minutes
- **Individual user login failures > 3** in last 10 minutes
- **Database sync failures > 10** in last hour

---

## Best Practices

1. **Use Time Windows:** Always include `| where _time > ago(Xh)` to limit query scope
2. **Include Correlation IDs:** For debugging, always filter by `correlationId` when available
3. **Combine Metrics:** Join login events with route access for full user journey analysis
4. **Set Up Alerts:** Don't just query—create proactive alerts for anomalies
5. **Regular Review:** Schedule weekly reviews of authentication health metrics

---

## Related Documentation

- [Axiom Setup Guide](./axiom-setup-guide.md)
- [Axiom Usage Guide](./axiom-usage-guide.md)
- [Logger Architecture](./logger-architecture.md)

---

**Next Steps:**

1. Copy these queries into Axiom dashboard
2. Customize time windows and thresholds for your needs
3. Create alerts based on your application's SLAs
4. Schedule regular authentication health reviews
