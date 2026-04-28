import { Transaction } from 'sequelize';
import { Error_Interface } from '@config/interfaces/error.interface';
import { Prompt } from '@models/prompt.model';
import { PromptVersion } from '@models/prompt-version.model';
import { update_prompt_function_params, update_prompt_function_return } from './update-prompt.interface';

const load_prompt_with_version = async (prompt_id: string, tx: Transaction) =>
  Prompt.findByPk(prompt_id, {
    include: [{ model: PromptVersion, as: 'current_version' }],
    transaction: tx,
  });

const supersede_current = async (version_id: string, tx: Transaction) =>
  PromptVersion.update({ status: 'superseded' }, { where: { id: version_id }, transaction: tx });

const create_next_version = async (prompt: Prompt, current: any, data: update_prompt_function_params, tx: Transaction) =>
  PromptVersion.create({
    prompt_id:       prompt.id,
    version:         current.version + 1,
    status:          'active',
    model:           (data.model           ?? current.model)           as any,
    temperature:     data.temperature      ?? current.temperature,
    max_tokens:      data.max_tokens       ?? current.max_tokens,
    response_format: (data.response_format ?? current.response_format) as any,
    system_text:     data.system_text      ?? current.system_text,
    user_template:   data.user_template    ?? current.user_template,
    variables_schema: current.variables_schema,
    response_schema:  current.response_schema,
    rag_strategy:     current.rag_strategy,
    notes:           data.notes ?? current.notes,
    created_by:      data.user?.id ?? null,
  }, { transaction: tx });

const point_prompt_to_version = async (prompt: Prompt, version_id: string, tx: Transaction) =>
  prompt.update({ current_version_id: version_id }, { transaction: tx });

const update_prompt_function = async (data: update_prompt_function_params, transaction: Transaction): Promise<update_prompt_function_return | Error_Interface> => {
  if (!data.user) return { code: 401, message: 'Authentication required' };

  const prompt = await load_prompt_with_version(data.prompt_id, transaction);
  if (!prompt)                             return { code: 404, message: 'Prompt not found' };

  const current = (prompt as any).current_version;
  if (!current)                            return { code: 422, message: 'Prompt has no active version to update' };

  await supersede_current(current.id, transaction);
  const next = await create_next_version(prompt, current, data, transaction);
  await point_prompt_to_version(prompt, next.id, transaction);

  return {
    code:    200,
    message: 'updated',
    data: {
      id:              next.id,
      version:         next.version,
      model:           next.model,
      temperature:     next.temperature,
      max_tokens:      next.max_tokens,
      response_format: next.response_format,
      system_text:     next.system_text,
      user_template:   next.user_template,
      notes:           next.notes,
    },
  };
};

export default update_prompt_function;
