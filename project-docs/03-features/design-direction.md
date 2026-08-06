# Design Direction

The visual direction for astro-basics: a seven-token palette, three type roles, and one structural rule that ties
colour to interactivity. These tokens are the public styling contract for projects that consume this package, so the
names and their meanings are stable and overridable.

## Overview

The direction is one idea specific to Astro rather than to websites in general: **colour marks hydration**.

Astro ships static HTML and withholds JavaScript. The palette says the same thing the framework does. Static content
renders in ink on paper, and the accent (`--island`) appears only where something is interactive - links, buttons,
focus rings, the interactive-specimen badge. Nothing decorative carries it.

That is a structural rule, not a style preference, and it is machine-checked. `e2e/homepage-design-direction.spec.ts`
walks the rendered homepage and asserts that **no non-interactive element computes to the accent colour**. Using
`--island` for a decorative border, a heading, a rule or a card surface fails that test.

Three supporting decisions are already settled:

- **One self-hosted display face.** A latin-subset, single-weight `space-grotesk-600.woff2` in `public/fonts/`, not a
  CDN and not a system stack alone. It is preloaded from `src/layouts/Base.astro` and declared with `font-display: swap`.
- **The token layer applies sitewide.** Body background and text colour are global, so there is no way to scope them.
  The homepage hero and the card tiering are homepage-only.
- **Component prop signatures stay stable.** `Card` and `FeatureCards` are package exports via `src/components/index.ts`,
  so new props are optional with defaults and new slots are additive.

Source of truth: `src/styles/_design-tokens.scss` (definitions) and `src/styles/_base.scss` (consumers).

## The Seven Direction Tokens

| Token          | Light     | Dark      | Role                                                           |
| -------------- | --------- | --------- | -------------------------------------------------------------- |
| `--ink`        | `#101418` | `#e8eaed` | Primary text; the default `color` on `body`                    |
| `--ink-soft`   | `#5a6472` | `#99a2ad` | Secondary text: decks, eyebrows, labels, captions, inline code |
| `--paper`      | `#fcfcfd` | `#0d1014` | Page background                                                |
| `--paper-sunk` | `#f1f3f5` | `#151a20` | Recessed surfaces: the header band, card backgrounds           |
| `--island`     | `#5b2cf5` | `#9b7dff` | The accent. Interactive only                                   |
| `--island-bg`  | `#f0ebff` | `#1e1830` | Accent wash behind interactive affordances and `::selection`   |
| `--rule`       | `#dde1e6` | `#262c33` | Hairlines and dividers                                         |

The light values are deliberately not Tailwind sky-500 and not indigo-600, so the palette does not read as a framework
default. Every pair clears WCAG 2.1 AA: in light, ink on paper is roughly 18:1, ink-soft on paper roughly 6.4:1, and
island on paper roughly 6.7:1; in dark, every pair is 6.1:1 or better.

Both themes are defined as SCSS mixins - `direction-light` and `direction-dark` - and applied through three scopes:

```scss
:root {
  @include direction-light;
}

@media (prefers-color-scheme: dark) {
  :root {
    @include direction-dark;
  }

  @include direction-dark-surfaces;
}

:root[data-theme='dark'] {
  @include direction-dark;
  @include direction-dark-surfaces;
}

:root[data-theme='light'] {
  @include direction-light;
}
```

The `[data-theme]` scopes carry specificity (0,2,0) against the media query's (0,1,0), so an explicit toggle wins over
the OS preference regardless of source order. Starlight already stamps that attribute on the docs routes.

`direction-dark-surfaces` is the part that matters most. Redefining `:root` variables alone is not enough: @fpkit/acss
resolves `--color-surface` from a token this project never declares and hardcodes `whitesmoke` on the header band, so
the dark scope has to reach the elements themselves.

## Which Surfaces the Aliases Paint

Two component aliases existed in `_design-tokens.scss` with zero consumers, which is why every painted surface
inherited @fpkit/acss defaults. Both now point at direction tokens and both have real painted consumers.

### `--card-background: var(--paper-sunk)`

Painted by `body [data-card]` in `src/styles/_base.scss`, and again inside `direction-dark-surfaces` for the dark
scopes. `[data-card]` is the attribute @fpkit/acss puts on its `Card` root, so the alias reaches:

- `Card.astro` everywhere it renders, including the six homepage feature cards and the hero specimen
- the promoted-tier specimens in `FeatureCards.astro`
- `Featured.astro`
- `DashboardCard` and any other composition built on the @fpkit/acss `Card`

The selector is scoped through `body` on purpose. The vendor's own `[data-card]` rule is (0,1,0); `body [data-card]` is
(0,1,1) and wins on specificity rather than on whichever stylesheet the bundler happens to emit last. It also leaves
`[data-card] > header` - the card's own header strip - alone.

### `--header-background: var(--paper-sunk)`

Painted by `body > header`, which covers the shared `Header.astro` band on every route and the `HomeHero.astro` band on
the homepage. The child combinator is load-bearing twice over: (0,0,2) beats the vendor's (0,0,1), and it cannot reach
a nested `header` inside a card.

A third header token, `--header-deck-font-size`, sizes the deck paragraph under the shared header's `h1`. It is a
fluid `clamp()` on a shallower slope than the `h1` clamp, so the two separate as the viewport grows instead of
converging.

## The Three Type Roles

One typeface used to render across every heading, paragraph, link and button, so elements differed only by size. Three
roles is the smallest set that reads as deliberate.

| Role        | Token                   | Applies to                                                        | Treatment                                  |
| ----------- | ----------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| **Display** | `--font-family-display` | `h1`, `h2`, `h3` only                                             | Space Grotesk 600, negative tracking       |
| **Body**    | `--font-family-sans`    | `body`, `p`, `li`, and everything inheriting from `body`          | System sans stack                          |
| **Mono**    | `--font-family-mono`    | `code`, `kbd`, `samp`, `[data-ui="eyebrow"]`, `[data-ui="label"]` | Uppercase, `0.12em` tracking, `--ink-soft` |

Details worth knowing:

- **Display is h1-h3 only.** `h4` through `h6` stay on the body stack. That is what keeps a single 600-weight woff2
  sufficient - no second font request downloads bytes nothing asks for.
- **Tracking is negative on display.** `-0.015em` on `h1`-`h3`, tightened to `-0.02em` on `h1`.
- **The display stack falls back through the system sans**, so a failed font request degrades to the body face rather
  than to a serif.
- **Body is declared on `body`, not `html`.** @fpkit/acss sets `font-family` on `html`, which is why one face used to
  render everywhere. Declaring the body role on `body` beats that by inheritance and leaves the headings free.
- **Mono is opt-in for non-code.** Code semantics get it by element. Everything else opts in through
  `data-ui="eyebrow"` or `data-ui="label"`, so an eyebrow is a deliberate choice at the call site rather than a
  selector guessing at class names.

Use `data-ui="eyebrow"` for the small uppercase line above a headline and `data-ui="label"` for figure and specimen
labels. Both resolve to the mono family, `--ink-soft`, `0.75rem`, `0.12em` tracking, uppercase.

## Overriding the Tokens as a Consumer

Projects that import this package get the components, and the components read these custom properties at runtime.
Nothing is compiled in, so a consumer rebrands the kit by redefining the properties - no fork, no SCSS build, no
component edits.

Two rules make an override stick:

1. **Load your sheet after the kit's stylesheet.** Every override below has the same specificity as the kit's own
   declaration, so source order decides.
2. **Override all three scopes.** The kit sets the tokens in `:root`, in `@media (prefers-color-scheme: dark) :root`,
   and in `:root[data-theme='dark']` / `:root[data-theme='light']`. Redefining only `:root` leaves the dark path on the
   kit's values.

```css
/* your-app/src/styles/brand.css - imported after the kit's index.css */

:root,
:root[data-theme='light'] {
  --ink: #12100e;
  --ink-soft: #6b6257;
  --paper: #fffdf9;
  --paper-sunk: #f5f0e6;
  --island: #b4531a;
  --island-bg: #fdeee2;
  --rule: #e4dbcb;
}

@media (prefers-color-scheme: dark) {
  :root {
    --ink: #f4efe7;
    --ink-soft: #a89a88;
    --paper: #14110d;
    --paper-sunk: #1d1913;
    --island: #ff9a5c;
    --island-bg: #2a1a10;
    --rule: #2e2820;
  }
}

:root[data-theme='dark'] {
  --ink: #f4efe7;
  --ink-soft: #a89a88;
  --paper: #14110d;
  --paper-sunk: #1d1913;
  --island: #ff9a5c;
  --island-bg: #2a1a10;
  --rule: #2e2820;
}
```

You do not need to re-declare the painted rules. `body`, `body > header`, `body [data-card]` and `::selection` all
resolve through `var()`, so redefining the variables repaints every surface that consumes them.

### Overriding type

```css
:root {
  /* Swap the display face. Keep a fallback chain - the kit's @font-face rule
     and Base.astro preload still reference the bundled Space Grotesk file. */
  --font-family-display: 'Söhne Breit', ui-sans-serif, system-ui, sans-serif;
  --font-family-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-family-mono: 'Berkeley Mono', ui-monospace, monospace;
}
```

### Overriding component aliases

The component alias layer is a second, narrower override surface. Re-point an alias when a surface should diverge from
the direction rather than follow it:

```css
:root {
  --card-background: var(--paper); /* flush cards instead of recessed */
  --header-background: transparent; /* no header band at all */
  --header-deck-font-size: clamp(1rem, 0.8vw + 0.85rem, 1.375rem);
  --card-radius: 0;
}
```

### What an override must not break

`--island` is the only token bound to a structural rule. If you re-point it, keep it on interactive surfaces only.
Applying your accent to a heading, a decorative border or a static card background reintroduces exactly the ambiguity
the direction removes, and it fails `e2e/homepage-design-direction.spec.ts` if you run this project's suite.

## Verification

Measured against the running dev server, light and dark:

| Surface                                 | Light              | Dark               |
| --------------------------------------- | ------------------ | ------------------ |
| `body` background                       | `rgb(252,252,253)` | `rgb(13,16,20)`    |
| `body` colour                           | `rgb(16,20,24)`    | `rgb(232,234,237)` |
| `body > header` (`--header-background`) | `rgb(241,243,245)` | `rgb(21,26,32)`    |
| `[data-card]` (`--card-background`)     | `rgb(241,243,245)` | `rgb(21,26,32)`    |
| Link colour (`--island`)                | `rgb(91,44,245)`   | `rgb(155,125,255)` |
| `code` colour (`--ink-soft`)            | `rgb(90,100,114)`  | `rgb(153,162,173)` |

Automated coverage:

- `e2e/homepage-design-direction.spec.ts` - three distinct font families resolve, the display-to-deck ratio clears 3.0,
  both aliases have at least one consumer, body background differs between light and dark, no non-interactive element
  carries the accent, and horizontal overflow is 0 at 320, 390, 768 and 1280
- `tests/integration/design-tokens.test.ts` - `--card-background` and `--header-background` each keep at least one
  `var()` consumer in the compiled CSS, and the dark block sets at least one painted property rather than variables alone

## Related

- `src/styles/DESIGN-TOKENS-README.md` - the wider token layer this direction extends
- `docs/prototypes/restyle-astro-kit-homepage.html` - clickable prototype of the target state, with a working
  light/dark switch
- Starlight guide: **Design Direction** at `/guide/design-direction`
