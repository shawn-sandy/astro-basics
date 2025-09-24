# Database Refactoring Implementation Plan

**Project**: astro-basics Database Integration Refactoring  
**Goal**: Enable simple, safe switching between Supabase and Turso databases  
**Status**: Planning Phase  
**Last Updated**: 2025-01-24

---

## Executive Summary

This document outlines a **simple, pragmatic approach** to enable easy switching between Supabase and Turso databases through configuration changes and basic commands. The focus is on simplicity, safety, and minimal overhead.

## Current State Analysis

### Database Integration Points

- **Turso Client**: `src/libs/turso.ts` - Complete LibSQL implementation with retry logic
- **Supabase Client**: `src/libs/supabase.ts` - Basic client initialization
- **API Endpoints**: 23 files directly importing database clients
- **Components**: Dashboard components using Turso-specific types
- **Scripts**: Multiple database setup/migration scripts for Turso only
- **Environment Variables**: Separate configs for each database

### Key Challenges Identified

1. **Direct Imports**: API endpoints directly import specific database clients
2. **Type Coupling**: Components use database-specific types (e.g., `MessageRow` from Turso)
3. **Setup Complexity**: Different setup procedures and scripts for each database
4. **Configuration Scatter**: Multiple environment variables with no unified management

---

## Implementation Phases

## Phase 1: Create Simple Database Abstraction

**Status**: ⏳ Pending  
**Estimated Duration**: 1-2 days  
**Priority**: Critical

### 1.1 Minimal Abstraction Layer

- [ ] **Create `src/libs/database.ts`** - Simple unified interface
  - Auto-detect which database is configured
  - Provide consistent API for both Turso and Supabase
  - Basic error handling and connection validation
  - Lightweight wrapper around existing implementations

### 1.2 Unified Types

- [ ] **Create `src/libs/database-types.ts`**
  - `Message` type (works with both databases)
  - `DatabaseProvider` type (`'turso' | 'supabase' | 'auto'`)
  - Simple configuration interfaces

### 1.3 Provider Wrappers

- [ ] **Enhance existing files** (don't create new complex structure)
  - Update `src/libs/turso.ts` to expose consistent interface
  - Update `src/libs/supabase.ts` to match Turso operations
  - Add simple provider detection logic

---

## Phase 2: Simple Configuration Management

**Status**: ⏳ Pending  
**Estimated Duration**: 1 day  
**Priority**: High

### 2.1 Environment Detection

- [ ] **Basic Auto-Detection**
  - Check which database has valid configuration
  - Priority: Explicit choice → Supabase → Turso → Error
  - Clear error messages for missing configurations

### 2.2 Simple Database Switching

- [ ] **Configuration-Based Switching**

  - Single environment variable: `DATABASE_PROVIDER=turso|supabase|auto`
  - Application restart required (simple and safe)
  - Automatic backup creation before switch
  - Validation of new database before switching

- [ ] **Safety Features**
  - Backup current data before switching
  - Validate target database connectivity
  - Simple rollback if issues detected
  - Clear success/failure messaging

---

## Phase 3: Simple Setup Tools

**Status**: ⏳ Pending  
**Estimated Duration**: 1 day  
**Priority**: Medium

### 3.1 Basic Setup Wizard

- [ ] **Create `scripts/setup-wizard.js`**
  - Simple prompts: "Use Turso or Supabase?"
  - Help with environment variable setup
  - Basic connection testing
  - Generate `.env` with correct variables

### 3.2 Essential Database Scripts

- [ ] **Simple Management Commands:**

  ```json
  "db:wizard": "node scripts/setup-wizard.js",
  "db:switch": "node scripts/switch-database.js",
  "db:status": "node scripts/database-status.js",
  "db:backup": "node scripts/backup-database.js"
  ```

### 3.3 Basic Schema Management

- [ ] **Simple Schema Tools**
  - Ensure both databases have same schema
  - Basic data export/import utilities
  - Schema validation before switching

---

## Phase 4: Codebase Refactoring

**Status**: ⏳ Pending  
**Estimated Duration**: 2 days  
**Priority**: Critical

### 4.1 Update API Endpoints

- [ ] **Replace direct imports with unified interface**

  ```typescript
  // Before
  import { insertMessage } from '#libs/turso'

  // After
  import { getDatabase } from '#libs/database'
  const db = getDatabase()
  await db.insertMessage(data)
  ```

### 4.2 Update Components

- [ ] **Use unified types**
  - Update `MessageList.astro` to use common `Message` type
  - Update other components using database-specific types

### 4.3 Simple Testing

- [ ] **Ensure everything works with both databases**
  - Test switching between databases
  - Verify API endpoints work with both providers
  - Check that existing functionality is preserved

---

## Phase 5: Documentation

**Status**: ⏳ Pending  
**Estimated Duration**: 1 day  
**Priority**: Low

### 5.1 Simple Documentation

- [ ] **User Guide** (`docs/guides/database-switching-guide.md`)

  - How to switch databases
  - Common troubleshooting
  - Environment variable examples

- [ ] **Developer Notes**
  - Update existing documentation to mention database abstraction
  - Simple examples of using the new interface

---

## Technical Architecture

### Simple Database Interface

```typescript
// Simple abstraction - just wrap existing functionality
interface Database {
  // Message operations (what the app actually uses)
  insertMessage(data: MessageData): Promise<number>
  getMessages(options?: MessageQueryOptions): Promise<Message[]>
  getMessageById(id: number): Promise<Message | null>
  markMessageAsRead(id: number): Promise<boolean>
  archiveMessage(id: number): Promise<boolean>
}

// Simple configuration
interface DatabaseConfig {
  provider: 'turso' | 'supabase' | 'auto'
  connectionString: string
  retries: number
}
```

---

## Success Metrics

### Core Goals

- [ ] **Simple Switching**: Change database with one command + restart
- [ ] **Safe Switching**: Automatic backup before changes
- [ ] **Clear Process**: Anyone can follow switching documentation
- [ ] **No Code Changes**: Existing code works with both databases

### Technical Goals

- [ ] Zero breaking changes to existing API endpoints
- [ ] Minimal performance overhead (< 10ms)
- [ ] All existing tests continue to pass
- [ ] Clear error messages when switching fails

### User Experience Goals

- [ ] **Easy Setup**: Setup wizard works for non-developers
- [ ] **Clear Status**: Simple way to check which database is active
- [ ] **Safe Rollback**: Easy way to switch back if needed

---

## Risk Assessment & Mitigation

### Main Risks

1. **Breaking Changes**: Refactoring breaks existing functionality

   - _Mitigation_: Careful testing, backward compatibility focus
   - _Recovery_: Keep original code until new system is proven

2. **Performance Impact**: Abstraction layer slows down operations

   - _Mitigation_: Lightweight wrapper, performance testing
   - _Monitoring_: Compare before/after performance metrics

3. **Switching Problems**: Database switch fails or corrupts data
   - _Mitigation_: Always backup before switching, validate after switch
   - _Recovery_: Simple rollback process, clear error messages

### Lower Risks

1. **Configuration Confusion**: Not sure which database is active

   - _Mitigation_: Clear status command, obvious error messages

2. **Setup Complexity**: Non-developers struggle with setup
   - _Mitigation_: Simple wizard, clear documentation

---

## Next Steps

### **Simple Implementation Plan**

**Day 1-2: Basic Abstraction**

- [ ] Create `src/libs/database.ts` with simple interface
- [ ] Update existing Turso/Supabase files to work with interface
- [ ] Create unified `Message` type

**Day 3-4: Refactor Code**

- [ ] Update API endpoints to use new interface
- [ ] Update components to use unified types
- [ ] Test that everything still works

**Day 5: Setup Tools**

- [ ] Create simple setup wizard
- [ ] Create database switching script
- [ ] Write basic documentation

**Total Time: ~5 days of focused work**

---

## Progress Tracking

### Completed Tasks

- [x] Database integration analysis
- [x] Current state documentation
- [x] Simplified implementation plan creation
- [x] Plan review and optimization for simplicity

### Next: Ready to Start Implementation

- [ ] Create basic abstraction layer
- [ ] Update existing code to use abstraction
- [ ] Create simple switching tools

---

_This document will be updated as work progresses. Focus: simple, safe, practical database switching._
