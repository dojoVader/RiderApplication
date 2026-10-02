import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

/**
 * ioredis options from the environment.
 *
 * REDIS_URL (e.g. Railway's `redis://default:pass@host:6379`, or `rediss://`
 * for TLS) wins when set. Otherwise REDIS_HOST / REDIS_PORT / REDIS_PASSWORD,
 * which docker-compose sets to the `redis` service.
 */
export function redisOptions(config: ConfigService): RedisOptions {
  const url = config.get<string>('REDIS_URL');
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: parsed.username
        ? decodeURIComponent(parsed.username)
        : undefined,
      password: parsed.password
        ? decodeURIComponent(parsed.password)
        : undefined,
      db:
        parsed.pathname.length > 1
          ? Number(parsed.pathname.slice(1))
          : undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  }
  return {
    host: config.get<string>('REDIS_HOST') ?? 'localhost',
    port: Number(config.get<string>('REDIS_PORT') ?? 6379),
    password: config.get<string>('REDIS_PASSWORD') || undefined,
  };
}
