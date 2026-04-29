import { EventHandlerDetails } from './event.types';
import { project_create_handler }    from './handlers/project/project.create';
import { project_update_handler }    from './handlers/project/project.update';
import { project_delete_handler }    from './handlers/project/project.delete';
import { member_add_handler }        from './handlers/member/member.add';
import { member_update_handler }     from './handlers/member/member.update';
import { member_remove_handler }     from './handlers/member/member.remove';
import { project_init_step_handler }     from './handlers/project-init/project-init-step';
import { project_document_paste_handler } from './handlers/document/document.paste';
import { role_create_handler }            from './handlers/role/role.create';
import { role_update_handler }            from './handlers/role/role.update';
import { role_delete_handler }            from './handlers/role/role.delete';
import { role_permission_set_handler }    from './handlers/role/role.permission.set';
import { role_permission_unset_handler }  from './handlers/role/role.permission.unset';
import { session_start_handler }          from './handlers/session/session.start';
import { session_end_handler }            from './handlers/session/session.end';
import { message_add_handler }            from './handlers/session/message.add';

export const event_list: EventHandlerDetails[] = [
  project_create_handler,
  project_update_handler,
  project_delete_handler,
  member_add_handler,
  member_update_handler,
  member_remove_handler,
  project_init_step_handler,
  project_document_paste_handler,
  role_create_handler,
  role_update_handler,
  role_delete_handler,
  role_permission_set_handler,
  role_permission_unset_handler,
  session_start_handler,
  session_end_handler,
  message_add_handler,
];
