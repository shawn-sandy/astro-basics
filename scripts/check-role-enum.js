#!/usr/bin/env node

/**
 * Check Role ENUM Type Values
 * Shows what role values are allowed in the database
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

async function checkRoleEnum() {
  console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset)
  console.log(colors.cyan + 'Checking Role ENUM Type' + colors.reset)
  console.log(colors.cyan + '='.repeat(60) + colors.reset + '\n')

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log(colors.red + '❌ Missing environment variables' + colors.reset)
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Query for ENUM type information
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        SELECT
          t.typname as enum_name,
          e.enumlabel as enum_value
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'user_role'
        ORDER BY e.enumsortorder;
      `,
    })

    if (error) {
      // Fallback: check column information
      const { data: colData, error: colError } = await supabase.rpc('exec', {
        sql: `
          SELECT
            column_name,
            data_type,
            udt_name,
            column_default
          FROM information_schema.columns
          WHERE table_name = 'users'
          AND column_name = 'role';
        `,
      })

      if (colError) {
        console.log(colors.yellow + '⚠ Cannot query database directly' + colors.reset)
        console.log(colors.blue + 'Trying to insert test values...\n' + colors.reset)

        // Try inserting with different roles to see what's allowed
        const testRoles = ['member', 'volunteer', 'coordinator', 'admin', 'super_admin']
        console.log(colors.cyan + 'Testing role values:' + colors.reset)

        for (const role of testRoles) {
          const { error: testError } = await supabase
            .from('users')
            .select('role')
            .eq('role', role)
            .limit(1)

          if (testError && testError.message.includes('invalid input')) {
            console.log(`  ${colors.red}✗${colors.reset} ${role} - not allowed`)
          } else {
            console.log(`  ${colors.green}✓${colors.reset} ${role} - allowed`)
          }
        }

        return
      }

      console.log(colors.blue + 'Column info:' + colors.reset)
      console.log(colData)
      return
    }

    if (data && data.length > 0) {
      console.log(colors.green + '✓ Found user_role ENUM type' + colors.reset)
      console.log(colors.blue + '\nAllowed values:' + colors.reset)
      data.forEach((row, i) => {
        console.log(`  ${i + 1}. ${colors.yellow}${row.enum_value}${colors.reset}`)
      })
      console.log('')
    } else {
      console.log(
        colors.yellow + '⚠ No ENUM type found - role might be text/varchar\n' + colors.reset
      )
    }
  } catch (err) {
    console.log(colors.red + '\n❌ Error: ' + err.message + colors.reset + '\n')
  }
}

checkRoleEnum()
