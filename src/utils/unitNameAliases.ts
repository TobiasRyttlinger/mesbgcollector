export function canonicalizeUnitName(name: string): string {
  const normalized = name.toLowerCase().replace(/\s+/g, ' ').trim();

  const fullNameAliases: Record<string, string> = {
    'samwise gamgee': 'sam gamgee',
    'aragorn, strider': 'aragorn',
    'boromir': 'boromir of gondor'
  };

  return fullNameAliases[normalized] ?? normalized;
}

export function canonicalizeNameToken(token: string): string {
  const tokenAliases: Record<string, string> = {
    samwise: 'sam', aragorn: 'aragorn', boromir: 'boromir',
  };

  return tokenAliases[token] ?? token;
}
