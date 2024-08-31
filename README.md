# Astro Starter Kit: Minimal
```sh
npm create astro@latest -- --template minimal
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://github.com/shawn-sandy/astro-basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/shawn-sandy/astro-basics)

> A minimal Astro starter kit with a blog and documentation template.

## Features

- **Astro**: A static site builder that uses modern JavaScript and TypeScript.
- **Vite**: A build tool that uses modern JavaScript and TypeScript.
- **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript.
- **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.

- **Blog and Documentation Templates**: Ready-to-use templates for creating blog posts and documentation pages.
- **Pagination**: Built-in pagination for blog posts and documentation pages.
- **Content Collections**: Utilizes Astro's content collections for organized content management.
- **Dynamic Routing**: Implements dynamic routing for blog posts, documentation, and content pages.
- **Customizable Layout**: Flexible layout component for consistent page structure.
- **Responsive Design**: Ensures proper display across various device sizes.
- **SEO Optimization**: Basic SEO setup with customizable metadata.
- **TypeScript Support**: Includes TypeScript for improved code quality and developer experience.
- **Vitest Integration**: Set up with Vitest for unit testing.
- **Customizable Configuration**: Easily adjustable site configuration for pagination and other settings.
- **Component Library**: Reusable components like BlogPosts, Pagination, and Blank for rapid development.
- **Playwright Integration**: Includes Playwright for end-to-end testing.
- **Astro Integration**: Leverages Astro's powerful features for optimal performance and developer experience.

## Getting Started

To get started with this AstroKit:

1. Clone the repository:
   ```sh
   git clone https://github.com/shawn-sandy/astro-basics.git
   cd astro-basics
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the development server:
   ```sh
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:4321` to see your site.

5. Start editing:
   - Modify pages in the `src/pages` directory
   - Add blog posts in `src/content/posts`
   - Update documentation in `src/content/docs`
   - Customize the site configuration in `src/utils/site-config.ts`

6. Build for production:
   ```sh
   npm run build
   ```

7. Preview the production build:
   ```sh
   npm run preview
   ```

For more information on using Astro, check out the [official Astro documentation](https://docs.astro.build).

## Components

Here's a list of key components and their documentation:

1. **Layout (src/layouts/Layout.astro)**
   - Main layout component for consistent page structure
   - Handles SEO metadata, global styles, and common elements

2. **BlogPosts (src/components/astro/BlogPosts.astro)**
   - Displays individual blog post previews
   - Used in blog listing pages

3. **Pagination (src/components/astro/Pagination.astro)**
   - Handles pagination for blog posts and documentation pages
   - Customizable for different collections and page sizes

4. **AstroPages (src/components/astro/AstroPages.astro)**
   - Reusable component for creating paginated content pages
   - Used in blog and documentation sections

5. **Blank (src/components/astro/Blank.astro)**
   - A minimal component for creating custom layouts or placeholders

6. **Header (src/components/astro/Header.astro)**
   - Site header component with navigation

7. **Footer (src/components/astro/Footer.astro)**
   - Site footer component

8. **PostList (src/components/astro/PostList.astro)**
   - Displays a list of blog posts
   - Used in blog listing pages
   - Customizable for different collections and page sizes
   - Uses Astro's content collections for data-driven content
9. **CollectionList (src/components/astro/CollectionList.astro)**
   - Displays a list of collections
   - Used in blog listing pages
   - Customizable for different collections and page sizes
   - Uses Astro's content collections for data-driven content
10. **ContactForm (src/components/astro/ContactForm.astro)**
   - Displays a contact form
   - Used in contact Pages
   - 

These components form the core of the Astro Starter Kit, providing a solid foundation for building content-rich websites with pagination and optimized performance.

## Pages

Here's a list of key pages and their documentation:

1. **Home (src/pages/index.astro)**
   - Main home page
   - Displays featured content and recent posts

2. **Blog (src/pages/blog/index.astro)**
   - Blog listing page
   - Displays all blog posts

3. **Blog Post (src/pages/blog/[...slug].astro)**
   - Individual blog post page
   - Displays a single blog post

4. **Documentation (src/pages/docs/index.astro)**
   - Documentation listing page
   - Displays all documentation pages

5. **Documentation Page (src/pages/docs/[...slug].astro)**
   - Individual documentation page
   - Displays a single documentation page

6. **404 (src/pages/404.astro)**
   - Custom 404 error page
   - Displays when a page is not found

These pages form the core of the Astro Starter Kit, providing a solid foundation for building content-rich websites with pagination and optimized performance.
