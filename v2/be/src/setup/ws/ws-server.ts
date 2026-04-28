import { v4 as uuidv4 } from 'uuid';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { get_redis_subscriber, get_redis_publisher } from '@setup/redis';
import { load_session } from '@setup/session-store';
import { verify_bearer_token } from '@setup/jwt-verify';
import { ensure_user_from_claims } from '@setup/user-upsert';
import { User } from '@models/user.model';
import { Role } from '@models/role.model';
import { ProjectMember } from '@models/project-member.model';
import { OrganisationMember } from '@models/organisation-member.model';
import { log } from '@setup/log';
import { env } from '@src/env';
import { run_with_trace } from '@setup/trace-context';

type WsEvent = {
  type:       string;
  payload?:   unknown;
  scope?:     Record<string, unknown>;
  trace_id?:  string;
  at?:        string;
};

type WsData = {
  connection_id: string;
  user_id:       string | null;
  user:          any | null;
  trace_id:      string;
  topics:        string[];
};

type BunServerWs = {
  send:        (msg: string) => void;
  close:       (code?: number, reason?: string) => void;
  subscribe:   (topic: string) => void;
  unsubscribe: (topic: string) => void;
  data:        WsData;
};

const parse_signed_cookie_value = (signed: string): string | null => {
  const dot_ix = signed.lastIndexOf('.');
  if (dot_ix <= 0) return null;
  const value = signed.slice(0, dot_ix);
  const mac   = signed.slice(dot_ix + 1);
  const expected = createHmac('sha256', env.SESSION_SECRET).update(`${env.SESSION_COOKIE_NAME}=${value}`).digest('base64').replace(/=+$/, '');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? value : null;
};

const extract_session_id = async (req: Request): Promise<string | null> => {
  const cookie_header = req.headers.get('Cookie') ?? '';
  const match = cookie_header.match(new RegExp(`${env.SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match || !match[1]) return null;
  const raw = decodeURIComponent(match[1]);
  return parse_signed_cookie_value(raw);
};

const load_user_from_session = async (sid: string) => {
  const session = await load_session(sid);
  if (!session) return null;
  return User.findByPk(session.user_id, { include: [{ model: Role, as: 'role' }] });
};

const load_user_from_jwt = async (token: string) => {
  try {
    const claims = await verify_bearer_token(token);
    return await ensure_user_from_claims(claims);
  } catch {
    return null;
  }
};

const list_user_project_ids = async (user_id: string): Promise<string[]> => {
  try {
    const members = await ProjectMember.findAll({ where: { user_id }, attributes: ['project_id'] });
    return members.map(m => m.project_id as string);
  } catch {
    return [];
  }
};

const list_user_org_ids = async (user_id: string): Promise<string[]> => {
  try {
    const members = await OrganisationMember.findAll({ where: { user_id }, attributes: ['org_id'] });
    return members.map(m => m.org_id as string);
  } catch {
    return [];
  }
};

export const user_topic    = (user_id: string)    => `user:${user_id}`;
export const project_topic = (project_id: string) => `project:${project_id}`;
export const org_topic     = (org_id: string)     => `org:${org_id}`;

export const upgrade_ws = async (req: Request): Promise<WsData | Response> => {
  const url       = new URL(req.url);
  const jwt_token = url.searchParams.get('access_token');
  const trace_id  = req.headers.get('X-Trace-Id') ?? uuidv4();

  let user: Awaited<ReturnType<typeof load_user_from_jwt>> = null;
  if (jwt_token) {
    user = await load_user_from_jwt(jwt_token).catch(() => null);
  } else {
    const sid = await extract_session_id(req).catch(() => null);
    user = sid ? await load_user_from_session(sid).catch(() => null) : null;
  }

  if (!user) return new Response('Unauthorized', { status: 401 });
  return {
    connection_id: uuidv4(),
    user_id:       (user as any).id,
    user,
    trace_id,
    topics:        [],
  };
};

export const on_open = async (ws: BunServerWs) => {
  const { user_id, trace_id, connection_id } = ws.data;
  if (!user_id) return ws.close(1008, 'unauthenticated');

  ws.subscribe(user_topic(user_id));
  ws.data.topics.push(user_topic(user_id));

  const project_ids = await list_user_project_ids(user_id);
  for (const pid of project_ids) {
    ws.subscribe(project_topic(pid));
    ws.data.topics.push(project_topic(pid));
  }

  const org_ids = await list_user_org_ids(user_id);
  for (const oid of org_ids) {
    ws.subscribe(org_topic(oid));
    ws.data.topics.push(org_topic(oid));
  }

  run_with_trace({ trace_id, user_id }, () => log.info('ws.open', { connection_id, topics: ws.data.topics }));
  ws.send(JSON.stringify({ type: 'welcome', payload: { connection_id, topics: ws.data.topics }, trace_id }));
};

export const on_message = async (ws: BunServerWs, raw: string) => {
  const { trace_id, user_id, connection_id } = ws.data;
  run_with_trace({ trace_id, user_id: user_id ?? undefined }, () => {
    log.info('ws.message', { connection_id, bytes: raw.length });
    ws.send(JSON.stringify({ type: 'ack', payload: { received_bytes: raw.length }, trace_id }));
  });
};

export const on_close = async (ws: BunServerWs, code: number, reason: string) => {
  const { trace_id, user_id, connection_id } = ws.data;
  run_with_trace({ trace_id, user_id: user_id ?? undefined }, () => log.info('ws.close', { connection_id, code, reason }));
};

const publish_event = async (topic: string, event: WsEvent) => {
  const payload = JSON.stringify({ ...event, at: event.at ?? new Date().toISOString() });
  await get_redis_publisher().publish(topic, payload);
};

export const broadcast_to_user    = async (user_id: string,    event: WsEvent) => publish_event(user_topic(user_id), event);
export const broadcast_to_project = async (project_id: string, event: WsEvent) => publish_event(project_topic(project_id), event);
export const broadcast_to_org     = async (org_id: string,     event: WsEvent) => publish_event(org_topic(org_id), event);

type BunServer = { publish: (topic: string, msg: string) => void };
let bun_server_ref: BunServer | null = null;
export const attach_bun_server = (s: BunServer) => { bun_server_ref = s; };

export const start_redis_bridge = () => {
  const sub = get_redis_subscriber();
  sub.psubscribe('user:*', 'project:*', 'org:*').catch(e => log.error('redis.psub.fail', { error: String(e?.message ?? e) }));
  sub.on('pmessage', (_pattern, channel, message) => {
    if (bun_server_ref) bun_server_ref.publish(channel, message);
  });
};
