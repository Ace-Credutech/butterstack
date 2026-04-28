import { env } from './env';
import { app } from '@setup/hono';
import { auth_middleware } from '@setup/auth-middleware';
import { setup_api } from '@setup/api/setup-api';
import { sequelize, close_all_dbs } from '@setup/sequelize';
import '@models/index';
import { migrator } from '@setup/migrator';
import { api_list } from './api.list';
import { register_document_routes }       from '@apis/documents/documents.routes';
import { register_document_parse_routes } from '@apis/documents/document-parse.routes';
import { upgrade_ws, on_open, on_message, on_close, attach_bun_server, start_redis_bridge } from '@setup/ws/ws-server';
import { setup_worker, start_workers } from '@setup/queue/setup-worker';
import { worker_list } from './worker.list';
import { close_queue } from '@setup/queue/queue';
import { setup_cron, stop_all_crons } from '@setup/cron/setup-cron';
import { cron_list } from './cron.list';
import { close_redis } from '@setup/redis';
import { log } from '@setup/log';

const run_migrations_on_dev = async () => {
  if (env.NODE_ENV !== 'development') return;
  try { await migrator.up(); log.info('boot.migrations.applied'); }
  catch (e: any) { log.warn('boot.migrations.failed', { error: String(e?.message ?? e) }); }
};

const register_apis = () => {
  app.use('/api/*', auth_middleware);
  for (const details of api_list) setup_api(details);
  register_document_routes();
  register_document_parse_routes();
};

const register_workers = () => {
  for (const details of worker_list) setup_worker(details);
  start_workers();
};

const register_crons = () => {
  for (const details of cron_list) setup_cron(details);
};

const boot = async () => {
  await sequelize.authenticate().catch((e: any) => log.warn('boot.db.connect.failed', { error: String(e?.message ?? e) }));
  await run_migrations_on_dev();
  register_apis();
  register_workers();
  register_crons();
  start_redis_bridge();
};

await boot();

const WS_PATH = '/api/ws';

const server = Bun.serve({
  port: env.PORT,
  async fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === WS_PATH) {
      const ws_data_or_response = await upgrade_ws(req);
      if (ws_data_or_response instanceof Response) return ws_data_or_response;
      const upgraded = (server as any).upgrade(req, { data: ws_data_or_response });
      if (upgraded) return undefined as any;
      return new Response('WebSocket upgrade failed', { status: 400 });
    }
    return app.fetch(req, server);
  },
  websocket: {
    open:    on_open    as any,
    message: on_message as any,
    close:   on_close   as any,
  },
});

attach_bun_server(server as any);

log.info('boot.ready', { port: env.PORT, apis: api_list.length, workers: worker_list.length, crons: cron_list.length });

const shutdown = async (signal: string) => {
  log.info('shutdown.start', { signal });
  stop_all_crons();
  server.stop(true);
  await close_queue().catch(() => {});
  await close_all_dbs().catch(() => {});
  await close_redis().catch(() => {});
  log.info('shutdown.complete');
  process.exit(0);
};
process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT',  () => { shutdown('SIGINT');  });
