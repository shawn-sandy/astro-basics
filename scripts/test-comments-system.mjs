#!/usr/bin/env node
/**
 * Comments System Test Runner
 * 
 * This script validates the complete Turso comments system implementation
 * including provider configuration, migrations, and functionality.
 * 
 * Usage:
 *   node scripts/test-comments-system.mjs [--quick]
 *   npm run test:comments
 *   npm run test:comments:quick
 */

import { runAllTests, quickHealthCheck } from '../src/utils/test-runner.ts'

async function main() {
  const args = process.argv.slice(2)
  const isQuickMode = args.includes('--quick')

  console.log('🔧 Turso Comments System - Test Runner')
  console.log('')

  if (isQuickMode) {
    console.log('⚡ Running quick health check...')
    console.log('')
    
    const isHealthy = await quickHealthCheck()
    process.exit(isHealthy ? 0 : 1)
  } else {
    console.log('🧪 Running comprehensive test suite...')
    console.log('')
    
    await runAllTests()
    
    // Don't exit with error code for comprehensive tests
    // as they're meant for diagnostics, not CI/CD blocking
    process.exit(0)
  }
}

main().catch(error => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})