# Astro Components Directory

This directory contains a collection of Astro components used throughout the website. These components provide reusable UI elements and functionality for various parts of the application.

## Overview

The purpose of this directory is to organize and modularize the Astro components, making it easier to maintain and update the codebase. By separating components into individual files, developers can easily locate, modify, and reuse them across different parts of the application.

## Key Components

### PostsList.astro

This component is responsible for rendering a list of blog posts. It retrieves
the latest posts from the content collection, filters out draft posts, sorts
them by publication date, and displays a specified number of posts with links to
their respective pages.

### PostComponent.astro

This component handles the rendering of individual blog post pages. It uses the `getStaticPaths` function to generate static paths for each post during the build process. The component also imports and renders the `BlogPosts` component for each post.

### Pagination.astro

The `Pagination.astro` component generates pagination links for a collection of
items (e.g., blog posts). It calculates the total number of pages based on the
number of items and the specified items per page. The component then renders a
list of links to navigate through the paginated content.

### Navigation.astro

This component provides the main navigation menu for the website. It includes
links to the home page, articles, blog, and about page. The component also
supports rendering additional content through the use of a slot.

### Img.astro

The `Img.astro` component is a wrapper around the `Img` component from the
`astro-imagetools` library. It allows for rendering responsive images with
specified dimensions, alt text, and captions.

### Header.astro

This component renders the header section of the website. It displays a title
and a description, which can be customized through props.

### Footer.astro

The `Footer.astro` component renders the footer section of the website. It
includes links to social media profiles and a copyright notice with the current
year.

### CollectionList.astro

This component is responsible for rendering a list of items from a specified
content collection. It filters out draft items, sorts them by publication date,
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

These components can be imported and used throughout the Astro project to provide consistent UI elements and functionality. For example, the `PostsList.astro` component can be imported and rendered on the home page to display the latest blog posts, while the `PostComponent.astro` component can be used to render individual post pages.
