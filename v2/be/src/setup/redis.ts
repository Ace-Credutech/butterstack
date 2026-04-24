import Redis from 'ioredis';
import { env } from '@src/env';

let client:     Redis | undefined;
let subscriber: Redis | undefined;
let publisher:  Redis | undefined;

export const get_redis = (): Redis => {
  if (!client) client = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 3 });
  return client;
};

export const get_redis_subscriber = (): Redis => {
  if (!subscriber) subscriber = new Redis(env.REDIS_URL);
  return subscriber;
};

export const get_redis_publisher = (): Redis => {
  if (!publisher) publisher = new Redis(env.REDIS_URL);
  return publisher;
};

export const close_redis = async (): Promise<void> => {
  await client?.quit();
  await subscriber?.quit();
  await publisher?.quit();
};
