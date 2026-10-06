/** Configuration presence only; does not contact or select a different model provider. */
export function modelConfigurationReady(env: Record<string, string | undefined>): boolean {
  const key = env.DEEPSEEK_API_KEY?.trim();
  if (!key || key === 'your_api_key_here' || key === 'default_key') return false;
  try {
    const url = new URL(env.DEEPSEEK_API_BASE_URL ?? '');
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}
