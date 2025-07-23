# @your-scope/astro-components

A collection of reusable Astro components for building content-rich websites.

## Installation

```bash
npm install @your-scope/astro-components
```

## Available Components

- **AstroPages**: Create paginated content pages
- **BlogPosts**: Display blog post previews
- **Pagination**: Handle pagination for collections
- **Header**: Site header with navigation
- **Footer**: Site footer component
- **PostList**: Display lists of blog posts
- **CollectionList**: Display content collections
- **ContactForm**: Contact form component
- **Blank**: Minimal component for custom layouts

## Usage

```astro
---
import { BlogPosts, Pagination } from '@your-scope/astro-components'
---

<BlogPosts posts={yourPosts} />
<Pagination currentPage={1} totalPages={5} />
```

## Documentation

For detailed documentation of each component, please visit our [documentation site](your-docs-url).

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## License

MIT
