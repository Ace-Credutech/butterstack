import { Error_Interface } from '@config/interfaces/error.interface';
import { Session } from '@models/session.model';
import { Message } from '@models/message.model';
import { SessionParticipant } from '@models/session-participant.model';
import { list_session_messages_function_params, list_session_messages_function_return } from './list-session-messages.interface';

const fetch_session = async (session_id: string) => Session.findByPk(session_id);

const fetch_messages = async (session_id: string) =>
  Message.findAll({ where: { session_id }, order: [['created_at', 'ASC']] });

const fetch_participants = async (session_id: string) =>
  SessionParticipant.findAll({ where: { session_id }, order: [['joined_at', 'ASC']] });

const shape_message = (m: Message) => ({
  id:               m.id,
  session_id:       m.session_id,
  project_id:       m.project_id,
  participant_id:   m.participant_id,
  role:             m.role,
  channel:          m.channel,
  content:          m.content,
  reply_to:         m.reply_to,
  attachments_json: m.attachments_json,
  created_at:       m.created_at,
});

const shape_participant = (p: SessionParticipant) => ({
  id:           p.id,
  kind:         p.kind,
  user_id:      p.user_id,
  member_id:    p.member_id,
  display_name: p.display_name,
  joined_at:    p.joined_at,
  left_at:      p.left_at,
});

const list_session_messages_function = async (data: list_session_messages_function_params): Promise<list_session_messages_function_return | Error_Interface> => {
  if (!data.user) return { code: 401, message: 'Authentication required' };

  const session = await fetch_session(data.session_id);
  if (!session) return { code: 404, message: 'Session not found' };

  const [messages, participants] = await Promise.all([
    fetch_messages(data.session_id),
    fetch_participants(data.session_id),
  ]);

  return {
    code:    200,
    message: 'session messages',
    data: {
      session_id:   session.id,
      project_id:   session.project_id,
      kind:         session.kind,
      title:        session.title,
      ended_at:     session.ended_at,
      participants: participants.map(shape_participant),
      messages:     messages.map(shape_message),
    },
  };
};

export default list_session_messages_function;
