export function extractNarrators(hadithText: string): string[] {
  const regex = /\[\[([^|\]]+)\|[^\]]+\]\]/g;
  const narrators: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(hadithText)) !== null) {
    narrators.push(match[1].trim());
  }

  return narrators;
}
