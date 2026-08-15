import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 保护付费 API(analyze / pdf-to-deepseek)不被任意访客刷爆。
 *
 * 两层防护:
 * 1. 速率限制 —— 按 IP 在固定时间窗口内限制请求数(内存实现,多实例下为尽力而为)。
 * 2. API Key —— 生产环境强制校验 `x-api-key` 头是否等于环境变量 `LEARN_API_KEY`;
 *    开发环境不校验,方便本地调试。
 *
 * 返回 true 表示放行;返回 false 表示已写入拒绝响应,调用方应立即 return。
 */
const WINDOW_MS = 60_000; // 1 分钟窗口
const MAX_REQUESTS = 10; // 每个 IP 每分钟最多 10 次

const hits = new Map<string, { count: number; resetAt: number }>();

export function apiGuard(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { max?: number; windowMs?: number } = {}
): boolean {
  const max = options.max ?? MAX_REQUESTS;
  const windowMs = options.windowMs ?? WINDOW_MS;

  // 1) 速率限制
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
  } else {
    rec.count += 1;
    if (rec.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((rec.resetAt - now) / 1000)));
      res.status(429).json({ success: false, error: '请求过于频繁,请稍后再试' });
      return false;
    }
  }

  // 2) 生产环境强制 API Key
  const key = process.env.LEARN_API_KEY;
  if (process.env.NODE_ENV === 'production') {
    if (!key) {
      res.status(503).json({ success: false, error: '服务端未配置 LEARN_API_KEY,请先设置环境变量' });
      return false;
    }
    if (req.headers['x-api-key'] !== key) {
      res.status(401).json({ success: false, error: '缺少或无效的 API Key' });
      return false;
    }
  }

  return true;
}
