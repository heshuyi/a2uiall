import { env } from '../env.js';
import type { SessionStorage } from '../types.js';
import { MemorySessionStorage } from './memory.js';

export async function createStorage(): Promise<SessionStorage> {
  if (env.STORAGE === 'sqlite') {
    const { SqliteSessionStorage } = await import('./sqlite.js');
    return new SqliteSessionStorage(env.SQLITE_PATH);
  }
  return new MemorySessionStorage();
}
