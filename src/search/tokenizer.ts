export interface TokenizerOptions {
  language?: 'en' | 'it' | 'multi';
  stemming?: boolean;
  minLength?: number;
}

const EN_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'not', 'no', 'nor',
  'so', 'if', 'then', 'than', 'too', 'very', 'just', 'about', 'above',
  'after', 'again', 'all', 'also', 'am', 'any', 'as', 'because', 'before',
  'between', 'both', 'each', 'few', 'get', 'got', 'her', 'here', 'him',
  'his', 'how', 'into', 'it', 'its', 'me', 'more', 'most', 'my', 'now',
  'only', 'other', 'our', 'out', 'over', 'own', 'same', 'she', 'some',
  'such', 'that', 'their', 'them', 'there', 'these', 'they', 'this',
  'those', 'through', 'under', 'up', 'us', 'we', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'you', 'your',
]);

const IT_STOPWORDS = new Set([
  'il', 'lo', 'la', 'le', 'gli', 'un', 'uno', 'una', 'di', 'del', 'dello',
  'della', 'dei', 'degli', 'delle', 'da', 'dal', 'dallo', 'dalla', 'dai',
  'dagli', 'dalle', 'in', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
  'su', 'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'con', 'per',
  'tra', 'fra', 'che', 'chi', 'cui', 'non', 'come', 'ma', 'se', 'perche',
  'anche', 'sono', 'essere', 'stato', 'ha', 'ho', 'suo', 'sua', 'suoi',
  'loro', 'ci', 'questo', 'quella', 'questi', 'quelle', 'quello', 'questa',
  'piu', 'molto', 'tutto', 'tutti', 'ogni', 'dopo', 'prima', 'ancora',
  'poi', 'dove', 'quando',
]);

function getStopwords(language: string): Set<string> {
  if (language === 'en') return EN_STOPWORDS;
  if (language === 'it') return IT_STOPWORDS;
  return new Set([...EN_STOPWORDS, ...IT_STOPWORDS]);
}

function stemEn(word: string): string {
  if (word.length < 5) return word;
  if (word.endsWith('ation')) return word.slice(0, -5);
  if (word.endsWith('tion')) return word.slice(0, -4);
  if (word.endsWith('sion')) return word.slice(0, -4);
  if (word.endsWith('ness')) return word.slice(0, -4);
  if (word.endsWith('ment')) return word.slice(0, -4);
  if (word.endsWith('ings')) return word.slice(0, -4);
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ed')) return word.slice(0, -2);
  if (word.endsWith('ly')) return word.slice(0, -2);
  if (word.endsWith('er')) return word.slice(0, -2);
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function stemIt(word: string): string {
  if (word.length < 5) return word;
  if (word.endsWith('zione')) return word.slice(0, -5);
  if (word.endsWith('mente')) return word.slice(0, -5);
  if (word.endsWith('ando')) return word.slice(0, -4);
  if (word.endsWith('endo')) return word.slice(0, -4);
  if (word.endsWith('are')) return word.slice(0, -3);
  if (word.endsWith('ere')) return word.slice(0, -3);
  if (word.endsWith('ire')) return word.slice(0, -3);
  if (word.endsWith('ato')) return word.slice(0, -3);
  if (word.endsWith('ito')) return word.slice(0, -3);
  if (word.endsWith('uto')) return word.slice(0, -3);
  return word;
}

function stemWord(word: string, language: string): string {
  if (language === 'en') return stemEn(word);
  if (language === 'it') return stemIt(word);
  const en = stemEn(word);
  return en !== word ? en : stemIt(word);
}

const DEFAULT_OPTIONS: Required<TokenizerOptions> = {
  language: 'en',
  stemming: false,
  minLength: 2,
};

export function tokenize(
  text: string,
  options?: TokenizerOptions,
): string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const stopwords = getStopwords(opts.language);

  const tokens = text
    .toLowerCase()
    .split(/[\W_]+/)
    .filter((t) => t.length >= opts.minLength && !stopwords.has(t));

  if (!opts.stemming) return tokens;
  return tokens.map((t) => stemWord(t, opts.language));
}
