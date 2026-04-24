import { Transaction } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';

export type CronContext = {
  trigger:  'cron';
  fired_at: Date;
  trace_id: string;
};

export type CronResult = { code: number; message: string; data?: any };

export type CronFunction = (ctx: CronContext, transaction: Transaction | null) => Promise<CronResult | Error_Interface>;

export type CronDetails = {
  cron_name:          string;
  description:        string;
  schedule:           string;
  timezone?:          string;
  lock_ttl_ms?:       number;
  max_runtime_ms?:    number;
  execution_function: CronFunction;
  uses_transaction?:  boolean;
  tests?:             any[];
};
