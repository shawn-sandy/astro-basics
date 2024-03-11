// Code: Breadcrumb component
import React from "react";

type Crumbs = {
  path?: string | number;
  name?: string;
  url?: string;
};
type BreadcrumbProps = {
  routes?: Crumbs[];
  startRoute?: React.ReactNode;
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  startRoute = "Home",
  routes,
  ...props
}) => {
  const [currentPath, setCurrentPath] = React.useState("");
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path.length) {
      setCurrentPath(path);
    }
  }, []);

  const getPathName = (pathSegment: string | number) => {
    const route = routes?.find((route) => route.path === pathSegment);
    return route ? route.name : pathSegment;
  };

  const segments = currentPath.split("/").filter((segment) => segment);
  if (currentPath.length) {
    return (
      <nav aria-label="Breadcrumb" {...props}>
        <ul data-list="">
          <li>
            <a href="/">{startRoute}</a>
          </li>
          {segments.length &&
            segments.map((segment: any, index) => (
              <li key={index}>
                <span>
                  <a href={`/${segments.slice(0, index + 1).join("/")}`}>
                    {isNaN(segment) ? (
                      getPathName(segment)
                    ) : (
                      <span>{`Page ${segment}`}</span>
                    )}
                  </a>
                </span>
              </li>
            ))}
        </ul>{" "}
      </nav>
    );
  } else {
    return null;
  }
};

export default Breadcrumb;
