// Slugify matching the Python asset pipeline (NFKD -> strip diacritics ->
// lowercase -> non-alphanumeric runs to single hyphen -> trim hyphens).
// Kept identical to tools so actor names map to the fetched photo filenames.
export function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '') // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
