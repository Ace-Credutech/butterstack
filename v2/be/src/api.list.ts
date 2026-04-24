import { ApiDetails } from '@setup/api/api.interface';

import { health_live_details }   from '@apis/health/health-live/health-live.details';
import { health_ready_details }  from '@apis/health/health-ready/health-ready.details';

import { auth_login_details }    from '@apis/auth/auth-login/auth-login.details';
import { auth_register_details } from '@apis/auth/auth-register/auth-register.details';
import { auth_refresh_details }  from '@apis/auth/auth-refresh/auth-refresh.details';
import { auth_me_details }       from '@apis/auth/auth-me/auth-me.details';
import { auth_logout_details }   from '@apis/auth/auth-logout/auth-logout.details';

import { post_event_details }    from '@apis/events/post-event/post-event.details';
import { get_event_details }     from '@apis/events/get-event/get-event.details';

import { list_projects_details } from '@apis/projects/list-projects/list-projects.details';

export const api_list: ApiDetails[] = [
  health_live_details,
  health_ready_details,

  auth_login_details,
  auth_register_details,
  auth_refresh_details,
  auth_me_details,
  auth_logout_details,

  post_event_details,
  get_event_details,

  list_projects_details,
];
