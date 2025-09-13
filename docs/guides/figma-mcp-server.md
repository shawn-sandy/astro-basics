# Figma MCP Server Integration Guide

This comprehensive guide covers how to integrate and use the Figma MCP (Model Context Protocol) server with Claude Code for streamlined design-to-code workflows.

## Overview

The Figma MCP server enables direct integration between Figma design files and your development workflow through Claude Code. It provides automated code generation, design token extraction, and seamless design-to-development handoffs.

## Prerequisites

- Figma desktop application installed
- Active Figma project with design components
- Claude Code with MCP server support
- Access to Figma files (either as owner or with appropriate permissions)

## Core Capabilities

### 1. Code Generation

- Generate production-ready UI code from Figma components
- Support for multiple frameworks (React, Vue, HTML/CSS, etc.)
- Automatic styling extraction and conversion

### 2. Design Token Management

- Extract design variables (colors, typography, spacing)
- Convert Figma variables to CSS custom properties
- Maintain design system consistency

### 3. Code Connect Integration

- Link Figma components to existing codebase components
- Provide mapping between design and implementation
- Enable bidirectional design-code synchronization

### 4. Asset Generation

- Export high-quality images from Figma nodes
- Support for multiple formats and resolutions
- Optimized assets for web and mobile

### 5. Design System Automation

- Generate design system rules and documentation
- Create style guides automatically
- Maintain design consistency across projects

## Setup Instructions

### 1. Figma Desktop Configuration

1. **Install Figma Desktop**

   - Download from [figma.com](https://figma.com/downloads/)
   - Ensure you're using the latest version

2. **Prepare Your Figma File**

   - Open your design file in Figma Desktop
   - Ensure components are properly organized
   - Set up design variables if using advanced features

3. **Enable Dev Mode** (if available)
   - Switch to Dev Mode for enhanced developer features
   - This provides better code generation and token extraction

### 2. MCP Server Integration

The Figma MCP server should be automatically available in Claude Code environments that support MCP protocols. No additional installation is typically required.

## Usage Guide

### Working with Node IDs

Most Figma MCP operations require a `nodeId` parameter. You can obtain node IDs in several ways:

#### From Figma URLs

Extract node IDs from Figma URLs:

```
https://figma.com/design/fileKey/fileName?node-id=1-2
```

The `nodeId` would be `1:2` (replace hyphens with colons)

#### From Figma Desktop

1. Select a component/frame in Figma
2. Right-click and choose "Copy Link"
3. Extract the node ID from the URL

#### Using Selected Nodes

If you don't provide a `nodeId`, the MCP server will use the currently selected node in Figma Desktop.

### Core Functions

#### 1. Generate Code from Figma Components

**Purpose**: Convert Figma designs into production-ready code

**Usage**:

```markdown
Generate React code for the button component with node ID 123:456
```

**What it does**:

- Analyzes the selected Figma component
- Generates appropriate code (React, Vue, HTML/CSS, etc.)
- Includes styling, structure, and basic interactivity
- Adapts to your project's framework and conventions

**Best Practices**:

- Ensure components have descriptive names in Figma
- Use proper Auto Layout for responsive behavior
- Organize components with clear hierarchy
- Keep component complexity manageable for better code output

#### 2. Extract Design Variables

**Purpose**: Get design tokens and variables from Figma components

**Usage**:

```markdown
Extract design variables from the design system component
```

**What it provides**:

- Color definitions with hex/RGB values
- Typography scales and font settings
- Spacing and sizing tokens
- Component-specific variable mappings

**Example Output**:

```javascript
{
  'color/primary': '#007AFF',
  'spacing/base': '16px',
  'typography/heading/size': '24px'
}
```

#### 3. Get Code Connect Mappings

**Purpose**: Link Figma components to existing codebase components

**Usage**:

```markdown
Show me the code connections for this design system
```

**What it reveals**:

- Mapping between Figma components and code files
- Source locations in your repository
- Component names and paths
- Integration status

**Example Output**:

```javascript
{
  '1:2': {
    codeConnectSrc: 'https://github.com/org/repo/components/Button.tsx',
    codeConnectName: 'Button'
  }
}
```

#### 4. Generate Images from Figma Nodes

**Purpose**: Export high-quality images from Figma designs

**Usage**:

```markdown
Export the hero section as a PNG image
```

**What it provides**:

- High-resolution image exports
- Multiple format support (PNG, JPG, SVG)
- Optimized for web use
- Maintains design fidelity

#### 5. Create Design System Rules

**Purpose**: Generate comprehensive design system documentation

**Usage**:

```markdown
Create design system rules for this project
```

**What it generates**:

- Design token documentation
- Component usage guidelines
- Consistency rules and patterns
- Framework-specific implementations

## Workflow Examples

### Design-to-Code Workflow

1. **Select Component in Figma**

   ```markdown
   I need to implement the pricing card component from our design system
   ```

2. **Generate Code**

   - Claude will extract the node ID and generate appropriate code
   - Code will match your project's framework and conventions
   - Includes proper styling and structure

3. **Extract Variables**

   ```markdown
   Also extract the design variables used in this component
   ```

4. **Implement and Iterate**
   - Review generated code
   - Make adjustments as needed
   - Test in your development environment

### Design System Maintenance

1. **Audit Design Tokens**

   ```markdown
   Extract all design variables from our main design system file
   ```

2. **Update Code Variables**

   - Compare with existing CSS/SCSS variables
   - Update inconsistencies
   - Add new tokens as needed

3. **Generate Documentation**
   ```markdown
   Create design system rules for the updated tokens
   ```

### Component Library Sync

1. **Map Existing Components**

   ```markdown
   Show me the code connect mappings for our component library
   ```

2. **Identify Gaps**

   - Find Figma components without code implementations
   - Discover code components not represented in designs

3. **Generate Missing Components**
   ```markdown
   Generate React code for the unmapped components
   ```

## Best Practices

### Figma Organization

1. **Use Consistent Naming**

   - Clear, descriptive component names
   - Follow naming conventions
   - Use proper component hierarchy

2. **Leverage Auto Layout**

   - Enables responsive code generation
   - Better CSS flexbox/grid output
   - Improved spacing consistency

3. **Set Up Variables**

   - Define color palettes
   - Create spacing scales
   - Establish typography systems

4. **Organize Components**
   - Use proper component sets
   - Group related components
   - Maintain clean file structure

### Code Generation

1. **Specify Framework Context**

   ```markdown
   Generate React TypeScript code for this component
   ```

2. **Provide Project Context**

   - Mention existing styling systems (Tailwind, SCSS, etc.)
   - Reference component patterns in your codebase
   - Specify accessibility requirements

3. **Review and Adapt**
   - Always review generated code
   - Test in your environment
   - Adapt to project conventions

### Design Token Management

1. **Establish Token Hierarchy**

   - Use semantic naming (primary, secondary)
   - Create consistent scales
   - Document usage patterns

2. **Sync Regularly**

   - Update tokens when designs change
   - Maintain consistency across teams
   - Version control design tokens

3. **Automate Updates**
   - Use generated tokens in build process
   - Create automated sync workflows
   - Monitor for design-code drift

## Advanced Features

### Multi-Node Operations

Work with multiple components simultaneously:

```markdown
Generate code for all button variants in the component set
```

### Custom Framework Support

Specify custom frameworks or styling approaches:

```markdown
Generate Astro component code with SCSS modules for this design
```

### Design System Rules

Create comprehensive design guidelines:

```markdown
Generate design system rules that include accessibility guidelines and component usage patterns
```

## Troubleshooting

### Common Issues

#### Node ID Not Found

- **Problem**: "Node ID 123:456 not found"
- **Solution**: Verify the node exists and you have access permissions
- **Check**: Ensure Figma file is open in desktop app

#### No Component Selected

- **Problem**: "No node selected in Figma"
- **Solution**: Select a component in Figma Desktop before running commands
- **Alternative**: Provide explicit node ID

#### Code Generation Issues

- **Problem**: Generated code doesn't match expectations
- **Solution**: Provide more specific framework and context information
- **Tip**: Mention existing patterns in your codebase

#### Permission Errors

- **Problem**: Cannot access Figma file or components
- **Solution**: Ensure proper Figma file permissions
- **Check**: Verify you can edit or view the file in Figma

### Debug Tips

1. **Verify Figma Connection**

   - Ensure Figma Desktop is running
   - Check that the correct file is open
   - Verify component selection

2. **Check Node IDs**

   - Copy link from Figma to get correct node ID
   - Convert URL format (hyphens to colons)
   - Test with simple components first

3. **Framework Specification**
   - Be explicit about your development stack
   - Mention styling approaches (CSS-in-JS, Tailwind, etc.)
   - Provide context about existing components

## Integration with Astro Basics Project

### Project-Specific Workflow

Given the astro-basics project structure, here's how to effectively use the Figma MCP server:

1. **Component Generation**

   ```markdown
   Generate an Astro component for this design, using our existing SCSS architecture
   ```

2. **SCSS Integration**

   ```markdown
   Extract design tokens and create SCSS variables that integrate with our src/styles/index.scss
   ```

3. **React Component Support**
   ```markdown
   Create a React component for client-side interactivity, following our src/components/react/ patterns
   ```

### File Organization

Generated code should follow project conventions:

- **Astro components**: `src/components/astro/`
- **React components**: `src/components/react/`
- **SCSS styles**: `src/styles/components/`
- **Design tokens**: Integration with existing SCSS variables

### Testing Integration

After generating components:

```bash
npm run build          # Test build process
npm test               # Run unit tests
npm run test:e2e       # E2E testing
npm run lint:all       # Code quality checks
```

## Resources

### Documentation Links

- [Figma API Documentation](https://www.figma.com/developers/api)
- [MCP Protocol Specification](https://github.com/modelcontextprotocol/specification)
- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)

### Community Resources

- [Figma Community](https://www.figma.com/community/) (Note: May require authentication to access)
- [Design Tokens Community](https://designtokens.org/)
- [Web Component Patterns](https://component.gallery/)

### Tools and Extensions

- [Figma Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode)
- [Design Token Tools](https://github.com/lukasoppermann/design-tokens)
- [Storybook Styling Documentation](https://storybook.js.org/docs/configure/styling-and-css)

## Support and Community

### Getting Help

- Check the troubleshooting section above
- Review Figma and Claude Code documentation
- Create issues in your project repository

### Contributing

- Share successful workflow patterns
- Document project-specific configurations
- Report bugs and suggest improvements

### Best Practice Sharing

- Create templates for common use cases
- Document design-to-code standards
- Establish team workflows and guidelines

---

_This guide is part of the astro-basics project documentation. For project-specific implementation details, see the main project documentation and component examples._
