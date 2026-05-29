// ============================================================================
// SLUG UTILITIES
// ============================================================================
// WHAT:  Turn display names into URL-safe unique slugs for categories/tags.
// WHY:   Stable identifiers for APIs and future browse URLs.
// HOW:   Lowercase, hyphenate, strip unsafe chars; caller resolves collisions.
// ============================================================================

/**
 * Build a URL-safe slug from a human-readable name.
 * Example: "Beauty & Personal Care" → "beauty-personal-care"
 */
export const slugify = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-") || "item";

/**
 * Append -2, -3, … until `candidate` is not in `existing`.
 */
export const resolveSlugCollision = (
  base: string,
  existing: Set<string>,
): string => {
  if (!existing.has(base)) {
    return base;
  }
  let index = 2;
  while (existing.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
};
