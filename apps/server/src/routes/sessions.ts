import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { SessionStorage } from '../types.js';

export function sessionsRouter(storage: SessionStorage): Router {
  const r = Router();

  r.get('/sessions', async (_req, res) => {
    const list = await storage.listSessions();
    res.json({ sessions: list });
  });

  r.post('/sessions', async (req, res) => {
    const body = z
      .object({ title: z.string().min(1).max(80).optional() })
      .parse(req.body ?? {});
    const id = randomUUID();
    const now = Date.now();
    await storage.createSession({
      id,
      title: body.title ?? '新对话',
      createdAt: now,
      updatedAt: now,
    });
    res.json({ id });
  });

  r.get('/sessions/:id', async (req, res) => {
    const s = await storage.getSession(req.params.id);
    if (!s) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.json(s);
  });

  r.patch('/sessions/:id', async (req, res) => {
    const body = z.object({ title: z.string().min(1).max(80) }).parse(req.body ?? {});
    await storage.updateSession(req.params.id, { title: body.title, updatedAt: Date.now() });
    res.json({ ok: true });
  });

  r.delete('/sessions/:id', async (req, res) => {
    await storage.deleteSession(req.params.id);
    res.json({ ok: true });
  });

  return r;
}
