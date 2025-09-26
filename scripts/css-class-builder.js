#!/usr/bin/env node

/**
 * CSS Class Builder Script
 * Analyzes components with utility classes and converts them to semantic CSS
 * 
 * @fileoverview This script provides the core functionality for the /css-class-builder
 * slash command, analyzing component markup and generating semantic CSS classes.
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Utility class to design token mapping
const UTILITY_MAPPINGS = {
  // Layout & Display
  'flex': 'display: flex',
  'inline-flex': 'display: inline-flex',
  'grid': 'display: grid',
  'block': 'display: block',
  'inline-block': 'display: inline-block',
  'hidden': 'display: none',
  
  // Flex Properties
  'items-center': 'align-items: center',
  'items-start': 'align-items: flex-start',
  'items-end': 'align-items: flex-end',
  'items-stretch': 'align-items: stretch',
  'items-baseline': 'align-items: baseline',
  'justify-center': 'justify-content: center',
  'justify-start': 'justify-content: flex-start',
  'justify-end': 'justify-content: flex-end',
  'justify-between': 'justify-content: space-between',
  'justify-around': 'justify-content: space-around',
  'justify-evenly': 'justify-content: space-evenly',
  'flex-col': 'flex-direction: column',
  'flex-row': 'flex-direction: row',
  'flex-wrap': 'flex-wrap: wrap',
  'flex-nowrap': 'flex-wrap: nowrap',
  
  // Spacing (Padding)
  'p-0': 'padding: var(--space-0)',
  'p-1': 'padding: var(--space-1)',
  'p-2': 'padding: var(--space-2)',
  'p-3': 'padding: var(--space-3)',
  'p-4': 'padding: var(--space-4)',
  'p-5': 'padding: var(--space-5)',
  'p-6': 'padding: var(--space-6)',
  'p-8': 'padding: var(--space-8)',
  'px-2': 'padding-left: var(--space-2); padding-right: var(--space-2)',
  'px-3': 'padding-left: var(--space-3); padding-right: var(--space-3)',
  'px-4': 'padding-left: var(--space-4); padding-right: var(--space-4)',
  'px-6': 'padding-left: var(--space-6); padding-right: var(--space-6)',
  'py-2': 'padding-top: var(--space-2); padding-bottom: var(--space-2)',
  'py-3': 'padding-top: var(--space-3); padding-bottom: var(--space-3)',
  'py-4': 'padding-top: var(--space-4); padding-bottom: var(--space-4)',
  
  // Spacing (Margin)
  'm-0': 'margin: var(--space-0)',
  'm-2': 'margin: var(--space-2)',
  'm-4': 'margin: var(--space-4)',
  'mx-auto': 'margin-left: auto; margin-right: auto',
  'mb-4': 'margin-bottom: var(--space-4)',
  'mt-4': 'margin-top: var(--space-4)',
  
  // Gap
  'gap-2': 'gap: var(--space-2)',
  'gap-3': 'gap: var(--space-3)',
  'gap-4': 'gap: var(--space-4)',
  'gap-6': 'gap: var(--space-6)',
  
  // Colors (Background)
  'bg-white': 'background-color: var(--color-neutral-50)',
  'bg-neutral-50': 'background-color: var(--color-neutral-50)',
  'bg-neutral-100': 'background-color: var(--color-neutral-100)',
  'bg-neutral-200': 'background-color: var(--color-neutral-200)',
  'bg-primary-500': 'background-color: var(--color-primary-500)',
  'bg-primary-600': 'background-color: var(--color-primary-600)',
  'bg-success': 'background-color: var(--color-success)',
  'bg-error': 'background-color: var(--color-error)',
  'bg-warning': 'background-color: var(--color-warning)',
  
  // Colors (Text)
  'text-white': 'color: var(--color-neutral-50)',
  'text-neutral-900': 'color: var(--color-neutral-900)',
  'text-neutral-800': 'color: var(--color-neutral-800)',
  'text-neutral-700': 'color: var(--color-neutral-700)',
  'text-neutral-600': 'color: var(--color-neutral-600)',
  'text-primary-500': 'color: var(--color-primary-500)',
  'text-primary-600': 'color: var(--color-primary-600)',
  
  // Border
  'border': 'border: var(--border-width-1) solid var(--color-neutral-300)',
  'border-0': 'border: none',
  'border-neutral-200': 'border-color: var(--color-neutral-200)',
  'border-neutral-300': 'border-color: var(--color-neutral-300)',
  'border-primary-500': 'border-color: var(--color-primary-500)',
  
  // Border Radius
  'rounded': 'border-radius: var(--radius-base)',
  'rounded-sm': 'border-radius: var(--radius-sm)',
  'rounded-md': 'border-radius: var(--radius-md)',
  'rounded-lg': 'border-radius: var(--radius-lg)',
  'rounded-xl': 'border-radius: var(--radius-xl)',
  'rounded-full': 'border-radius: var(--radius-full)',
  
  // Shadow
  'shadow': 'box-shadow: var(--shadow-base)',
  'shadow-sm': 'box-shadow: var(--shadow-sm)',
  'shadow-md': 'box-shadow: var(--shadow-md)',
  'shadow-lg': 'box-shadow: var(--shadow-lg)',
  'shadow-none': 'box-shadow: var(--shadow-none)',
  
  // Typography
  'text-xs': 'font-size: var(--font-size-xs)',
  'text-sm': 'font-size: var(--font-size-sm)',
  'text-base': 'font-size: var(--font-size-base)',
  'text-lg': 'font-size: var(--font-size-lg)',
  'text-xl': 'font-size: var(--font-size-xl)',
  'text-2xl': 'font-size: var(--font-size-2xl)',
  'font-normal': 'font-weight: var(--font-weight-normal)',
  'font-medium': 'font-weight: var(--font-weight-medium)',
  'font-semibold': 'font-weight: var(--font-weight-semibold)',
  'font-bold': 'font-weight: var(--font-weight-bold)',
  'text-left': 'text-align: left',
  'text-center': 'text-align: center',
  'text-right': 'text-align: right',
  
  // Positioning
  'relative': 'position: relative',
  'absolute': 'position: absolute',
  'fixed': 'position: fixed',
  'sticky': 'position: sticky',
  
  // Width & Height
  'w-full': 'width: 100%',
  'w-auto': 'width: auto',
  'h-full': 'height: 100%',
  'h-auto': 'height: auto',
  'max-w-md': 'max-width: var(--max-width-md)',
  'max-w-lg': 'max-width: var(--max-width-lg)',
  'max-w-xl': 'max-width: var(--max-width-xl)',
  
  // Transitions
  'transition': 'transition: all var(--transition-duration-150) var(--transition-timing-in-out)',
  'transition-colors': 'transition: background-color var(--transition-duration-150) var(--transition-timing-in-out), border-color var(--transition-duration-150) var(--transition-timing-in-out), color var(--transition-duration-150) var(--transition-timing-in-out)',
  'transition-shadow': 'transition: box-shadow var(--transition-duration-150) var(--transition-timing-in-out)',
  'duration-150': 'transition-duration: var(--transition-duration-150)',
  'duration-200': 'transition-duration: var(--transition-duration-200)',
  'duration-300': 'transition-duration: var(--transition-duration-300)',
  
  // Cursor
  'cursor-pointer': 'cursor: pointer',
  'cursor-default': 'cursor: default',
  
  // Overflow
  'overflow-hidden': 'overflow: hidden',
  'overflow-auto': 'overflow: auto',
  'overflow-x-auto': 'overflow-x: auto',
  'overflow-y-auto': 'overflow-y: auto'
}

/**
 * Extracts utility classes from HTML content
 * @param {string} content - HTML content to analyze
 * @returns {Array} Array of unique utility classes found
 */
function extractUtilityClasses(content) {
  const classRegex = /class=["']([^"']+)["']/g
  const classes = new Set()
  
  let match
  while ((match = classRegex.exec(content)) !== null) {
    const classString = match[1]
    const classList = classString.split(/\s+/).filter(cls => cls.trim())
    classList.forEach(cls => {
      if (UTILITY_MAPPINGS[cls]) {
        classes.add(cls)
      }
    })
  }
  
  return Array.from(classes)
}

/**
 * Generates semantic class name based on context and patterns
 * @param {Array} utilities - Array of utility classes
 * @param {string} customName - Custom name provided by user
 * @param {string} context - Component context/purpose
 * @returns {string} Generated semantic class name
 */
function generateSemanticClassName(utilities, customName, context = '') {
  if (customName) {
    return customName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  }
  
  // Analyze utility patterns to suggest semantic names
  const hasCard = utilities.some(u => 
    ['p-4', 'p-6', 'bg-white', 'bg-neutral-50', 'shadow', 'rounded'].includes(u)
  )
  const hasButton = utilities.some(u => 
    ['px-4', 'py-2', 'bg-primary', 'cursor-pointer'].some(pattern => u.includes(pattern))
  )
  const hasPanel = utilities.some(u => 
    ['flex', 'items-center', 'justify-between'].includes(u)
  )
  
  if (hasCard) return 'content-card'
  if (hasButton) return 'action-button'
  if (hasPanel) return 'content-panel'
  
  // Fallback to generic names
  return context ? `${context}-component` : 'semantic-component'
}

/**
 * Groups utilities by category for better organization
 * @param {Array} utilities - Array of utility class names
 * @returns {Object} Grouped utilities by category
 */
function groupUtilitiesByCategory(utilities) {
  const groups = {
    layout: [],
    spacing: [],
    colors: [],
    typography: [],
    borders: [],
    effects: [],
    interactions: [],
    other: []
  }
  
  utilities.forEach(utility => {
    if (['flex', 'grid', 'block', 'inline-block', 'hidden'].includes(utility) ||
        utility.startsWith('items-') || utility.startsWith('justify-') ||
        utility.startsWith('flex-')) {
      groups.layout.push(utility)
    } else if (utility.startsWith('p-') || utility.startsWith('m-') || 
               utility.startsWith('px-') || utility.startsWith('py-') ||
               utility.startsWith('mx-') || utility.startsWith('my-') ||
               utility.startsWith('gap-')) {
      groups.spacing.push(utility)
    } else if (utility.startsWith('bg-') || utility.startsWith('text-')) {
      groups.colors.push(utility)
    } else if (utility.startsWith('text-') || utility.startsWith('font-')) {
      groups.typography.push(utility)
    } else if (utility.startsWith('border') || utility.startsWith('rounded')) {
      groups.borders.push(utility)
    } else if (utility.startsWith('shadow')) {
      groups.effects.push(utility)
    } else if (utility.startsWith('transition') || utility.startsWith('duration') ||
               utility.startsWith('cursor')) {
      groups.interactions.push(utility)
    } else {
      groups.other.push(utility)
    }
  })
  
  return groups
}

/**
 * Generates SCSS content from grouped utilities
 * @param {string} className - The semantic class name
 * @param {Object} groupedUtilities - Utilities grouped by category
 * @returns {string} Generated SCSS content
 */
function generateSCSS(className, groupedUtilities) {
  let scss = `// Generated semantic class for ${className}\n`
  scss += `// Consolidates utility classes into maintainable component styles\n\n`
  scss += `.${className} {\n`
  
  const categories = ['layout', 'spacing', 'colors', 'typography', 'borders', 'effects', 'interactions', 'other']
  
  categories.forEach(category => {
    const utilities = groupedUtilities[category]
    if (utilities.length > 0) {
      scss += `  // ${category.charAt(0).toUpperCase() + category.slice(1)} Properties\n`
      
      utilities.forEach(utility => {
        const cssDeclaration = UTILITY_MAPPINGS[utility]
        if (cssDeclaration) {
          if (cssDeclaration.includes(';')) {
            // Multiple declarations
            cssDeclaration.split(';').forEach(decl => {
              if (decl.trim()) {
                scss += `  ${decl.trim()};\n`
              }
            })
          } else {
            scss += `  ${cssDeclaration};\n`
          }
        }
      })
      scss += '\n'
    }
  })
  
  // Add common interactive states if applicable
  const hasInteractiveElements = groupedUtilities.interactions.length > 0 ||
                                 groupedUtilities.colors.some(u => u.includes('primary'))
  
  if (hasInteractiveElements) {
    scss += `  // Interactive States\n`
    scss += `  &:hover {\n`
    scss += `    // Add hover styles here\n`
    scss += `    opacity: 0.9;\n`
    scss += `  }\n\n`
    
    scss += `  &:focus {\n`
    scss += `    outline: 2px solid var(--color-primary-500);\n`
    scss += `    outline-offset: 2px;\n`
    scss += `  }\n\n`
  }
  
  scss += `}\n`
  return scss
}

/**
 * Updates the main SCSS index file to include the new component
 * @param {string} componentName - Name of the component file
 */
async function updateMainSCSS(componentName) {
  const scssPath = path.join(rootDir, 'src/styles/index.scss')
  const componentImport = `@use "./components/${componentName}";`
  
  try {
    let content = await fs.readFile(scssPath, 'utf-8')
    
    // Check if import already exists
    if (content.includes(componentImport)) {
      console.log(`Import for ${componentName} already exists in index.scss`)
      return
    }
    
    // Add import after existing component imports
    const lines = content.split('\n')
    const componentImportIndex = lines.findIndex(line => 
      line.includes('@use "./components/') && !line.includes('utility')
    )
    
    if (componentImportIndex !== -1) {
      lines.splice(componentImportIndex + 1, 0, componentImport)
    } else {
      // Add at the end if no component imports found
      lines.push(componentImport)
    }
    
    await fs.writeFile(scssPath, lines.join('\n'))
    console.log(`✅ Updated index.scss to include ${componentName}`)
  } catch (error) {
    console.error(`❌ Error updating index.scss:`, error.message)
  }
}

/**
 * Main function to process component and generate semantic CSS
 * @param {Object} options - Configuration options
 * @param {string} options.filePath - Path to component file
 * @param {string} options.className - Custom class name
 * @param {boolean} options.dryRun - Whether to perform a dry run
 */
async function processComponent(options = {}) {
  const { filePath, className, dryRun = false } = options
  
  try {
    console.log('🔍 Analyzing component for utility classes...')
    
    // Read component file
    let content = ''
    let targetFile = ''
    
    if (filePath) {
      targetFile = path.resolve(filePath)
      content = await fs.readFile(targetFile, 'utf-8')
    } else {
      // Default to current context (would need to be passed from CLI)
      throw new Error('No file specified for analysis')
    }
    
    // Extract utility classes
    const utilities = extractUtilityClasses(content)
    
    if (utilities.length === 0) {
      console.log('ℹ️  No utility classes found in component')
      return
    }
    
    console.log(`📋 Found ${utilities.length} utility classes:`)
    utilities.forEach(util => console.log(`   - ${util}`))
    
    // Generate semantic class name
    const componentContext = path.basename(targetFile, path.extname(targetFile))
    const semanticClassName = generateSemanticClassName(utilities, className, componentContext)
    
    console.log(`\n🎯 Generated semantic class name: ${semanticClassName}`)
    
    // Group utilities by category
    const groupedUtilities = groupUtilitiesByCategory(utilities)
    
    // Generate SCSS content
    const scssContent = generateSCSS(semanticClassName, groupedUtilities)
    
    console.log('\n📄 Generated SCSS:')
    console.log('━'.repeat(50))
    console.log(scssContent)
    console.log('━'.repeat(50))
    
    if (!dryRun) {
      // Write SCSS file
      const componentFileName = `_${semanticClassName}.scss`
      const componentsDir = path.join(rootDir, 'src/styles/components')
      const componentPath = path.join(componentsDir, componentFileName)
      
      await fs.writeFile(componentPath, scssContent)
      console.log(`✅ Generated ${componentPath}`)
      
      // Update main SCSS file
      await updateMainSCSS(semanticClassName)
      
      // Generate usage example
      console.log('\n💡 Usage Example:')
      console.log('Replace this utility class combination:')
      console.log(`  class="${utilities.join(' ')}"`)
      console.log('\nWith this semantic class:')
      console.log(`  class="${semanticClassName}"`)
    }
    
    return {
      semanticClassName,
      utilities,
      scssContent,
      groupedUtilities
    }
    
  } catch (error) {
    console.error('❌ Error processing component:', error.message)
    throw error
  }
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const options = {}
  
  args.forEach(arg => {
    if (arg.startsWith('--file=')) {
      options.filePath = arg.split('=')[1]
    } else if (arg.startsWith('--class-name=')) {
      options.className = arg.split('=')[1]
    } else if (arg === '--dry-run') {
      options.dryRun = true
    }
  })
  
  processComponent(options).catch(console.error)
}

export { processComponent, extractUtilityClasses, generateSemanticClassName, UTILITY_MAPPINGS }