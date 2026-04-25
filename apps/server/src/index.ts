import express from 'express';
import cors from 'cors';
import { env, isMock } from './env.js';
import { createStorage } from './storage/index.js';
import { createAgent } from './agent/index.js';
import { sessionsRouter } from './routes/sessions.js';
import { chatRouter } from './routes/chat.js';
import { actionRouter } from './routes/action.js';

async function main() {
  await setupProxy();
  const storage = await createStorage();
  const agent = await createAgent();

  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      mock: isMock,
      model: env.GEMINI_MODEL,
      storage: env.STORAGE,
    });
  });

  app.use('/api', sessionsRouter(storage));
  app.use('/api', chatRouter(storage, agent));
  app.use('/api', actionRouter(storage, agent));

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[a2ui/server] unhandled', err);
    if (res.headersSent) return;
    res.status(500).json({ error: (err as Error).message ?? 'internal error' });
  });

  app.listen(env.PORT, () => {
    console.log(
      `[a2ui/server] listening on http://localhost:${env.PORT}  (mock=${isMock}, storage=${env.STORAGE})`,
    );
  });
}

async function setupProxy() {
  const proxyUrl = env.HTTPS_PROXY ?? env.HTTP_PROXY;
  if (!proxyUrl) return;
  try {
    // Node.js fetch (undici) 默认不读取 HTTP(S)_PROXY，这里显式配置全局代理。
    const undici = (await import('undici')) as typeof import('undici');
    undici.setGlobalDispatcher(new undici.ProxyAgent(proxyUrl));
    console.log(`[a2ui/server] using proxy: ${proxyUrl}`);
  } catch (e) {
    console.warn('[a2ui/server] failed to setup proxy', (e as Error).message);
  }
}

main().catch((e) => {
  console.error('[a2ui/server] fatal', e);
  process.exit(1);
});
