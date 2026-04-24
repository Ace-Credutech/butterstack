import { QueueClient } from './queue-client';
import { bullmq_adapter } from './adapters/bullmq.adapter';

let client: QueueClient | undefined;

export const get_queue = (): QueueClient => {
  if (!client) client = bullmq_adapter();
  return client;
};

export const close_queue = async () => {
  if (!client) return;
  await client.close();
  client = undefined;
};
