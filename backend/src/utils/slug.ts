export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueSlug(baseValue: string, existingSlugs: string[]) {
  const baseSlug = slugify(baseValue) || "item";
  const slugSet = new Set(existingSlugs.map((slug) => slug.toLowerCase()));

  if (!slugSet.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (slugSet.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}