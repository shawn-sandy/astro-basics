# Axiom Setup Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-08
**Estimated Time:** 15 minutes

## Overview

This guide walks you through setting up Axiom production logging for the astro-basics project. Axiom provides persistent log storage, searchable history, and real-time alerting for production applications.

## Prerequisites

- Project administrator access
- GitHub account (recommended for signup)
- Netlify/Vercel deployment access (for production setup)

## Step 1: Create Axiom Account

1. Navigate to [https://axiom.co/signup](https://axiom.co/signup)
2. Sign up using GitHub (recommended) or email
3. Verify your email address
4. Complete the onboarding questionnaire (optional)

**Free Tier Benefits:**

- 500GB log ingestion per month
- 30-day log retention
- Unlimited queries
- Real-time streaming

## Step 2: Create a Dataset

Datasets in Axiom are collections of logs organized by application or environment.

1. In the Axiom dashboard, click **"Datasets"** in the left sidebar
2. Click **"Create Dataset"** button
3. Enter dataset details:
   - **Name:** `astro-basics` (or your preferred name)
   - **Description:** "Production logs for astro-basics application"
4. Click **"Create"**

> **Note:** Dataset names are case-sensitive and immutable after creation.

## Step 3: Generate API Token

API tokens authenticate your application to send logs to Axiom.

1. Click your profile icon in the top-right
2. Select **"Settings"** → **"API Tokens"**
3. Click **"Create Token"**
4. Configure token settings:
   - **Name:** `astro-basics-production`
   - **Permissions:** Select both "Ingest" and "Query"
   - **Datasets:** Select your `astro-basics` dataset
5. Click **"Create"**
6. **CRITICAL:** Copy the token immediately and store it securely
   - Token format: `xaat-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Tokens are only shown once and cannot be retrieved later

> **Security Note:** Treat API tokens like passwords. Never commit them to version control.

## Step 4: Configure Local Development Environment

Add Axiom credentials to your local environment file:

```bash
# In your project root, edit .env file
AXIOM_TOKEN=xaat-your-token-here
AXIOM_DATASET=astro-basics
```

**Verify Configuration:**

```bash
# Check environment variables are loaded
npm run dev

# Look for initialization message in console:
# "✅ Axiom logging initialized"
```

## Step 5: Configure Production Environment (Netlify)

### Option A: Netlify Dashboard

1. Navigate to [Netlify Dashboard](https://app.netlify.com)
2. Select your site → **"Site settings"**
3. Navigate to **"Environment variables"** section
4. Click **"Add a variable"** and add:

| Key             | Value                | Scope       |
| --------------- | -------------------- | ----------- |
| `AXIOM_TOKEN`   | `xaat-your-token...` | All deploys |
| `AXIOM_DATASET` | `astro-basics`       | All deploys |

5. Click **"Save"**
6. Trigger a new deployment to apply changes

### Option B: Netlify CLI

```bash
# Install Netlify CLI if not already installed
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to your site
netlify link

# Set environment variables
netlify env:set AXIOM_TOKEN "xaat-your-token-here"
netlify env:set AXIOM_DATASET "astro-basics"

# Trigger deployment
netlify deploy --prod
```

## Step 6: Verify Integration

### Development Environment

1. Start the development server: `npm run dev`
2. Look for Axiom initialization message in console
3. Make a test request to any API route
4. Check Axiom dashboard → Datasets → `astro-basics`
5. Verify logs appear within 1-2 seconds

### Production Environment

1. Deploy to production: `git push` or manual deployment
2. Make a test API request to your live site
3. Open Axiom dashboard → Datasets → `astro-basics`
4. Filter logs: `environment == "production"`
5. Verify logs include correlation IDs and request metadata

## Troubleshooting

### Issue: "⚠️ Axiom not configured - using console-only logging"

**Cause:** Environment variables not loaded or incorrect

**Solution:**

```bash
# Verify environment variables exist
echo $AXIOM_TOKEN
echo $AXIOM_DATASET

# Restart dev server to reload .env file
npm run dev
```

### Issue: No logs appearing in Axiom dashboard

**Possible Causes & Solutions:**

1. **Invalid API Token**

   - Regenerate token in Axiom settings
   - Ensure "Ingest" permission is enabled
   - Update environment variables with new token

2. **Wrong Dataset Name**

   - Verify dataset exists in Axiom dashboard
   - Check for typos (case-sensitive)
   - Ensure `AXIOM_DATASET` matches exactly

3. **Network/Firewall Issues**

   - Check browser console for CORS errors
   - Verify outbound HTTPS requests are allowed
   - Test Axiom API directly: `curl -H "Authorization: Bearer $AXIOM_TOKEN" https://api.axiom.co/v1/datasets`

4. **Missing `logger.flush()` Calls**
   - Axiom batches logs for efficiency
   - Serverless functions may terminate before batch sends
   - Ensure `logger.flush()` is called in API route `finally` blocks

### Issue: "Dataset not found" error

**Cause:** Dataset name mismatch or token lacks dataset access

**Solution:**

1. Verify dataset name: Axiom Dashboard → Datasets
2. Check token permissions: Settings → API Tokens → Edit token
3. Ensure token has access to the specific dataset
4. Update environment variables if dataset name changed

### Issue: Slow log ingestion (>5 seconds delay)

**Cause:** Normal behavior - Axiom batches logs for efficiency

**Not an Issue:** Logs typically appear within 1-2 seconds but may take up to 5 seconds during high volume

**Force Immediate Delivery:**

```typescript
// In API routes
await logger.flush()
```

## Best Practices

### Security

- ✅ Store tokens in environment variables only
- ✅ Use separate tokens for dev/staging/production
- ✅ Rotate tokens every 90 days
- ✅ Never log tokens, passwords, or PII
- ❌ Don't commit tokens to version control
- ❌ Don't expose tokens in client-side code

### Performance

- Use `logger.flush()` only when necessary (end of API routes)
- Let Axiom batch logs automatically for optimal performance
- Filter log levels in production (warn/error only to console)
- Use correlation IDs for efficient log searching

### Organization

- Use consistent dataset naming: `{project}-{environment}`
- Add metadata fields for filtering: `environment`, `service`, `version`
- Create separate datasets for different applications
- Archive old datasets after retention period

## Next Steps

1. ✅ Axiom account created and configured
2. ✅ Local development environment setup
3. ✅ Production environment configured
4. 📖 Read [Axiom Usage Guide](./axiom-usage-guide.md) for logging patterns
5. 📊 Set up dashboards and alerts in Axiom UI
6. 🧪 Review test logs to verify correlation IDs and performance metrics

## Additional Resources

- [Axiom Official Documentation](https://axiom.co/docs)
- [Axiom JavaScript SDK](https://github.com/axiomhq/axiom-js)
- [Axiom Query Language (APL)](https://axiom.co/docs/apl/introduction)
- [Usage Guide](./axiom-usage-guide.md) - Query examples and best practices
- [Implementation Plan](./axiom-integration-implementation.md) - Technical details

## Support

**Axiom Support:**

- Documentation: [axiom.co/docs](https://axiom.co/docs)
- Discord: [axiom.co/discord](https://axiom.co/discord)
- Email: support@axiom.co

**Project Support:**

- Review implementation plan: `specs/logging/axiom-integration-implementation.md`
- Check logger source: `src/utils/logger.ts`
- Test configuration: `npm run dev` and check console output
