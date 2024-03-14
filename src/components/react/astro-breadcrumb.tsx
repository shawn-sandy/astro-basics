import { Breadcrumb } from "@fpkit/react";

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

type Props = Pick<React.ComponentProps<typeof Breadcrumb>, "routes">;

export const AstroBreadcrumb = ({ routes }: Props) => {
  const buildRoutes = { ...astroRoutes, ...routes };
  return <Breadcrumb routes={buildRoutes} />;
};

export default AstroBreadcrumb;
