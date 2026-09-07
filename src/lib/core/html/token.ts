let counter = 0

export function uniqueToken(prefix: string, haystack: string): string {
  for (;;) {
    counter += 1
    const token = `ADT${prefix}${counter.toString(36)}ZADT`
    if (!haystack.includes(token)) return token
  }
}
