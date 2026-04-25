import type { Session, SessionMeta, SessionStorage, Turn } from '../types.js';

export class MemorySessionStorage implements SessionStorage {
  private readonly sessions = new Map<string, Session>();

  async listSessions(): Promise<SessionMeta[]> {
    return Array.from(this.sessions.values())
      .map(({ turns, ...meta }) => {
        void turns;
        return meta;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getSession(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }

  async createSession(meta: SessionMeta): Promise<void> {
    this.sessions.set(meta.id, { ...meta, turns: [] });
  }

  async updateSession(id: string, patch: Partial<SessionMeta>): Promise<void> {
    const cur = this.sessions.get(id);
    if (!cur) return;
    this.sessions.set(id, { ...cur, ...patch });
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async appendTurn(turn: Turn): Promise<void> {
    const cur = this.sessions.get(turn.sessionId);
    if (!cur) throw new Error(`session not found: ${turn.sessionId}`);
    cur.turns.push(turn);
    cur.updatedAt = Date.now();
  }
}
