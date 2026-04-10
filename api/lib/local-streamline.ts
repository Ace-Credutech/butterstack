// Local Hinglish/Minglish/Gujarati-English normalizer.
// Runs in-process with zero API calls. Falls back to raw input if confidence is low.
// OpenAI streamline only called when local confidence < threshold.

const HINGLISH_MAP: Record<string, string> = {
  // Common Hinglish words → English
  'chahiye': 'needed',       'muje': 'I need',         'mujhe': 'I need',
  'banana': 'create',        'banao': 'create',         'dikhao': 'show',
  'upar': 'top',             'neeche': 'bottom',        'left': 'left',
  'right': 'right',          'side': 'side',            'pe': 'on',
  'mein': 'in',              'ke': 'of',                'aur': 'and',
  'ho': 'should be',         'hona': 'should be',       'karna': 'do',
  'wala': 'type',            'saath': 'with',           'bina': 'without',
  'ek': 'a',                 'sabhi': 'all',            'nahi': 'no',
  'hai': 'is',               'hain': 'are',             'tha': 'was',
  'kuch': 'some',            'jisme': 'which has',      'jaha': 'where',
  'bada': 'large',           'chota': 'small',          'saaf': 'clean',
  'sundar': 'beautiful',     'accha': 'good',           'achha': 'good',
  // Marathi-English (Minglish)
  'hava': 'needed',          'ahe': 'is',               'aahe': 'is',
  'tya': 'that',             'ya': 'this',              'ani': 'and',
  'nko': 'not needed',       'pahi': 'want',            'pahije': 'need',
  'mala': 'I want',          'ata': 'now',              'sarva': 'all',
  'mahiti': 'information',   'karnyasathi': 'to do',
  // Gujarati-English
  'joie': 'need',            'joiye': 'need',           'chhe': 'is',
  'ane': 'and',              'pan': 'also',             'nathi': 'not',
  'tamne': 'you',            'mane': 'I want',          'aa': 'this',
  'te': 'that',              'badhu': 'all',            'karo': 'do',
}

const UI_KEYWORDS: Record<string, string> = {
  // UI components
  'dashboard':  'dashboard page with stats and overview',
  'login':      'login page with authentication form',
  'signup':     'registration form page',
  'form':       'data entry form',
  'list':       'list view with table',
  'table':      'data table with rows and columns',
  'card':       'card grid layout',
  'modal':      'modal dialog',
  'sidebar':    'navigation sidebar',
  'navbar':     'top navigation bar',
  'profile':    'user profile settings page',
  'settings':   'settings configuration page',
  'report':     'report with charts and data',
  'search':     'search interface',
  'filter':     'filter and sort interface',
  'upload':     'file upload interface',
  'chart':      'data visualization with charts',
  'calendar':   'calendar view',
  'timeline':   'timeline view',
  'kanban':     'kanban board',
}

function replaceHinglish(text: string): string {
  return text
    .split(/\s+/)
    .map(word => HINGLISH_MAP[word.toLowerCase()] ?? word)
    .join(' ')
}

function replaceUIKeywords(text: string): string {
  let result = text
  for (const [kw, expansion] of Object.entries(UI_KEYWORDS)) {
    result = result.replace(new RegExp(`\\b${kw}\\b`, 'gi'), expansion)
  }
  return result
}

function cleanPunctuation(text: string): string {
  return text
    .replace(/[^\w\s.,?!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type LocalStreamlineResult = {
  cleanPrompt: string
  confidence:  number   // 0–1: how confident we are in local cleanup
}

export async function localStreamline(title: string, description: string): Promise<LocalStreamlineResult> {
  const raw = `${title} ${description}`.trim()

  // Layer 1 — static hardcoded dictionary
  const step1 = replaceHinglish(raw)
  const step2 = replaceUIKeywords(step1)

  // Layer 2 — dynamic learned dictionary from DB (grows with every AI call)
  const { translatePhrase } = await import('./dictionary.ts')
  const { result: step3, confidence: learnedConf } = await translatePhrase(step2)

  const cleaned    = cleanPunctuation(step3)

  // Confidence: blend of static pass + learned dictionary coverage
  const words      = raw.split(/\s+/)
  const staticHits = words.filter(w => HINGLISH_MAP[w.toLowerCase()]).length
  const staticConf = words.length > 0 ? staticHits / words.length : 0
  const confidence = Math.min(1, (staticConf * 0.4) + (learnedConf * 0.6))

  return { cleanPrompt: cleaned, confidence }
}
