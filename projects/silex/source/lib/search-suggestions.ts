export function isUsefulSearchSuggestion(value: string): boolean {
  const text = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  const compact = text.replace(/[\s\p{P}\p{S}]/gu, "");
  const letters = Array.from(compact).filter((character) => /\p{L}/u.test(character));
  const digits = Array.from(compact).filter((character) => /\p{N}/u.test(character));

  if (letters.length < 4 || digits.length > Math.floor(letters.length / 3)) return false;
  if (new Set(letters).size < 3) return false;
  if (text.split(" ").some((word) => Array.from(word).filter((character) => /\p{L}/u.test(character)).length < 2)) return false;

  for (let width = 1; width <= 2; width += 1) {
    for (let index = 0; index <= compact.length - width * 2; index += 1) {
      if (compact.slice(index, index + width) === compact.slice(index + width, index + width * 2)) return false;
    }
  }

  return true;
}
