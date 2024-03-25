import { Breadcrumb } from "@fpkit/react";
import type React from "react";
import { BREADCRUMB_ROUTE } from "#utils/config.ts";

const astroRoutes = BREADCRUMB_ROUTE;

type AstroRoutes = Pick<React.ComponentProps<typeof Breadcrumb>, "routes">;

export const AstroBreadcrumb = ({ routes }: AstroRoutes) => {
  const spacer = <>&raquo;</>;
  const breadcrumbRoute = routes?.length
    ? [...astroRoutes, ...routes]
    : astroRoutes;

  return <Breadcrumb routes={breadcrumbRoute} spacer={spacer} />;
};

export default AstroBreadcrumb;
