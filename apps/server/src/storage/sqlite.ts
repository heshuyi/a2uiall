import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { Session, SessionMeta, SessionStorage, Turn } from '../types.js';

export class SqliteSessionStorage implements SessionStorage {
  private readonly db: Database.Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS turns (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        userInputJson TEXT NOT NULL,
        agentMessagesJson TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(sessionId, createdAt);
    `);
  }

  async listSessions(): Promise<SessionMeta[]> {
    return this.db
      .prepare('SELECT id, title, createdAt, updatedAt FROM sessions ORDER BY updatedAt DESC')
      .all() as SessionMeta[];
  }

  async getSession(id: string): Promise<Session | null> {
    const meta = this.db
      .prepare('SELECT id, title, createdAt, updatedAt FROM sessions WHERE id = ?')
      .get(id) as SessionMeta | undefined;
    if (!meta) return null;
    const rows = this.db
      .prepare(
        'SELECT id, sessionId, userInputJson, agentMessagesJson, createdAt FROM turns WHERE sessionId = ? ORDER BY createdAt ASC',
      )
      .all(id) as Array<{
      id: string;
      sessionId: string;
      userInputJson: string;
      agentMessagesJson: string;
      createdAt: number;
    }>;
    const turns: Turn[] = rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      userInput: JSON.parse(r.userInputJson),
      agentMessages: JSON.parse(r.agentMessagesJson),
      createdAt: r.createdAt,
    }));
    return { ...meta, turns };
  }

  async createSession(meta: SessionMeta): Promise<void> {
    this.db
      .prepare('INSERT INTO sessions (id, title, createdAt, updatedAt) VALUES (?, ?, ?, ?)')
      .run(meta.id, meta.title, meta.createdAt, meta.updatedAt);
  }

  async updateSession(id: string, patch: Partial<SessionMeta>): Promise<void> {
    const cur = this.db
      .prepare('SELECT id, title, createdAt, updatedAt FROM sessions WHERE id = ?')
      .get(id) as SessionMeta | undefined;
    if (!cur) return;
    const next = { ...cur, ...patch };
    this.db
      .prepare('UPDATE sessions SET title = ?, updatedAt = ? WHERE id = ?')
      .run(next.title, next.updatedAt, id);
  }

  async deleteSession(id: string): Promise<void> {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  async appendTurn(turn: Turn): Promise<void> {
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          'INSERT INTO turns (id, sessionId, userInputJson, agentMessagesJson, createdAt) VALUES (?, ?, ?, ?, ?)',
        )
        .run(
          turn.id,
          turn.sessionId,
          JSON.stringify(turn.userInput),
          JSON.stringify(turn.agentMessages),
          turn.createdAt,
        );
      this.db
        .prepare('UPDATE sessions SET updatedAt = ? WHERE id = ?')
        .run(Date.now(), turn.sessionId);
    });
    tx();
  }
}
