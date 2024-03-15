import { Breadcrumb } from "@fpkit/react";
import type React from "react";

const astroRoutes = [
  {
    name: "Blog",
    url: "/posts/1",
    path: "posts",
  },
  {
    name: "About us",
    url: "about",
    path: "about",
  },
];

type AstroRoutes = Pick<React.ComponentProps<typeof Breadcrumb>, "routes">;

export const AstroBreadcrumb = ({ routes }: AstroRoutes) => {
  const breadcrumbRoute = routes ? [...routes, ...astroRoutes] : astroRoutes;

  return <Breadcrumb routes={breadcrumbRoute} />;
};

export default AstroBreadcrumb;
