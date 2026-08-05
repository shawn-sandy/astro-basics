# Astro Components Directory

This directory contains a collection of Astro components used throughout the
website. These components provide reusable UI elements and functionality for
various parts of the application.

## Overview

The purpose of this directory is to organize and modularize the Astro
components, making it easier to maintain and update the codebase. By separating
components into individual files, developers can easily locate, modify, and
reuse them across different parts of the application.

## Key Components

### PostsList.astro

This component is responsible for rendering a list of blog posts. It retrieves
the latest posts from the content collection, filters out publish posts, sorts
them by publication date, and displays a specified number of posts with links to
their respective pages.

### PostComponent.astro

This component handles the rendering of individual blog post pages. It uses the
`getStaticPaths` function to generate static paths for each post during the
build process. The component also imports and renders the `BlogPosts` component
for each post.

### Pagination.astro

The `Pagination.astro` component generates pagination links for a collection of
items (e.g., blog posts). It calculates the total number of pages based on the
number of items and the specified items per page. The component then renders a
list of links to navigate through the paginated content.

### Navigation.astro

This component provides the main navigation menu for the website. It renders a
`<nav aria-label="Primary">` bar containing a brand link on the left and a
hamburger button. The five site links (Home, Articles, Blog, About, Contact)
live inside a native HTML popover panel that the button opens.

Open, close, Esc-to-close and outside-click dismissal ("light dismiss") are
provided by the browser through the `popover="auto"` and `popovertarget`
attributes. The component ships no JavaScript, so there is no open-state class
to style against — see `src/styles/components/_navigation.scss` for the
`:has(> [popover]:popover-open)` hook it uses instead.

The root `nav` also carries `data-site-nav`. Every selector in the stylesheet
and in the component's inline first-paint block is scoped to that marker, so
the styles cannot reach a consumer's own popover navigation on the same page.

**Props** (all optional):

| Prop         | Type      | Default              | Description                                                          |
| ------------ | --------- | -------------------- | -------------------------------------------------------------------- |
| `brandTitle` | `string`  | `SITE_TITLE`         | Text of the brand link on the left of the bar.                       |
| `brandHref`  | `string`  | `'/'`                | Destination of the brand link.                                       |
| `menuId`     | `string`  | `'site-nav-popover'` | id of the popover panel, wired to the button's `popovertarget`.      |
| `showBrand`  | `boolean` | `true`               | Render the brand link. Set `false` when a consumer supplies its own. |

**Slots:**

- Default slot — renders **inside** the popover panel, below the link list. This
  is a behaviour change for library consumers: content passed to the default
  slot previously sat in the bar itself. `src/layouts/Base.astro` uses it for the
  `userId`-gated dashboard and profile links, so signed-in users get the same
  decluttered bar as everyone else.
- `login` — renders in the bar and stays visible whether or not the panel is
  open. `src/layouts/Base.astro` uses it for the Clerk auth control only.

**Fallback:** a `@supports not selector(:popover-open)` block in the stylesheet
hides the hamburger button and strips the panel's positioning, so engines
without the Popover API render the links as a static inline row rather than a
permanently-open overlay.

**The popover is presentational only.** It must never be used to gate
authenticated content: markup inside `[popover]` is present in the HTML response
whether the panel is open or not. See the
[Navigation Popover guide](/guide/components/navigation-popover/) for the full
walkthrough.

### Img.astro

The `Img.astro` component is a wrapper around Astro's native `Image` component.
It allows for rendering optimized responsive images with specified dimensions,
alt text, and captions.

### Header.astro

This component renders the header section of the website. It displays a title
and a description, which can be customized through props.

### Footer.astro

The `Footer.astro` component renders the footer section of the website. It
includes links to social media profiles and a copyright notice with the current
year.

### CollectionList.astro

This component is responsible for rendering a list of items from a specified
content collection. It filters out publish items, sorts them by publication date,
and displays a specified number of items using the `BlogPosts` component.

### Breadcrumb.astro

The `Breadcrumb.astro` component renders a breadcrumb navigation trail based on
the current URL path. It imports and uses the `Breadcrumb` component from the
`@fpkit/react` library.

### BlogPosts.astro

This component is a reusable UI element for displaying individual blog post
entries. It renders the post title as a link, the post description, and a
horizontal rule separator.

## Usage

These components can be imported and used throughout the Astro project to
provide consistent UI elements and functionality. For example, the
`PostsList.astro` component can be imported and rendered on the home page to
display the latest blog posts, while the `PostComponent.astro` component can be
used to render individual post pages.
