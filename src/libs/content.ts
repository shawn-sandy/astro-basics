export const Slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const Truncate = (str: string, length = 15) =>
  str.length > length ? `${str.slice(0, length)}...` : str;
