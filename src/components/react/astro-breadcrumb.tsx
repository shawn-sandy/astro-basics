// @fpkit/acss, not @fpkit/react: the older Breadcrumb renders an unkeyed fragment for the
// current page, and React logs a "unique key" error on every page this island hydrates.
import { Breadcrumb } from '@fpkit/acss'
import { useEffect, useState } from 'react'
import type React from 'react'

import { BREADCRUMB_ROUTE } from '#utils/site-config'

const astroRoutes = BREADCRUMB_ROUTE

type AstroRoutes = Pick<React.ComponentProps<typeof Breadcrumb>, 'routes'>

/**
 * Site breadcrumb. The path is read after hydration, so the server render and the first client
 * render are both empty and cannot mismatch.
 */
export const AstroBreadcrumb = ({ routes }: AstroRoutes) => {
  const [currentRoute, setCurrentRoute] = useState('')
  useEffect(() => setCurrentRoute(window.location.pathname), [])

  const spacer = <>&raquo;</>
  const breadcrumbRoute = routes?.length ? [...astroRoutes, ...routes] : astroRoutes

  return <Breadcrumb routes={breadcrumbRoute} spacer={spacer} currentRoute={currentRoute} />
}

export default AstroBreadcrumb
