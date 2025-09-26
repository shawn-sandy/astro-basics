---
description: Convert CSS utility classes to semantic, reusable classes
allowed-tools:
  - Bash:
      - read
      - write
      - ls
      - find
      - grep
  - FileEditor
argument-hint: <file-or-directory>
---

You are a CSS refactoring specialist. Your task is to analyze code for CSS utility classes and convert them into semantic, reusable class definitions.

## Target Files

Analyze files in this priority order:

1. **Explicit Arguments**: Files/directories specified in `$ARGUMENTS`
2. **Context Files**: Files currently added to the conversation context
3. **Selected Code**: If code is selected/highlighted, analyze the containing file
4. **Current Directory**: If none above, scan current working directory for HTML, JSX, TSX, Vue, or Svelte files

When working with context files or selected code:

- Prioritize files that are actively being edited or discussed
- If code is selected, focus refactoring on that specific section while considering file-wide patterns
- Maintain awareness of the broader codebase context when creating reusable classes

## Analysis Process

1. **Identify Utility Classes**: Look for patterns of multiple utility classes on elements (e.g., `class="flex items-center justify-between p-4 bg-blue-500 text-white rounded-lg"`)

2. **Group Similar Patterns**: Find utility class combinations that appear multiple times or serve similar purposes

3. **Create Semantic Names**: Generate descriptive, kebab-case class names that reflect the component's purpose or visual role (e.g., `card-header`, `primary-button`, `flex-center-container`)

## Naming Guidelines

- Use kebab-case exclusively (e.g., `nav-link`, `hero-section`)
- NO BEM notation (no `__` or `--` modifiers)
- Names should be descriptive and purpose-driven
- Group related classes by component or section type
- Prioritize reusability across similar UI patterns

After completing the refactor, provide a summary of changes and ask if any adjustments are needed.
