#!/bin/bash

# check-migration-status.sh
# Purpose: Check which migrations have been applied to the database
# Usage: ./scripts/migrations/check-migration-status.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Checking Supabase Migration Status..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    # Try to load from .env file
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | grep SUPABASE_URL | xargs)
        export $(grep -v '^#' .env | grep SUPABASE_SERVICE_ROLE_KEY | xargs)

        if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
            # Extract components from Supabase URL
            # Format: https://xxxxxxxxxxxx.supabase.co
            PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

            # Construct PostgreSQL connection string
            export DATABASE_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

            echo -e "${YELLOW}ℹ️  Using Supabase credentials from .env file${NC}"
            echo ""
        fi
    fi

    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}❌ Error: DATABASE_URL environment variable not set${NC}"
        echo ""
        echo "Please set DATABASE_URL or add Supabase credentials to .env:"
        echo "  export DATABASE_URL=\"postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres\""
        echo ""
        echo "Or add to .env file:"
        echo "  SUPABASE_URL=https://[project-ref].supabase.co"
        echo "  SUPABASE_SERVICE_ROLE_KEY=eyJ..."
        exit 1
    fi
fi

# Check if schema_migrations table exists
if ! psql "$DATABASE_URL" -tc "SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schema_migrations'" | grep -q 1; then
    echo -e "${YELLOW}⚠️  Migration tracking table (schema_migrations) does not exist${NC}"
    echo ""
    echo "This means either:"
    echo "  1. No migrations have been applied yet"
    echo "  2. Migration 005 (migration tracking) hasn't been applied"
    echo ""
    echo "To enable migration tracking, run:"
    echo "  psql \$DATABASE_URL -f scripts/migrations/005_migration_tracking.sql"
    echo ""
    exit 0
fi

# Get applied migrations
echo -e "${BLUE}📋 Applied Migrations:${NC}"
echo ""

psql "$DATABASE_URL" -c "
    SELECT
        version,
        name,
        TO_CHAR(applied_at, 'YYYY-MM-DD HH24:MI:SS') as applied_at,
        applied_by
    FROM schema_migrations
    ORDER BY version;
" 2>&1

echo ""

# Count total migrations
TOTAL_APPLIED=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM schema_migrations;")

echo -e "${GREEN}✅ Total migrations applied: ${TOTAL_APPLIED}${NC}"
echo ""

# List available migration files
echo -e "${BLUE}📁 Available Migration Files:${NC}"
echo ""

# Find all .sql files in migrations directory (excluding rollback and deprecated)
MIGRATION_FILES=$(find scripts/migrations -maxdepth 1 -name "*.sql" ! -name "rollback_*" ! -name "*DEPRECATED*" | sort)

for file in $MIGRATION_FILES; do
    filename=$(basename "$file")
    version=$(echo "$filename" | sed -E 's/^0*([0-9]+)_.*/\1/')

    # Check if this migration has been applied
    if psql "$DATABASE_URL" -tAc "SELECT 1 FROM schema_migrations WHERE version = '$version'" | grep -q 1; then
        echo -e "  ${GREEN}✓${NC} $filename (applied)"
    else
        echo -e "  ${YELLOW}○${NC} $filename (not applied)"
    fi
done

echo ""

# Check for unapplied migrations
UNAPPLIED_COUNT=0
for file in $MIGRATION_FILES; do
    filename=$(basename "$file")
    version=$(echo "$filename" | sed -E 's/^0*([0-9]+)_.*/\1/')

    if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM schema_migrations WHERE version = '$version'" | grep -q 1; then
        ((UNAPPLIED_COUNT++))
    fi
done

if [ $UNAPPLIED_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found ${UNAPPLIED_COUNT} unapplied migration(s)${NC}"
    echo ""
    echo "To apply migrations, run:"
    echo "  psql \$DATABASE_URL -f scripts/migrations/[migration-file].sql"
else
    echo -e "${GREEN}✅ All available migrations have been applied${NC}"
fi

echo ""
