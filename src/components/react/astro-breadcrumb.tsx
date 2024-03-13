import { Breadcrumb } from "@fpkit/react";

const routes = [
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

export const AstroBreadcrumb = () => {
  return <Breadcrumb routes={routes} />;
};

export default AstroBreadcrumb;
