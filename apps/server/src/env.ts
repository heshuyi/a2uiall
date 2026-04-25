import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  /** 可选：自定义 Gemini API Base URL（用于代理/网关）。 */
  GEMINI_BASE_URL: z.string().optional(),
  /** 可选：给 @google/genai 请求设置超时（毫秒）。 */
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  /** 可选：Node 侧 HTTP(S) 代理（如 Clash / 公司代理）。 */
  HTTP_PROXY: z.string().optional(),
  HTTPS_PROXY: z.string().optional(),
  NO_PROXY: z.string().optional(),
  STORAGE: z.enum(['memory', 'sqlite']).default('memory'),
  SQLITE_PATH: z.string().default('./.data/sessions.db'),
  CORS_ORIGIN: z.string().default('*'),
});

export const env = schema.parse(process.env);

export const isMock = !env.GEMINI_API_KEY || env.GEMINI_API_KEY.length === 0;
