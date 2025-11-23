# Axiom Logs Not Showing - Troubleshooting Guide

**Status:** ✅ Configuration is correct, logs ARE being sent!

## Quick Fix Checklist

Your configuration is working correctly. If you're not seeing logs in the Axiom dashboard, try these steps **in order**:

### 1. ⏰ Wait for Ingestion (Most Common Issue)

**Problem:** Axiom has a 10-60 second ingestion delay.

**Solution:**

```bash
# Run test
npm run test:axiom-simple

# WAIT 60 seconds (count to 60)
# Then check dashboard
```

### 2. 📅 Check Time Range in Dashboard

**Problem:** Default time range might be too narrow.

**Solution:**

1. Go to <https://app.axiom.co/>
2. Look for time range selector (usually top-right)
3. Change to **"Last 1 hour"** or **"Last 24 hours"**
4. Click "Apply" or "Refresh"

### 3. 🔍 Use Exact Query from Test Output

**Problem:** Typing queries manually can introduce errors.

**Solution:**

Run test and copy the EXACT query:

```bash
npm run test:axiom-simple
```

Output will show:

```
🔍 Query to find these test logs:

   ['astro-basics']
   | where testId == "diagnostic_1760231763048"
   | order by _time desc
```

**Copy-paste this ENTIRE query** into Axiom dashboard.

### 4. 🌐 Hard Refresh Browser

**Problem:** Browser cache showing old results.

**Solution:**

- **Mac:** `Cmd + Shift + R`
- **Windows/Linux:** `Ctrl + Shift + R`

### 5. ✅ Verify Dataset Selection

**Problem:** Viewing wrong dataset in dashboard.

**Solution:**

1. In Axiom dashboard, check dataset dropdown
2. Ensure `astro-basics` is selected
3. Not "All datasets" or different dataset

---

## Step-by-Step: Finding Your Test Logs

### Method 1: Use Diagnostic Test (Simplest)

```bash
# 1. Run diagnostic (sends a test event)
npm run diagnose:axiom

# 2. Copy the testId from output (example: diagnostic_1760231763048)

# 3. Wait 60 seconds

# 4. Go to https://app.axiom.co/

# 5. Select dataset: astro-basics

# 6. Paste this query (use YOUR testId from step 2):
['astro-basics']
| where testId == "diagnostic_YOUR_NUMBER_HERE"
| order by _time desc

# 7. Set time range to "Last 1 hour"

# 8. Click "Run Query" or press Enter
```

### Method 2: Search All Recent Logs

If you can't find specific test events, search for ANY recent activity:

```apl
['astro-basics']
| where _time > ago(1h)
| order by _time desc
| limit 100
```

**What you should see:**

- If empty: No logs have been ingested in last hour
- If populated: Shows all recent events (including test events)

### Method 3: Search by Message Pattern

```apl
['astro-basics']
| where message contains "test" or message contains "diagnostic"
| where _time > ago(24h)
| order by _time desc
```

---

## Diagnostic Information

Your configuration (verified by `npm run diagnose:axiom`):

- ✅ AXIOM_TOKEN is set and valid
- ✅ AXIOM_DATASET: `astro-basics`
- ✅ Dataset exists in your Axiom account
- ✅ API connection successful
- ✅ Test events sent successfully
- ✅ Token has ingest permission

**This means logs ARE being sent to Axiom!**

---

## Common Mistakes When Querying

### ❌ Wrong: Missing quotes

```apl
['astro-basics']
| where testId == diagnostic_1760231763048  # MISSING QUOTES
```

### ✅ Correct: With quotes

```apl
['astro-basics']
| where testId == "diagnostic_1760231763048"  # CORRECT
```

### ❌ Wrong: Wrong dataset name

```apl
['astro-basic']  # Missing 's' at end
```

### ✅ Correct: Exact dataset name

```apl
['astro-basics']  # Correct
```

### ❌ Wrong: Time range too narrow

```
Time range: Last 5 minutes  # Test ran 10 minutes ago
```

### ✅ Correct: Wider time range

```
Time range: Last 1 hour  # Will catch recent tests
```

---

## Still Not Seeing Logs?

### Run This Complete Test Sequence

```bash
# 1. Run diagnostic
npm run diagnose:axiom

# 2. Note the testId in output (e.g., diagnostic_1760231763048)

# 3. Open Axiom in browser
open https://app.axiom.co/

# 4. While waiting for ingestion, prepare your query
# Replace XXXXXX with your actual testId from step 2:
echo "['astro-basics'] | where testId == \"diagnostic_XXXXXX\" | order by _time desc"

# 5. Wait exactly 60 seconds
sleep 60

# 6. Now paste query in Axiom dashboard
# 7. Set time range to "Last 1 hour"
# 8. Run query
```

### If Still No Results

Try the "show everything" query:

```apl
['astro-basics']
| take 100
```

**Possible outcomes:**

**A) Shows 0 rows:**

- Dataset is empty (no logs ever received)
- Possible token permission issue
- Check Axiom service status: <https://status.axiom.co/>

**B) Shows rows but not your test:**

- Your test logs are there but query is wrong
- Try: `['astro-basics'] | where _time > ago(1h) | count`
- This counts all logs in last hour

**C) Shows your test rows:**

- Success! Your original query had an error
- Use the working query going forward

---

## Alternative: Check Via Axiom API

If dashboard isn't working, verify via API directly:

```bash
# Replace TOKEN with your actual token
curl -X POST https://api.axiom.co/v1/datasets/astro-basics/query \
  -H "Authorization: Bearer xaat-c3c6aad2-9caf-4b32-845f-cd33dba68d32" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "'$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)'",
    "endTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "aggregations": [{"op": "count"}]
  }'
```

This will return the count of logs in the last hour.

---

## Fresh Test with Verification

Run this complete sequence to verify end-to-end:

```bash
# 1. Send fresh test
npm run test:axiom-simple

# Copy the correlation ID from output (looks like: 97941e58-b789-4af4-80d9-038a91823539)

# 2. Wait for ingestion
echo "Waiting 60 seconds for Axiom ingestion..."
sleep 60

# 3. Verify via broader query in dashboard:
# Go to https://app.axiom.co/
# Select dataset: astro-basics
# Set time range: Last 1 hour
# Run query:

['astro-basics']
| where environment == "test"
| where _time > ago(1h)
| order by _time desc

# This should show ALL test events from last hour
# If you see any rows, your logging is working!
```

---

## Success Indicators

You'll know it's working when you see:

✅ **In test output:**

```
✅ Test event sent successfully
✅ Logs flushed successfully
```

✅ **In Axiom dashboard:**

- Query returns 1 or more rows
- Events have timestamps from ~1 minute ago
- Fields match test data (testId, correlationId, etc.)

---

## Contact Information

If none of these solutions work:

1. **Check Axiom Status:** <https://status.axiom.co/>
2. **Axiom Support:** Check if there are known ingestion delays
3. **Verify Token:** Generate a new token in Axiom dashboard
4. **Test Network:** Ensure your IP isn't blocked

---

## Quick Reference

**Test Commands:**

```bash
npm run test:axiom-simple      # Quick test
npm run diagnose:axiom         # Full diagnostic
```

**Basic Query (shows last 100 events):**

```apl
['astro-basics']
| where _time > ago(1h)
| order by _time desc
| limit 100
```

**Count Query (shows total in last hour):**

```apl
['astro-basics']
| where _time > ago(1h)
| count
```

**Remember:**

- ⏰ Wait 60 seconds after sending logs
- 📅 Set time range to "Last 1 hour"
- 🔍 Copy-paste queries exactly
- 🌐 Hard refresh browser (Cmd+Shift+R)
