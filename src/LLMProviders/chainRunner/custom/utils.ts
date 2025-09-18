export function stripObsidianProperties(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
}
