# Configurable Role System

The astro-basics project includes a powerful setup-time role configuration system that allows you to define custom user roles for your application. This system provides compile-time type safety, zero runtime overhead, and automatic database migration generation.

## Overview

The configurable role system allows you to:

- Define custom roles at project setup time
- Maintain full TypeScript type safety across your codebase
- Automatically generate database migrations for PostgreSQL (Supabase) or SQLite (Turso)
- Enforce role hierarchy and permissions
- Keep roles consistent between TypeScript and database

## Before You Start

### What Are Roles?

Think of roles like **job titles in an organization**. Each role represents a level of access and responsibility:

- A **Member** might only read content
- A **Moderator** can also edit and approve content
- An **Admin** can manage users and settings
- A **Super Admin** has full system access

Roles help you control **who can do what** in your application automatically.

### Understanding Role Hierarchy

Roles are arranged in a **power ranking** from 1 to 10:

```
Level 5: Super Admin  ⚡ Full system access
         │
Level 4: Admin        👔 Manage users & settings
         │
Level 3: Moderator    🛡️  Edit & approve content
         │
Level 2: Author       ✍️  Create content
         │
Level 1: Member       👤 View content
```

**Key Rule**: Higher level roles can do everything lower level roles can do, PLUS more.

### Understanding Hierarchical Role Checking

The role system includes **automatic privilege escalation** through hierarchical role checking:

**How It Works:**

- When you protect content with a role requirement (e.g., "member only"), users with higher-level roles (admin, super_admin) can **automatically** access it
- This is the **default behavior** - you don't need to list every role explicitly
- Makes role checking intuitive: admins naturally have all member permissions plus more

**Example:**

```typescript
// Protect content for members
<RoleGuard allowedRoles={['member']}>
  <Dashboard />
</RoleGuard>

// Who can access?
// ✅ member (level 1) - explicitly allowed
// ✅ admin (level 2) - higher level, inherits member access
// ✅ super_admin (level 3) - highest level, inherits all access
```

**When Hierarchy is Used:**

- ✅ **User Roles**: member, admin, super_admin, and any custom user roles
- ❌ **Organization Roles**: org:admin, org:member (always use exact matching)

**Disabling Hierarchy (Exact Matching):**

If you need **exact role matching** (only the specified role can access), disable hierarchy:

```typescript
// Only members can access (admins cannot)
<RoleGuard allowedRoles={['member']} useHierarchy={false}>
  <MemberOnlyContent />
</RoleGuard>
```

**Why This Matters for Custom Roles:**

When you configure custom roles (e.g., author, editor, moderator), the hierarchy system ensures that:

1. Higher-level roles automatically get lower-level permissions
2. You don't need to list every role in every guard
3. Adding new roles in the middle of the hierarchy "just works"

**Best Practices:**

- Use hierarchical checking (default) for most content access
- Use exact matching (`useHierarchy: false`) for role-specific features
- Design your role levels to reflect real-world authority progression

### Do I Need Custom Roles?

**Use the default 3-tier system (member, admin, super_admin) if:**

- Your app has simple permissions (regular users vs administrators)
- You're just getting started
- You're not sure yet what roles you need

**Add custom roles if:**

- You have specialized user types (authors, moderators, editors)
- Different users need different capabilities
- You're building a multi-tier platform (blog, marketplace, community)

### Common Role Patterns by Application Type

Choose the pattern that matches your needs:

| Application Type    | Recommended Roles                                | Use Case                    |
| ------------------- | ------------------------------------------------ | --------------------------- |
| **Simple App**      | Member, Admin, Super Admin                       | Basic user permissions      |
| **Blog/Magazine**   | Reader, Author, Editor, Admin, Owner             | Content publishing workflow |
| **E-commerce**      | Customer, Vendor, Support, Manager, Admin, Owner | Multi-sided marketplace     |
| **Community Forum** | Member, Contributor, Moderator, Admin, Owner     | User-generated content      |
| **Educational**     | Student, Teacher, Coordinator, Admin, Superadmin | Learning management         |
| **SaaS Platform**   | Viewer, Contributor, Manager, Admin, Owner       | Team collaboration          |

### The Three Required Roles

**Every configuration MUST include these three core roles:**

1. **`member`** - Base user role (Level 1)
   - Why required: Default role for new users
   - What they can do: Basic access to your app

2. **`admin`** - Administrative role (Level 2+)
   - Why required: System administration functions
   - What they can do: Manage users and content

3. **`super_admin`** - System owner role (Highest level)
   - Why required: Database security policies
   - What they can do: Everything (no restrictions)

**⚠️ Important**: You can add other roles between or after these, but you cannot remove them.

## Pre-Configuration Checklist

Before editing the configuration file, answer these questions:

### 1. List Your User Types

**Who will use your application?**

Example for a blog:

- Regular readers (just browsing)
- Writers (creating articles)
- Editors (reviewing articles)
- Administrators (managing the site)
- Site owner (full access)

✍️ **Your turn**: List 3-7 user types for your app:

- ***
- ***
- ***
- ***

### 2. Define Permissions

**What can each type do?**

| User Type | Can View | Can Create | Can Edit | Can Delete | Can Manage Users |
| --------- | -------- | ---------- | -------- | ---------- | ---------------- |
| Reader    | ✓        | ✗          | ✗        | ✗          | ✗                |
| Author    | ✓        | ✓          | Own      | Own        | ✗                |
| Editor    | ✓        | ✓          | ✓        | ✓          | ✗                |
| Admin     | ✓        | ✓          | ✓        | ✓          | ✓                |

### 3. Rank by Power

**Order your roles from least to most powerful:**

1. (Least power) → e.g., Reader
2. → e.g., Author
3. → e.g., Editor
4. → e.g., Admin
5. (Most power) → e.g., Super Admin

### 4. Name Your Roles

**Convert your user types to role names:**

✅ **Good role names:**

- member, author, editor, admin, super_admin
- viewer, contributor, manager, owner
- student, teacher, coordinator, principal

❌ **Bad role names:**

- "Site Admin" (has spaces)
- Manager (has capital letters)
- 2nd_tier (starts with number)
- user! (has special characters)

**Rules for role names:**

- All lowercase letters
- No spaces (use underscore: content_creator)
- Start with a letter (not a number)
- Only letters, numbers, and underscores
- 2-30 characters long

## Quick Copy Templates

**Don't want to start from scratch?** Copy one of these complete configurations that matches your needs:

### Template 1: Simple (3 Roles) - Default Setup

**Best for**: Basic applications with regular users and administrators

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Member' },
    { name: 'admin', level: 2, label: 'Administrator' },
    { name: 'super_admin', level: 3, label: 'Super Administrator' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

**Who has what access:**

- 👤 **Member** (Level 1): Regular users, basic access
- 👔 **Admin** (Level 2): Can manage users and content
- ⚡ **Super Admin** (Level 3): Full system control

---

### Template 2: Blog/Magazine (5 Roles)

**Best for**: Content publishing platforms with editorial workflow

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Reader' },
    { name: 'author', level: 2, label: 'Author' },
    { name: 'editor', level: 3, label: 'Editor' },
    { name: 'admin', level: 4, label: 'Administrator' },
    { name: 'super_admin', level: 5, label: 'Owner' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

**Who has what access:**

- 👤 **Reader** (Level 1): Browse and read articles
- ✍️ **Author** (Level 2): Write and submit articles
- 📝 **Editor** (Level 3): Review, edit, and publish articles
- 👔 **Administrator** (Level 4): Manage users and site settings
- ⚡ **Owner** (Level 5): Full control including billing

---

### Template 3: E-commerce/Marketplace (6 Roles)

**Best for**: Multi-sided marketplaces with buyers and sellers

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Customer' },
    { name: 'vendor', level: 2, label: 'Vendor' },
    { name: 'support', level: 3, label: 'Support Agent' },
    { name: 'manager', level: 4, label: 'Manager' },
    { name: 'admin', level: 5, label: 'Administrator' },
    { name: 'super_admin', level: 6, label: 'Owner' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

**Who has what access:**

- 🛒 **Customer** (Level 1): Browse and purchase products
- 🏪 **Vendor** (Level 2): List and sell products
- 💬 **Support Agent** (Level 3): Help customers and vendors
- 📊 **Manager** (Level 4): Oversee operations and analytics
- 👔 **Administrator** (Level 5): Manage all users and settings
- ⚡ **Owner** (Level 6): Full platform control

---

### Template 4: Community Forum (6 Roles)

**Best for**: Discussion platforms and community sites

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Member' },
    { name: 'contributor', level: 2, label: 'Contributor' },
    { name: 'moderator', level: 3, label: 'Moderator' },
    { name: 'curator', level: 4, label: 'Curator' },
    { name: 'admin', level: 5, label: 'Administrator' },
    { name: 'super_admin', level: 6, label: 'Owner' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

**Who has what access:**

- 👤 **Member** (Level 1): Post and comment
- ⭐ **Contributor** (Level 2): Featured posts, more privileges
- 🛡️ **Moderator** (Level 3): Remove spam, ban users
- 🏆 **Curator** (Level 4): Feature content, manage categories
- 👔 **Administrator** (Level 5): Full user and content management
- ⚡ **Owner** (Level 6): Complete control

---

### Template 5: Educational Platform (5 Roles)

**Best for**: Learning management systems and online courses

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Student' },
    { name: 'teacher', level: 2, label: 'Teacher' },
    { name: 'coordinator', level: 3, label: 'Coordinator' },
    { name: 'admin', level: 4, label: 'Administrator' },
    { name: 'super_admin', level: 5, label: 'Superadmin' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

**Who has what access:**

- 🎓 **Student** (Level 1): Access courses and assignments
- 👨‍🏫 **Teacher** (Level 2): Create courses, grade assignments
- 📋 **Coordinator** (Level 3): Manage curriculum and teachers
- 👔 **Administrator** (Level 4): Manage all users and system
- ⚡ **Superadmin** (Level 5): Full system access

---

### Template 6: SaaS Platform (6 Roles)

**Best for**: Team collaboration tools and business software

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Viewer' },
    { name: 'contributor', level: 2, label: 'Contributor' },
    { name: 'editor', level: 3, label: 'Editor' },
    { name: 'manager', level: 4, label: 'Manager' },
    { name: 'admin', level: 5, label: 'Administrator' },
    { name: 'super_admin', level: 6, label: 'Owner' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

**Who has what access:**

- 👁️ **Viewer** (Level 1): Read-only access
- ✏️ **Contributor** (Level 2): Create and edit own content
- 📝 **Editor** (Level 3): Edit any content
- 📊 **Manager** (Level 4): Manage team and projects
- 👔 **Administrator** (Level 5): Manage organization settings
- ⚡ **Owner** (Level 6): Full control including billing

---

## Quick Start

**Ready to configure?** Follow these 4 steps:

### Step 1: Edit the Configuration File

**Where to find it**: `config/roles.config.ts`

**What to do**:

1. Open the file in your code editor
2. Find the `roles:` section (around line 75)
3. Either keep the default or copy a template from above
4. Modify the role names, levels, and labels

**Annotated Example** (with explanations):

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    {
      name: 'member', // ← Internal identifier (lowercase, no spaces)
      level: 1, // ← Power ranking (1 = least powerful)
      label: 'Member', // ← Display name (what users see)
    },
    {
      name: 'moderator', // ← Must be unique
      level: 2, // ← Must be unique
      label: 'Moderator', // ← Can be anything user-friendly
    },
    {
      name: 'admin', // ← REQUIRED (core role)
      level: 3,
      label: 'Administrator',
    },
    {
      name: 'super_admin', // ← REQUIRED (core role)
      level: 4,
      label: 'Super Administrator',
    },
  ],
  coreRoles: ['member', 'admin', 'super_admin'], // ← DO NOT CHANGE THIS LINE
}
```

**Understanding Each Part:**

| Field     | What It Is                       | Rules                                                                                | Example           |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------ | ----------------- |
| **name**  | Internal identifier used in code | • All lowercase<br>• No spaces (use `_`)<br>• Start with letter<br>• 2-30 characters | `content_creator` |
| **level** | Power ranking                    | • Number from 1-10<br>• Must be unique<br>• Higher = more power                      | `3`               |
| **label** | Display name shown to users      | • Any text<br>• User-friendly<br>• Can have spaces                                   | `Content Creator` |

**DO's and DON'Ts for Role Names:**

| ✅ DO             | ❌ DON'T                              |
| ----------------- | ------------------------------------- |
| `member`          | `Member` (has capitals)               |
| `content_creator` | `content creator` (has space)         |
| `editor`          | `editor!` (has special character)     |
| `level_2_user`    | `2nd_level_user` (starts with number) |
| `support_agent`   | `support-agent` (has hyphen)          |

### Step 2: Validate Your Configuration

**Before generating files**, check your configuration is correct:

```bash
npm run validate:roles
```

**What this does**:

- Checks role names follow the rules
- Verifies levels are unique
- Ensures core roles are present
- Confirms no duplicate names

**Success looks like** ✓:

```
✓ Configuration is valid!
```

**Error looks like** ✗:

```
Validation failed:
  - roles.1.name: Role name must be lowercase
```

**If you see errors**: Go back to Step 1 and fix the issues described.

### Step 3: Generate Types and Migrations

**Now run the setup command**:

```bash
npm run setup:roles
```

**What happens**:

1. **Validation**: Checks your configuration (same as Step 2)

   ```
   ✓ Configuration is valid!
   ```

2. **Shows Your Roles**: Displays what will be generated

   ```
   Current role configuration:
   • Member (core)
     - Name: member
     - Level: 1
   • Moderator
     - Name: moderator
     - Level: 2
   ...
   ```

3. **Asks Confirmation**: "Do you want to generate types and migrations?"
   - Type `Y` and press Enter to continue
   - Type `N` to cancel

4. **Generates Files**: Creates 3 files automatically

   ```
   ✓ Types generated: src/types/generated-roles.ts
   ✓ Migration 003 created
     Forward: scripts/migrations/003_user_roles.sql
     Rollback: scripts/migrations/rollback_003_user_roles.sql
   ```

**Next steps displayed**:

```
1. Review the generated files
2. Run type-check to verify: npm run type-check
3. Apply migration: npm run db:migrate -- 003_user_roles.sql
4. Commit all files to Git
```

### Step 4: Apply to Database

**Run the migration to update your database**:

```bash
npm run db:migrate
```

**What this does**:

- Updates your database to recognize the new roles
- Creates a `user_role` type with your configured roles
- Safe to run (won't delete existing data)

**Success looks like** ✓:

```
Migration 003_user_roles.sql applied successfully
```

### Step 5: Commit Your Changes

**Save everything to Git**:

```bash
git add config/roles.config.ts src/types/generated-roles.ts scripts/migrations/
git commit -m "Configure custom roles for [your app type]"
```

**You're done!** 🎉 Your application now uses your custom roles.

---

## Configuration Validation Checklist

**Use this checklist BEFORE running `npm run setup:roles`:**

### Critical (Must Pass)

- [ ] **All role names are lowercase**
  - ✓ Good: `member`, `content_creator`, `admin`
  - ✗ Bad: `Member`, `ContentCreator`, `Admin`

- [ ] **No spaces in role names**
  - ✓ Good: `content_creator`, `site_admin`
  - ✗ Bad: `content creator`, `site admin`

- [ ] **Role names start with a letter**
  - ✓ Good: `moderator`, `level2_user`
  - ✗ Bad: `2nd_moderator`, `1st_tier`

- [ ] **Only letters, numbers, and underscores**
  - ✓ Good: `support_agent`, `tier_2`
  - ✗ Bad: `support-agent`, `tier#2`, `admin!`

- [ ] **All three core roles present**
  - [ ] `member` exists
  - [ ] `admin` exists
  - [ ] `super_admin` exists

- [ ] **Each role has a unique name**
  - [ ] No duplicate names in the list

- [ ] **Each role has a unique level**
  - [ ] No two roles have the same level number

- [ ] **Levels are between 1 and 10**
  - [ ] No level is 0 or negative
  - [ ] No level is greater than 10

### Important (Recommended)

- [ ] **Levels increase with power**
  - [ ] Level 1 = least powerful
  - [ ] Highest level = most powerful

- [ ] **Levels are sequential**
  - ✓ Good: 1, 2, 3, 4, 5
  - ⚠️ OK but not ideal: 1, 3, 5, 7, 10

- [ ] **Role labels are user-friendly**
  - ✓ Good: "Content Creator", "Administrator"
  - ⚠️ OK: "content_creator", "admin"

- [ ] **You have 3-7 roles total**
  - Too few (1-2): May need more granularity
  - Just right (3-7): Good for most apps
  - Many (8-10): Make sure you need them all

### Double-Check

- [ ] **Role names match your app's terminology**
  - Blog → author, editor
  - Store → vendor, customer
  - School → teacher, student

- [ ] **Permissions make sense**
  - Can a "moderator" really have more power than an "author"?
  - Does your hierarchy match real-world expectations?

- [ ] **Core roles have correct levels**
  - `member` should usually be level 1 (lowest)
  - `super_admin` should be your highest level

---

## Common Mistakes and How to Fix Them

### Mistake 1: Using Capital Letters in Role Names

**❌ Wrong:**

```typescript
{ name: 'Member', level: 1, label: 'Member' }
{ name: 'Admin', level: 2, label: 'Administrator' }
```

**✅ Correct:**

```typescript
{ name: 'member', level: 1, label: 'Member' }
{ name: 'admin', level: 2, label: 'Administrator' }
```

**Why**: Role `name` is used internally in code and databases. It must be lowercase.
**Tip**: The `label` can have capital letters - that's what users see!

---

### Mistake 2: Spaces in Role Names

**❌ Wrong:**

```typescript
{ name: 'content creator', level: 2, label: 'Content Creator' }
{ name: 'site admin', level: 3, label: 'Site Administrator' }
```

**✅ Correct:**

```typescript
{ name: 'content_creator', level: 2, label: 'Content Creator' }
{ name: 'site_admin', level: 3, label: 'Site Administrator' }
```

**Why**: Spaces break the code. Use underscores (`_`) instead.

---

### Mistake 3: Forgetting Core Roles

**❌ Wrong:**

```typescript
roles: [
  { name: 'user', level: 1, label: 'User' }, // Missing 'member'
  { name: 'manager', level: 2, label: 'Manager' }, // Missing 'admin'
  { name: 'owner', level: 3, label: 'Owner' }, // Missing 'super_admin'
]
```

**✅ Correct:**

```typescript
roles: [
  { name: 'member', level: 1, label: 'User' }, // Required
  { name: 'manager', level: 2, label: 'Manager' }, // Custom
  { name: 'admin', level: 3, label: 'Admin' }, // Required
  { name: 'super_admin', level: 4, label: 'Owner' }, // Required
]
```

**Why**: The three core roles (`member`, `admin`, `super_admin`) are required by the system.
**Tip**: You can change their labels, but not their names!

---

### Mistake 4: Duplicate Level Numbers

**❌ Wrong:**

```typescript
{ name: 'member', level: 1, label: 'Member' }
{ name: 'author', level: 2, label: 'Author' }
{ name: 'editor', level: 2, label: 'Editor' }      // ← Same as author!
```

**✅ Correct:**

```typescript
{ name: 'member', level: 1, label: 'Member' }
{ name: 'author', level: 2, label: 'Author' }
{ name: 'editor', level: 3, label: 'Editor' }      // ← Unique level
```

**Why**: Each role needs a unique level for the permission system to work.

---

### Mistake 5: Starting Level at 0

**❌ Wrong:**

```typescript
{ name: 'member', level: 0, label: 'Member' }       // ← Can't use 0
{ name: 'admin', level: 1, label: 'Admin' }
```

**✅ Correct:**

```typescript
{ name: 'member', level: 1, label: 'Member' }       // ← Start at 1
{ name: 'admin', level: 2, label: 'Admin' }
```

**Why**: Levels must be 1-10. Zero is not allowed.

---

### Mistake 6: Using Hyphens Instead of Underscores

**❌ Wrong:**

```typescript
{ name: 'content-creator', level: 2, label: 'Content Creator' }
{ name: 'site-admin', level: 3, label: 'Site Admin' }
```

**✅ Correct:**

```typescript
{ name: 'content_creator', level: 2, label: 'Content Creator' }
{ name: 'site_admin', level: 3, label: 'Site Admin' }
```

**Why**: Hyphens (`-`) are not allowed. Only underscores (`_`) work.

---

### Mistake 7: Starting Role Name with a Number

**❌ Wrong:**

```typescript
{ name: '2nd_tier', level: 2, label: 'Second Tier' }
{ name: '1st_admin', level: 3, label: 'First Admin' }
```

**✅ Correct:**

```typescript
{ name: 'tier_2', level: 2, label: 'Second Tier' }
{ name: 'admin_1', level: 3, label: 'First Admin' }
```

**Why**: Role names must start with a letter.

---

### Mistake 8: Levels Not in Power Order

**❌ Confusing:**

```typescript
{ name: 'member', level: 5, label: 'Member' }       // Why is member level 5?
{ name: 'admin', level: 1, label: 'Admin' }         // Why is admin level 1?
```

**✅ Clear:**

```typescript
{ name: 'member', level: 1, label: 'Member' }       // Least powerful = level 1
{ name: 'admin', level: 5, label: 'Admin' }         // Most powerful = higher level
```

**Why**: Higher levels = more permissions. Keep it logical!

---

### Mistake 9: Modifying the coreRoles Line

**❌ Wrong:**

```typescript
coreRoles: ['member', 'manager', 'owner'],  // Changed admin and super_admin!
```

**✅ Correct:**

```typescript
coreRoles: ['member', 'admin', 'super_admin'],  // Never change this
```

**Why**: This line tells the system which roles are required. Don't modify it!

---

### Mistake 10: Too Many Roles

**⚠️ Consider:**

```typescript
// Do you really need all 10 of these?
roles: [
  { name: 'member', level: 1, label: 'Member' },
  { name: 'bronze', level: 2, label: 'Bronze' },
  { name: 'silver', level: 3, label: 'Silver' },
  { name: 'gold', level: 4, label: 'Gold' },
  { name: 'platinum', level: 5, label: 'Platinum' },
  { name: 'moderator', level: 6, label: 'Moderator' },
  { name: 'editor', level: 7, label: 'Editor' },
  { name: 'manager', level: 8, label: 'Manager' },
  { name: 'admin', level: 9, label: 'Admin' },
  { name: 'super_admin', level: 10, label: 'Super Admin' },
]
```

**✅ Better:**

```typescript
// Simplified to what you actually need
roles: [
  { name: 'member', level: 1, label: 'Member' },
  { name: 'premium', level: 2, label: 'Premium Member' }, // Combined tiers
  { name: 'moderator', level: 3, label: 'Moderator' },
  { name: 'admin', level: 4, label: 'Admin' },
  { name: 'super_admin', level: 5, label: 'Super Admin' },
]
```

**Why**: Start simple! You can always add more roles later.
**Tip**: 3-7 roles work well for most applications.

---

## Configuration Options

### Role Definition

Each role must have three properties:

```typescript
interface RoleDefinition {
  name: string // Unique identifier (lowercase, alphanumeric + underscores)
  level: number // Hierarchy level (1-10, higher = more privileges)
  label: string // Human-readable display name
}
```

### Role Name Requirements

- Must be lowercase
- Must start with a letter
- Can contain letters, numbers, and underscores only
- Must be 2-30 characters long
- Cannot be a SQL or TypeScript reserved keyword

### Core Roles

Three roles are **required** and cannot be removed:

- `member` - Base user role
- `admin` - Administrative access
- `super_admin` - System administration

These roles are required for Row Level Security (RLS) policies and system stability.

### Hierarchy Levels

- Must be integers between 1 and 10
- Must be unique across all roles
- Higher levels have more privileges
- Used for hierarchical role checking

## Common Role Patterns

### Blog Platform

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Member' },
    { name: 'author', level: 2, label: 'Author' },
    { name: 'editor', level: 3, label: 'Editor' },
    { name: 'admin', level: 4, label: 'Administrator' },
    { name: 'super_admin', level: 5, label: 'Super Administrator' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

### SaaS Platform

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Member' },
    { name: 'viewer', level: 2, label: 'Viewer' },
    { name: 'contributor', level: 3, label: 'Contributor' },
    { name: 'manager', level: 4, label: 'Manager' },
    { name: 'admin', level: 5, label: 'Administrator' },
    { name: 'super_admin', level: 6, label: 'Super Administrator' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

### Forum Platform

```typescript
export const roleConfig: RoleConfig = {
  roles: [
    { name: 'member', level: 1, label: 'Member' },
    { name: 'moderator', level: 2, label: 'Moderator' },
    { name: 'curator', level: 3, label: 'Curator' },
    { name: 'volunteer', level: 4, label: 'Volunteer' },
    { name: 'admin', level: 5, label: 'Administrator' },
    { name: 'super_admin', level: 6, label: 'Super Administrator' },
  ],
  coreRoles: ['member', 'admin', 'super_admin'],
}
```

## Generated Files

### TypeScript Types

`src/types/generated-roles.ts` exports:

```typescript
// Union type of all role names
export type UserRole = 'member' | 'admin' | 'super_admin'

// Array of all valid roles
export const USER_ROLES: UserRole[] = ['member', 'admin', 'super_admin']

// Hierarchy levels for each role
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 1,
  admin: 2,
  super_admin: 3,
}

// Human-readable labels
export const ROLE_LABELS: Record<UserRole, string> = {
  member: 'Member',
  admin: 'Administrator',
  super_admin: 'Super Administrator',
}
```

### Database Migrations

PostgreSQL migration (`scripts/migrations/00X_user_roles.sql`):

- Creates `user_role` ENUM type
- Idempotent (safe to re-run)
- Includes verification queries
- Wrapped in transaction

Rollback migration (`scripts/migrations/rollback_00X_user_roles.sql`):

- Drops `user_role` ENUM type
- Includes safety warnings

## Usage in Code

### Type-Safe Role Checks

```typescript
import type { UserRole } from '#utils/role-types'
import { ROLE_HIERARCHY } from '#types/generated-roles'

function canEditPost(userRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.admin
}
```

### UI Display

```typescript
import { ROLE_LABELS } from '#types/generated-roles'

function UserRoleBadge({ role }: { role: UserRole }) {
  return <span className="badge">{ROLE_LABELS[role]}</span>
}
```

### Validation

```typescript
import { USER_ROLES } from '#types/generated-roles'

function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole)
}
```

## Updating Roles

### Adding a New Role

1. Edit `config/roles.config.ts` and add the role
2. Run `npm run setup:roles` to regenerate types
3. Run `npm run db:migrate` to update database
4. Commit all generated files

### Removing a Role

**WARNING**: Removing a role requires careful consideration!

1. Ensure no users have the role you're removing
2. Migrate existing users to a different role
3. Edit `config/roles.config.ts` to remove the role
4. Run `npm run setup:roles`
5. Apply migration carefully

### Modifying Role Levels

1. Edit `config/roles.config.ts` and change levels
2. Run `npm run setup:roles`
3. Test role-guard logic thoroughly
4. Commit changes

## Troubleshooting

### "Configuration validation failed"

Check error messages for specific issues:

- Role names must be lowercase alphanumeric with underscores
- Levels must be unique integers between 1-10
- All three core roles must be present
- No duplicate role names

### "Migration already exists"

The setup script auto-increments migration numbers. If you see conflicts:

1. Check `scripts/migrations/` for existing migrations
2. Delete generated migration if needed
3. Re-run `npm run setup:roles`

### "Type errors after regeneration"

1. Run `npm run type-check` to see specific errors
2. Ensure all imports use the new role names
3. Update role-guard configurations
4. Clear TypeScript cache: `rm -rf .astro`

### "Database migration failed"

1. Check database connection
2. Verify you have migration permissions
3. Check if ENUM already exists with different values
4. Review migration SQL for conflicts

## CLI Commands

```bash
# Generate types and migrations (interactive)
npm run setup:roles

# Dry run (preview changes without writing files)
npm run setup:roles:dry-run

# Validate configuration only
npm run validate:roles

# Apply database migration
npm run db:migrate

# Check migration status
npm run db:migrate:status
```

## Best Practices

1. **Always use setup:roles after modifying config** - Don't manually edit generated files
2. **Commit generated files to Git** - Ensures consistency across team
3. **Review migrations before applying** - Check SQL for correctness
4. **Test role-guard logic after changes** - Run unit tests
5. **Document custom roles** - Add comments explaining role purposes

## Performance

The configurable role system has:

- **Setup time**: ~5-10 seconds (one-time)
- **Type generation**: <1 second
- **Migration generation**: <1 second
- **Runtime overhead**: **0ms** (roles are static after setup)

## Security Considerations

- Core roles (`member`, `admin`, `super_admin`) are protected
- Configuration is validated before generation
- Database-level validation with PostgreSQL ENUMs
- Git-tracked configuration provides audit trail
- Hierarchy levels enforce privilege escalation rules

## Limitations

- Roles are configured at setup time, not runtime
- Requires redeployment to change roles
- PostgreSQL ENUMs can only be extended, not modified
- Not suitable for per-organization custom roles

For runtime custom roles, see the alternative `custom-role-system` proposal.

## See Also

- [Role Configuration Reference](role-configuration-reference.md)
- [Role-Guard System](../../src/utils/role-types.ts)
- [Database Migrations](../database/migrations.md)
