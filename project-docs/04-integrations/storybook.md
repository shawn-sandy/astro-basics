# Storybook

Storybook is the workshop and living documentation for the **React** side of the
`astro-basics` component library.

- **Version:** Storybook 10 with the `@storybook/react-vite` framework
- **Config:** `.storybook/`
- **Stories:** colocated as `src/components/react/*.stories.tsx`
- **Doc pages:** `src/stories/*.mdx`

## Commands

```bash
npm run storybook         # dev server on http://localhost:6006
npm run build-storybook   # static build into storybook-static/ (gitignored)
```

## Scope: React only

Only components under `src/components/react/` are rendered in Storybook.

`.astro` components (`src/components/astro/`, `src/components/dashboard/`) are
server-rendered and have no browser runtime that Storybook can mount, so there is
no Astro renderer to point at them. Document those in the Starlight guide under
`src/content/docs/guide/components/` instead. Astro components that exist only to
hydrate a React component — `ContactForm.astro`, for example — are covered
indirectly by the story for the React component they wrap.

One React component is deliberately excluded: `astro-breadcrumb`. The underlying
`@fpkit/react` `Breadcrumb` derives its trail from `window.location.pathname` and
treats `routes` purely as a segment-to-label lookup table. Inside Storybook's
`iframe.html` that pathname is always Storybook's own, so a story would display a
misleading trail rather than the component's real output.

## Configuration

### `.storybook/main.ts`

Story discovery, addons, framework and prop-table generation.

The MDX glob is scoped to `src/stories/` on purpose. A broad `src/**/*.mdx` also
matches the Starlight content collection under `src/content/docs/`, and Storybook
fails to index it with a duplicate-docs-page error.

Prop tables are generated with `react-docgen-typescript` so the exported `Props`
types and their JSDoc comments become the documented API.

### `.storybook/vite.config.ts`

Storybook needs its own Vite config, and `main.ts` points `viteConfigPath` at it.

This is load-bearing. The repository root has a `vite.config.ts` that wraps
`getViteConfig()` from `astro/config` for Vitest. Vite's builder auto-discovers
that file, which pulls the entire Astro pipeline — adapters, Starlight,
expressive-code, MDX — into the Storybook build. The result still exits zero, but
the preview is silently broken: no `iframe.html` is emitted and no story renders.
If stories ever stop appearing, check this setting first.

The config also mirrors the `#*` subpath imports declared in `package.json`, so
stories import through the mandatory alias (`#components/react/Alert`) exactly
like the rest of the codebase.

### `.storybook/preview.ts`

Loads the same stylesheet stack as `src/layouts/Base.astro`:

1. `@fpkit/acss/styles` — the design-system base
2. `src/styles/index.scss` — project design tokens and component styles

The SCSS entry point is imported directly rather than the compiled
`src/styles/index.css`, so edits to any partial under `src/styles/` hot-reload the
canvas without a separate `npm run sass`.

Autodocs is enabled globally via `tags: ['autodocs']`, so every component gets a
generated docs page.

## Writing a story

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'

import Thing from '#components/react/Thing'

/** JSDoc here becomes the component's docs-page description. */
const meta = {
  title: 'React/Thing',
  component: Thing,
  argTypes: {
    variant: { control: 'inline-radio', options: ['a', 'b'] },
  },
  args: { variant: 'a' },
} satisfies Meta<typeof Thing>

export default meta

type Story = StoryObj<typeof meta>

/** JSDoc here becomes this story's description. */
export const Default: Story = {}
```

Conventions:

- Colocate the file next to its component: `src/components/react/Thing.stories.tsx`.
- Import through the `#` alias — never a relative path.
- Use `satisfies Meta<typeof Thing>` plus `StoryObj<typeof meta>` so `args` are
  type-checked against the component's real props.
- Title stories `React/<ComponentName>` to keep the sidebar grouped.
- Write the JSDoc as the documentation — autodocs renders it verbatim.

### `exactOptionalPropertyTypes` and story args

The project sets `exactOptionalPropertyTypes: true`, so you cannot write
`args: { someOptionalProp: undefined }` to demonstrate an omitted prop. Leave the
prop out of the story's `args` and out of `meta.args` instead, then set it only in
the stories that need it. `ContactForm.stories.tsx` shows the pattern.

## Accessibility

`@storybook/addon-a11y` runs axe against every story and reports into the
**Accessibility** panel. It is configured with `test: 'todo'`, so violations are
surfaced but do not fail a story.

This project targets WCAG 2.1 Level AA, so treat anything reported there as a
defect in the component rather than in the story.

## Known issue: alerts render invisible

`@fpkit/acss` v6 ships this rule:

```css
[role='alert']:not([data-visible='true']) {
  opacity: 0;
}
```

`src/components/react/Alert.tsx` renders `role="alert"` and never sets
`data-visible`, and the project's own `.alert` rules in
`src/styles/components/_alert.scss` lose to it on specificity. Every alert
therefore renders fully transparent — in the application as well as in Storybook,
since `src/layouts/Base.astro` loads the same two stylesheets.

The Alert stories render the markup faithfully; the blank canvas is the bug, not a
Storybook problem. Inspect the DOM to confirm the content is present. This is
pre-existing and has not been changed here.

## Troubleshooting

| Symptom                                                         | Cause                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| Build succeeds but no `iframe.html` and no stories render       | `viteConfigPath` lost — the Astro `vite.config.ts` is being loaded |
| `Unable to index … two component docs pages with the same name` | An MDX glob is matching `src/content/docs/`                        |
| `No story files found for the specified pattern`                | A glob in `main.ts` matches nothing; remove it or add the file     |
| Story renders unstyled                                          | `preview.ts` failed to import the SCSS — check `sass` is installed |
| A story renders blank but has DOM content                       | A stylesheet is hiding it; see the alert issue above               |
