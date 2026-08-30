# Email templates

Each subdirectory is one template, named by its directory. The file must be
`index.html` or `index.mjml` (MJML requires `npm install --save-dev mjml`).

Templates are compiled at build time by the `astro-email` integration
(`src/integrations/email/`) and inlined into the server bundle, so nothing here
is read from disk at request time.

## Placeholders

Use `{{ name }}`. Values are **always** HTML-escaped, and there is no raw/unescaped
form — contact-form values reach these templates unverified, so escaping is not
optional. Arrays are joined with a comma and a space; an unknown placeholder
renders as empty.

## Previewing

`npm run dev`, then visit `/_email` for the list. The preview route exists only
under `astro dev` and is never injected into a build.

## Adding a template

1. Create `emails/<name>/index.html`.
2. Run `npx astro sync` to regenerate types — `<name>` then type-checks as an
   `EmailTemplate` at every `sendEmail()` call site.
