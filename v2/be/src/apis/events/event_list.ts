import { EventHandlerDetails } from './event.types';
import { project_create_handler }    from './handlers/project/project.create';
import { project_update_handler }    from './handlers/project/project.update';
import { project_delete_handler }    from './handlers/project/project.delete';
import { member_add_handler }        from './handlers/member/member.add';
import { project_init_step_handler }     from './handlers/project-init/project-init-step';
import { project_document_paste_handler } from './handlers/document/document.paste';

export const event_list: EventHandlerDetails[] = [
  project_create_handler,
  project_update_handler,
  project_delete_handler,
  member_add_handler,
  project_init_step_handler,
  project_document_paste_handler,
];
