# Dynamic Role Types Implementation Plan

**Created:** 2025-11-21
**Status:** Planning
**Related Config:** `config/roles.config.ts`

---

## Executive Summary

The role system has infrastructure for dynamic role configuration via `config/roles.config.ts`, but the types are still hardcoded in multiple files. This plan updates the system to truly use the generated types, making roles fully configurable without manual code updates.

---

## Problem Statement

### Current State

- ✅ `config/roles.config.ts` - Source of truth for role definitions
- ✅ `src/types/generated-roles.ts` - Auto-generated types (working)
- ✅ `scripts/setup-roles.ts` - Generation script (working)
- ❌ `src/utils/role-types.ts` - Has **hardcoded** types that duplicate generated ones
- ❌ `src/components/react/RoleBadge.tsx` - Has **hardcoded** role config

### The Gap

The generated types exist but aren't being used! Files import from `#utils/role-types` which has hardcoded definitions instead of importing from the generated file.

**Affected Lines:**

- `src/utils/role-types.ts:24` - Hardcoded `UserRole` type
- `src/utils/role-types.ts:112` - Hardcoded `USER_ROLES` constant
- `src/utils/role-types.ts:135` - Hardcoded `ROLE_LABELS` constant
- `src/utils/role-types.ts:151` - Hardcoded `ROLE_HIERARCHY` constant
- `src/components/react/RoleBadge.tsx:15` - Hardcoded `UserRole` type
- `src/components/react/RoleBadge.tsx:35-62` - Hardcoded `ROLE_CONFIG` with colors

**Impact:**

- Changing roles in config requires manual updates to these files
- Risk of type mismatches between config and code
- Comments say "will be replaced" but code doesn't actually use generated types

---

## Solution Overview

Make `role-types.ts` and `RoleBadge.tsx` import from the generated file instead of defining types locally.

### Architecture

```
config/roles.config.ts
  ↓ (npm run setup:roles)
scripts/lib/role-generator.ts
  ↓ (generates)
src/types/generated-roles.ts
  ↓ (imports)
src/utils/role-types.ts
  ↓ (re-exports + adds OrgRole, AnyRole)
  ├→ src/components/astro/RoleGuard.astro
  ├→ src/components/react/RoleGuard.tsx
  ├→ src/components/react/RoleBadge.tsx
  ├→ src/utils/role-guard.ts
  └→ (13 other files)
```

---

## Detailed Implementation Plan

### Phase 1: Update Role Types Module

**File:** `src/utils/role-types.ts`

**Changes:**

1. Add import at top of file:

   ```typescript
   import { UserRole, USER_ROLES, ROLE_LABELS, ROLE_HIERARCHY } from '#types/generated-roles'
   ```

2. Remove hardcoded definitions:
   - Line 24: `export type UserRole = 'member' | 'admin' | 'super_admin'`
   - Line 112: `export const USER_ROLES: UserRole[] = [...]`
   - Line 135: `export const ROLE_LABELS: Record<AnyRole, string> = {...}`
   - Line 151: `export const ROLE_HIERARCHY: Record<UserRole, number> = {...}`

3. Re-export imported values:

   ```typescript
   // Re-export generated user role types
   export { UserRole, USER_ROLES, ROLE_HIERARCHY }

   // Extend ROLE_LABELS to include org roles
   export const ROLE_LABELS: Record<AnyRole, string> = {
     ...(ROLE_LABELS as Record<UserRole, string>),
     'org:admin': 'Organization Admin',
     'org:member': 'Organization Member',
   }
   ```

**Rationale:**

- Maintains backward compatibility (all imports still work)
- Single source of truth (generated-roles.ts)
- OrgRole types remain in role-types.ts (not configurable)

---

### Phase 2: Enhance Role Generator with Color Support

**File:** `scripts/lib/role-generator.ts`

**Changes:**

1. Add color generation algorithm:

   ```typescript
   function generateRoleColor(
     level: number,
     totalLevels: number
   ): {
     bgColor: string
     textColor: string
     description: string
   } {
     // Distribute colors across role hierarchy
     const percentage = (level - 1) / (totalLevels - 1)

     if (percentage < 0.4) {
       // Low privilege: Blue tones
       return {
         bgColor: '#dbeafe', // blue-100
         textColor: '#1e40af', // blue-800
         description: 'Basic user permissions',
       }
     } else if (percentage < 0.7) {
       // Mid privilege: Purple tones
       return {
         bgColor: '#e9d5ff', // purple-200
         textColor: '#6b21a8', // purple-800
         description: 'Elevated permissions',
       }
     } else {
       // High privilege: Amber tones
       return {
         bgColor: '#fef3c7', // amber-100
         textColor: '#92400e', // amber-900
         description: 'Administrative permissions',
       }
     }
   }
   ```

2. Add ROLE_COLORS export to generated template:

   ```typescript
   // Generate ROLE_COLORS constant
   const colorEntries = config.roles
     .map(r => {
       const colors = generateRoleColor(r.level, config.roles.length)
       return `  ${r.name}: {
       label: '${r.label}',
       bgColor: '${colors.bgColor}',
       textColor: '${colors.textColor}',
       description: '${colors.description}',
     }`
     })
     .join(',\n')

   const roleColorsConst = `export const ROLE_COLORS: Record<UserRole, {
     label: string
     bgColor: string
     textColor: string
     description: string
   }> = {
   ${colorEntries},
   } as const`
   ```

3. Include in generated file output

**Rationale:**

- Automatic color scheme for any number of roles
- WCAG AA compliant contrast ratios
- Visual hierarchy matches privilege hierarchy
- No manual color configuration needed

---

### Phase 3: Update RoleBadge Component

**File:** `src/components/react/RoleBadge.tsx`

**Changes:**

1. Remove hardcoded type (line 15):

   ```typescript
   // DELETE: export type UserRole = 'member' | 'admin' | 'super_admin'
   ```

2. Add import:

   ```typescript
   import type { UserRole } from '#utils/role-types'
   import { ROLE_COLORS } from '#types/generated-roles'
   ```

3. Remove hardcoded ROLE_CONFIG (lines 35-62):

   ```typescript
   // DELETE: const ROLE_CONFIG: Record<UserRole, {...}> = {...}
   ```

4. Update component to use imported config:

   ```typescript
   export function RoleBadge({ role, className = '' }: Props) {
     const config = ROLE_COLORS[role]

     // Rest of component remains the same
     const badgeStyle: CSSProperties = {
       display: 'inline-flex',
       alignItems: 'center',
       padding: '0.125rem 0.75rem',
       borderRadius: '9999px',
       fontSize: '0.75rem',
       fontWeight: '500',
       backgroundColor: config.bgColor,
       color: config.textColor,
       border: `1px solid ${config.textColor}20`,
     }

     // ... rest unchanged
   }
   ```

**Rationale:**

- No hardcoded role definitions
- Automatically supports any configured roles
- Type-safe via generated types

---

### Phase 4: Testing & Validation

**Tasks:**

1. Run type generation:

   ```bash
   npm run setup:roles
   ```

2. Verify generated output includes:
   - UserRole type
   - USER_ROLES constant
   - ROLE_HIERARCHY constant
   - ROLE_LABELS constant
   - ROLE_COLORS constant (NEW)

3. Check TypeScript compilation:

   ```bash
   npm run type-check
   ```

4. Run test suite:

   ```bash
   npm test
   ```

5. Test role guard components:
   - Verify RoleGuard.astro works
   - Verify RoleGuard.tsx works
   - Verify RoleBadge.tsx renders correctly for all roles

6. Check imports (13 files that import role-types should work unchanged)

**Test Cases:**

- [ ] Default 3-tier system still works
- [ ] Adding a 4th role (e.g., 'moderator') works end-to-end
- [ ] RoleBadge displays correct colors for each role
- [ ] Role hierarchy checks still work
- [ ] Type inference works in IDE

---

## Files Modified

### Core Changes

1. ✏️ `src/utils/role-types.ts` - Import from generated-roles
2. ✏️ `scripts/lib/role-generator.ts` - Add color generation
3. ✏️ `src/components/react/RoleBadge.tsx` - Use imported types/colors

### Generated Files (auto-updated)

4. 🤖 `src/types/generated-roles.ts` - Will include ROLE_COLORS export

### Potentially Affected

5. 🧪 `tests/scripts/role-generator.test.ts` - May need color generation tests
6. 🧪 `tests/components/RoleBadge.react.test.tsx` - May need test data updates

---

## Migration Path

### For Existing Projects

1. **No breaking changes** - All existing imports continue to work
2. **Optional regeneration** - Run `npm run setup:roles` to get colors
3. **Backward compatible** - Existing hardcoded values work until regeneration

### For New Roles

1. Edit `config/roles.config.ts`
2. Run `npm run setup:roles`
3. Types, labels, hierarchy, and colors auto-update
4. No manual code changes needed

---

## Benefits

### Developer Experience

✅ **Single Source of Truth** - All role config in one place
✅ **Type Safety** - Compile-time errors for invalid roles
✅ **Auto-Complete** - IDE suggestions for all configured roles
✅ **Less Code** - No duplicate definitions to maintain

### Maintainability

✅ **No Manual Updates** - Change config, run script, done
✅ **Consistency** - Generated code always matches config
✅ **Scalability** - Support any number of roles without code changes
✅ **Validation** - Config validation catches errors early

### User Experience

✅ **Visual Hierarchy** - Colors match privilege levels
✅ **Accessibility** - WCAG AA compliant contrast
✅ **Consistent UI** - Role badges auto-styled across app

---

## Risks & Mitigations

### Risk: Breaking existing imports

**Mitigation:** Use re-exports to maintain backward compatibility

### Risk: Color algorithm doesn't work well

**Mitigation:** Test with various role counts (3, 5, 10 roles)

### Risk: Tests fail after changes

**Mitigation:** Update test fixtures to use generated types

### Risk: Generated colors don't meet WCAG

**Mitigation:** Validate contrast ratios in generator, use proven color pairs

---

## Success Criteria

- [ ] TypeScript compilation succeeds
- [ ] All 13 files importing role-types work unchanged
- [ ] RoleBadge renders correctly for all configured roles
- [ ] Generated file includes all required exports
- [ ] Tests pass without modification (or with minimal updates)
- [ ] Adding a new role requires only config change + script run
- [ ] Documentation updated if needed

---

## Next Steps

1. **Implement Phase 1** - Update role-types.ts to import from generated file
2. **Implement Phase 2** - Enhance generator with color support
3. **Implement Phase 3** - Update RoleBadge component
4. **Test thoroughly** - Run type-check, tests, manual testing
5. **Document** - Update configurable-roles.md guide if needed

---

## Related Documentation

- Configuration Guide: `project-docs/02-guides/configurable-roles.md`
- Usage Guide: `project-docs/02-guides/role-guard-usage-guide.md`
- Original Spec: `openspec/changes/archive/2025-10-13-add-configurable-role-system/`

---

## Notes

- Color generation uses 40%/70% thresholds to distribute roles
- Org roles (`org:admin`, `org:member`) remain hardcoded (Clerk limitation)
- ROLE_LABELS in role-types.ts will merge generated + org labels
- Generator should validate WCAG contrast before writing colors
