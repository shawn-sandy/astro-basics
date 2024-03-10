// Code: Breadcrumb component
import React from "react";

type Crumbs = {
  path?: string | number;
  name?: string;
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
  const [breadcrumbs, setBreadcrumbs] = React.useState("/");
  React.useEffect(() => {
    const path = window.location.pathname;

    setBreadcrumbs(path);
  }, []);
  const segments = breadcrumbs.split("/").filter((segment) => segment);
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
                  {isNaN(segment) ? segment : <span>{`page ${segment}`}</span>}
                </a>
              </span>
            </li>
          ))}
      </ul>{" "}
    </nav>
  );
};

export default Breadcrumb;
