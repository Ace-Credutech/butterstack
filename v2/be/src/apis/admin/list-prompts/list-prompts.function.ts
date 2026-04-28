import { Error_Interface } from '@config/interfaces/error.interface';
import { Prompt } from '@models/prompt.model';
import { PromptVersion } from '@models/prompt-version.model';
import { list_prompts_function_params, list_prompts_function_return } from './list-prompts.interface';

const shape_prompt = (p: any) => ({
  id:          p.id,
  slug:        p.slug,
  name:        p.name,
  description: p.description,
  category:    p.category,
  status:      p.status,
  version: p.current_version ? {
    id:              p.current_version.id,
    version:         p.current_version.version,
    model:           p.current_version.model,
    temperature:     p.current_version.temperature,
    max_tokens:      p.current_version.max_tokens,
    response_format: p.current_version.response_format,
  } : null,
});

const list_prompts_function = async (data: list_prompts_function_params): Promise<list_prompts_function_return | Error_Interface> => {
  try {
    if (!data.user) return { code: 401, message: 'Authentication required' };
    const prompts = await Prompt.findAll({
      include: [{ model: PromptVersion, as: 'current_version' }],
      order:   [['category', 'ASC'], ['name', 'ASC']],
    });
    return { code: 200, message: 'prompts', data: { items: prompts.map(shape_prompt) } };
  } catch (error: any) {
    return { code: 500, message: String(error?.message ?? 'Failed to list prompts') };
  }
};

export default list_prompts_function;
