/**
 * Line icons for the dashboard, drawn on a 24px grid with a `currentColor`
 * stroke so they take the colour of the text they sit beside.
 *
 * Keyed by name so data (activity items, quick actions, nav items) can refer to
 * an icon without importing markup. Each value is the SVG's inner markup and is
 * rendered by `DashboardIcon.astro`; the strings are static and never built from
 * user input.
 */
export const DASHBOARD_ICONS = {
  overview:
    '<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>',
  users:
    '<circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"></path><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"></path><path d="M18 14.8c2 .7 3.2 2.5 3.5 5.2"></path>',
  profile:
    '<circle cx="12" cy="8" r="4"></circle><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"></path>',
  admin: '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"></path>',
  back: '<path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path>',
  plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
  external: '<path d="M7 17L17 7"></path><path d="M8 7h9v9"></path>',
  chevron: '<path d="M9 6l6 6-6 6"></path>',
  menu: '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"></path><path d="M13.5 6.5l4 4"></path>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path><path d="M9 13h6"></path><path d="M9 17h6"></path>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle>',
  heart:
    '<path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.6 3.8 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.2 0 5.3 3.1 4.2 6.2C19.5 15.4 12 20 12 20z"></path>',
  image:
    '<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="M21 16l-5-5-9 9"></path>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v16H5.5A1.5 1.5 0 0 0 4 20.5z"></path><path d="M4 20.5A1.5 1.5 0 0 0 5.5 22H20"></path>',
  settings:
    '<path d="M4 6h10"></path><path d="M18 6h2"></path><path d="M4 12h4"></path><path d="M12 12h8"></path><path d="M4 18h12"></path><circle cx="16" cy="6" r="2"></circle><circle cx="10" cy="12" r="2"></circle><circle cx="18" cy="18" r="2"></circle>',
} as const

/** Name of a bundled dashboard icon. */
export type DashboardIconName = keyof typeof DASHBOARD_ICONS

/**
 * True when `name` is a bundled icon. The dashboard components' `icon` props
 * predate the icon set and accept any string, so anything else (an emoji from an
 * older consumer) is rendered as text instead.
 *
 * @example
 * isDashboardIcon('file') // true
 * isDashboardIcon('📝') // false
 */
export const isDashboardIcon = (name: string): name is DashboardIconName =>
  Object.hasOwn(DASHBOARD_ICONS, name)
