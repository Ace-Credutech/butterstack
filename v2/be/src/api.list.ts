import { ApiDetails } from '@setup/api/api.interface';

import { health_live_details }   from '@apis/health/health-live/health-live.details';
import { health_ready_details }  from '@apis/health/health-ready/health-ready.details';

import { auth_login_details }    from '@apis/auth/auth-login/auth-login.details';
import { auth_register_details } from '@apis/auth/auth-register/auth-register.details';
import { auth_refresh_details }  from '@apis/auth/auth-refresh/auth-refresh.details';
import { auth_me_details }       from '@apis/auth/auth-me/auth-me.details';
import { auth_logout_details }   from '@apis/auth/auth-logout/auth-logout.details';
import { auth_forgot_password_details } from '@apis/auth/auth-forgot-password/auth-forgot-password.details';
import { auth_reset_password_details }  from '@apis/auth/auth-reset-password/auth-reset-password.details';


import { list_orgs_details }     from '@apis/orgs/list-orgs/list-orgs.details';
import { get_org_details }       from '@apis/orgs/get-org/get-org.details';


import { list_prompts_details }  from '@apis/admin/list-prompts/list-prompts.details';
import { get_prompt_details }    from '@apis/admin/get-prompt/get-prompt.details';
import { update_prompt_details } from '@apis/admin/update-prompt/update-prompt.details';

import { list_users_details }    from '@apis/admin/list-users/list-users.details';
import { update_user_details }   from '@apis/admin/update-user/update-user.details';
import { list_roles_details }    from '@apis/admin/list-roles/list-roles.details';
import { create_role_details }   from '@apis/admin/create-role/create-role.details';
import { update_role_details }   from '@apis/admin/update-role/update-role.details';
import { bulk_update_users_details } from '@apis/admin/bulk-update-users/bulk-update-users.details';

import { list_projects_details }            from '@apis/projects/list-projects/list-projects.details';
import { get_init_state_details }           from '@apis/projects/get-init-state/get-init-state.details';
import { list_project_documents_details }   from '@apis/projects/list-project-documents/list-project-documents.details';
import { get_initial_context_details }      from '@apis/projects/get-initial-context/get-initial-context.details';
import { list_project_roles_details }       from '@apis/projects/list-project-roles/list-project-roles.details';
import { get_rbac_matrix_details }          from '@apis/projects/get-rbac-matrix/get-rbac-matrix.details';

import { post_event_details }      from '@apis/events/post-event/post-event.details';
import { get_event_details }       from '@apis/events/get-event/get-event.details';

export const api_list: ApiDetails[] = [
  health_live_details,
  health_ready_details,

  auth_login_details,
  auth_register_details,
  auth_refresh_details,
  auth_me_details,
  auth_logout_details,
  auth_forgot_password_details,
  auth_reset_password_details,

  list_orgs_details,
  get_org_details,

  list_prompts_details,
  get_prompt_details,
  update_prompt_details,

  list_users_details,
  update_user_details,
  list_roles_details,
  create_role_details,
  update_role_details,
  bulk_update_users_details,

  list_projects_details,
  get_init_state_details,
  list_project_documents_details,
  get_initial_context_details,
  list_project_roles_details,
  get_rbac_matrix_details,

  post_event_details,
  get_event_details,
];
