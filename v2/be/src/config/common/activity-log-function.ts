import { Transaction } from 'sequelize';
import { ActivityLog } from '@models/activity-log.model';
import { get_trace_id } from '@setup/trace-context';

export type ActivityLogParams = {
  user_id:     string;
  action:      string;
  entity:      string;
  entity_id?:  string;
  description: string;
};

export const log_activity = async (params: ActivityLogParams, transaction: Transaction): Promise<void> => {
  await ActivityLog.create({
    user_id:     params.user_id,
    action:      params.action,
    entity:      params.entity,
    entity_id:   params.entity_id,
    description: params.description,
    trace_id:    get_trace_id(),
  }, { transaction });
};
