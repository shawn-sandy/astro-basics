import { Breadcrumb } from "@fpkit/react";
import type React from "react";
import { BREADCRUMB_ROUTE } from "#utils/astrokit/config";

type AstroRoutes = Pick<React.ComponentProps<typeof Breadcrumb>, "routes">;

export const AstroBreadcrumb = ({ routes }: AstroRoutes) => {
  const breadcrumbRoute = routes?.length
    ? [...BREADCRUMB_ROUTE, ...routes]
    : BREADCRUMB_ROUTE;

  return <Breadcrumb routes={breadcrumbRoute} />;
};

export default AstroBreadcrumb;
