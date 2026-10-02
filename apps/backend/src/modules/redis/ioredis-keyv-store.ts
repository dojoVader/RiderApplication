import { EventEmitter } from 'node:events';
import type Redis from 'ioredis';
import type { KeyvStoreAdapter, StoredData } from 'keyv';

/**
 * Keyv store backed by an existing ioredis client, so the cache manager uses
 * RedisService's shared connection. (@keyv/redis would open its own
 * node-redis connection.)
 *
 * The shared client never gives up on a command (BullMQ needs
 * maxRetriesPerRequest: null), so every call here is time-boxed: if Redis is
 * down the cache misses instead of hanging the request.
 */
export class IoRedisKeyvStore extends EventEmitter implements KeyvStoreAdapter {
  opts: { timeoutMs: number };
  namespace?: string;

  constructor(
    private readonly client: Redis,
    { timeoutMs = 500 }: { timeoutMs?: number } = {},
  ) {
    super();
    this.opts = { timeoutMs };
  }

  async get<Value>(key: string): Promise<StoredData<Value> | undefined> {
    const value = await this.run(() => this.client.get(key), null);
    return (value ?? undefined) as StoredData<Value> | undefined;
  }

  async getMany<Value>(
    keys: string[],
  ): Promise<Array<StoredData<Value | undefined>>> {
    if (keys.length === 0) return [];
    const values = await this.run(
      () => this.client.mget(...keys),
      keys.map(() => null),
    );
    return values.map((v) => (v ?? undefined) as StoredData<Value | undefined>);
  }

  // Keyv passes the TTL in milliseconds.
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    const result = await this.run(
      () =>
        ttl && ttl > 0
          ? this.client.set(key, value, 'PX', ttl)
          : this.client.set(key, value),
      null,
    );
    return result === 'OK';
  }

  async delete(key: string): Promise<boolean> {
    return (await this.run(() => this.client.del(key), 0)) > 0;
  }

  async deleteMany(keys: string[]): Promise<boolean> {
    if (keys.length === 0) return false;
    return (await this.run(() => this.client.del(...keys), 0)) > 0;
  }

  async has(key: string): Promise<boolean> {
    return (await this.run(() => this.client.exists(key), 0)) > 0;
  }

  // Only removes this cache's keys (Keyv prefixes them with `<namespace>:`),
  // never BullMQ's or anything else sharing the database.
  async clear(): Promise<void> {
    if (!this.namespace) {
      throw new Error('IoRedisKeyvStore.clear() needs a Keyv namespace');
    }
    const stream = this.client.scanStream({
      match: `${this.namespace}:*`,
      count: 500,
    });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) await this.client.unlink(...keys);
    }
  }

  // The connection belongs to RedisService, which closes it on shutdown.
  async disconnect(): Promise<void> {}

  private async run<T>(command: () => Promise<T>, fallback: T): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<T>((resolve) => {
      timer = setTimeout(() => {
        this.emit('error', new Error('Redis cache command timed out'));
        resolve(fallback);
      }, this.opts.timeoutMs);
    });
    try {
      return await Promise.race([command(), timeout]);
    } catch (error) {
      this.emit('error', error);
      return fallback;
    } finally {
      clearTimeout(timer);
    }
  }
}
