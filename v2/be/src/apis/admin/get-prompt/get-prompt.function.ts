import { Error_Interface } from '@config/interfaces/error.interface';
import { Prompt } from '@models/prompt.model';
import { PromptVersion } from '@models/prompt-version.model';
import { get_prompt_function_params, get_prompt_function_return } from './get-prompt.interface';

const shape_version = (v: any) => ({
  id:              v.id,
  version:         v.version,
  status:          v.status,
  model:           v.model,
  temperature:     v.temperature,
  max_tokens:      v.max_tokens,
  response_format: v.response_format,
  system_text:     v.system_text,
  user_template:   v.user_template,
  notes:           v.notes,
  created_at:      v.created_at,
});

const get_prompt_function = async (data: get_prompt_function_params): Promise<get_prompt_function_return | Error_Interface> => {
  try {
    if (!data.user) return { code: 401, message: 'Authentication required' };
    const prompt = await Prompt.findByPk(data.prompt_id, {
      include: [{ model: PromptVersion, as: 'current_version' }],
    });
    if (!prompt) return { code: 404, message: 'Prompt not found' };
    return {
      code:    200,
      message: 'prompt',
      data: {
        id:          prompt.id,
        slug:        prompt.slug,
        name:        prompt.name,
        description: prompt.description,
        category:    prompt.category,
        status:      prompt.status,
        version:     (prompt as any).current_version ? shape_version((prompt as any).current_version) : null,
      },
    };
  } catch (error: any) {
    return { code: 500, message: String(error?.message ?? 'Failed to get prompt') };
  }
};

export default get_prompt_function;
