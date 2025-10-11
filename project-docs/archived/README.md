# Archived Documentation

This directory contains deprecated, outdated, or superseded documentation that is kept for historical reference.

## Archive Policy

Documents are moved to `archived/` when they meet one or more of these criteria:

### 1. Implementation Complete

- Feature or change has been fully implemented
- Documented elsewhere in current documentation
- No longer actively referenced

### 2. Deprecated Approach

- Technology or method has been replaced
- No longer recommended or supported
- Superseded by newer implementation

### 3. Outdated Information

- Information is no longer accurate
- Context has changed significantly
- Replaced by updated documentation

### 4. Historical Value Only

- Useful for understanding past decisions
- Provides context for codebase evolution
- May inform future work but not current practice

## When NOT to Archive

Keep documents active if:

- Currently referenced by other documentation
- Implementation is ongoing or planned
- Information is still accurate and useful
- Part of active decision-making process

## Archive Organization

```
archived/
├── README.md (this file)
├── comments/          # Old comment system implementations
└── implementation-plans/  # Completed or cancelled implementation plans
```

### Subdirectories

**comments/**

- Old comment system designs and specifications
- Previous implementation approaches that were replaced
- Historical record of comment feature evolution

**implementation-plans/**

- Completed implementation plans that are no longer active
- Cancelled or superseded approaches
- Plans that were replaced by newer strategies

## Accessing Archived Documents

Archived documents are still accessible via Git history and can be referenced when needed. They are not deleted to preserve institutional knowledge and decision-making history.

### Finding Archived Content

1. **Browse this directory** for organized archived content
2. **Use Git log** to see when and why documents were archived
3. **Search Git history** for deleted files if not found here

### Referencing Archived Documents

When referencing archived documents:

- Note the archive date
- Explain why the information is historical
- Link to current documentation if available
- Use for context, not as current guidance

## Moving Documents to Archive

### Process

1. **Verify the document should be archived** using criteria above
2. **Check for cross-references** and update them
3. **Move to appropriate subdirectory** in `archived/`
4. **Use `git mv`** to preserve history
5. **Update index files** (like main README.md)
6. **Document the reason** in commit message

### Commit Message Template

```
docs: archive [document-name]

Reason: [completed/deprecated/outdated/historical]
Replaced by: [new-document-path or "N/A"]
Last relevant: [date or version]
```

## Restoring Archived Documents

If an archived document becomes relevant again:

1. Move it back to appropriate active directory
2. Update content to reflect current state
3. Update cross-references
4. Note the restoration in commit message

## Questions?

If you're unsure whether a document should be archived:

- Ask in project discussions
- Check with documentation maintainers
- Review recent activity and references
- Consider creating a "Deprecated" section in active docs instead

---

**Archive Policy Version**: 1.0
**Last Updated**: 2025-10-10
**Maintained By**: Development Team
