const MINOR = new Set(["a", "an", "the", "and", "or", "of", "to", "for", "in", "on", "at", "by", "per", "vs"]);

function capitaliseWord(word: string): string {
  return word.replace(/(^|[-/(])([a-z])/g, (_match, lead: string, letter: string) => lead + letter.toUpperCase());
}

export function titleCase(text: string): string {
  return text
    .split(/(\s+)/)
    .map((token, index, all) => {
      if (/^\s*$/.test(token) || token === "") return token;
      const bare = token.replace(/[^A-Za-z]/g, "");
      if (bare.length >= 2 && bare === bare.toUpperCase()) return token; // acronym
      if (/\d/.test(token) && !/^[a-z]/.test(token)) return token;
      const isFirst = all.slice(0, index).every((part) => /^\s*$/.test(part));
      if (!isFirst && MINOR.has(token.toLowerCase())) return token.toLowerCase();
      return capitaliseWord(token);
    })
    .join("");
}
