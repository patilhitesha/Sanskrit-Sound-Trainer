import { useState, useRef, useEffect } from "react";

// ── Browser Speech API type declarations (not in default TS lib) ───────────────
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }
}

// ── Data ──────────────────────────────────────────────────────────────────────

type SoundType = "vowel" | "consonant";
type ArticulationGroup =
  | "Kaṇṭhya"
  | "Tālavya"
  | "Mūrdhanya"
  | "Dantya"
  | "Oṣṭhya"
  | "Kaṇṭhatālavya"
  | "Kaṇṭhoṣṭhya"
  | "Dantōṣṭhya"
  | "Nāsikya";

interface Sound {
  id: string;
  devanagari: string;
  iast: string;
  type: SoundType;
  group: ArticulationGroup;
  groupEn: string;
  description: string;
  example: string;
}

const SOUNDS: Sound[] = [
  // Vowels
  { id: "a",  devanagari: "अ", iast: "a",  type: "vowel", group: "Kaṇṭhya",          groupEn: "Guttural",        description: "Short open back vowel",           example: "as in 'cut'" },
  { id: "aa", devanagari: "आ", iast: "ā",  type: "vowel", group: "Kaṇṭhya",          groupEn: "Guttural",        description: "Long open back vowel",            example: "as in 'father'" },
  { id: "i",  devanagari: "इ", iast: "i",  type: "vowel", group: "Tālavya",          groupEn: "Palatal",         description: "Short close front vowel",         example: "as in 'sit'" },
  { id: "ii", devanagari: "ई", iast: "ī",  type: "vowel", group: "Tālavya",          groupEn: "Palatal",         description: "Long close front vowel",          example: "as in 'see'" },
  { id: "u",  devanagari: "उ", iast: "u",  type: "vowel", group: "Oṣṭhya",           groupEn: "Labial",          description: "Short close back vowel",          example: "as in 'put'" },
  { id: "uu", devanagari: "ऊ", iast: "ū",  type: "vowel", group: "Oṣṭhya",           groupEn: "Labial",          description: "Long close back vowel",           example: "as in 'moon'" },
  { id: "e",  devanagari: "ए", iast: "e",  type: "vowel", group: "Kaṇṭhatālavya",    groupEn: "Gutturo-Palatal", description: "Mid front vowel",                 example: "as in 'they'" },
  { id: "ai", devanagari: "ऐ", iast: "ai", type: "vowel", group: "Kaṇṭhatālavya",    groupEn: "Gutturo-Palatal", description: "Diphthong",                       example: "as in 'aisle'" },
  { id: "o",  devanagari: "ओ", iast: "o",  type: "vowel", group: "Kaṇṭhoṣṭhya",      groupEn: "Gutturo-Labial",  description: "Mid back vowel",                  example: "as in 'go'" },
  { id: "au", devanagari: "औ", iast: "au", type: "vowel", group: "Kaṇṭhoṣṭhya",      groupEn: "Gutturo-Labial",  description: "Diphthong",                       example: "as in 'now'" },
  // Consonants – Guttural
  { id: "ka",  devanagari: "क",  iast: "ka",  type: "consonant", group: "Kaṇṭhya",   groupEn: "Guttural",  description: "Unaspirated voiceless velar stop",            example: "as in 'skip'" },
  { id: "kha", devanagari: "ख",  iast: "kha", type: "consonant", group: "Kaṇṭhya",   groupEn: "Guttural",  description: "Aspirated voiceless velar stop",              example: "as in 'blockhead'" },
  { id: "ga",  devanagari: "ग",  iast: "ga",  type: "consonant", group: "Kaṇṭhya",   groupEn: "Guttural",  description: "Unaspirated voiced velar stop",               example: "as in 'game'" },
  { id: "gha", devanagari: "घ",  iast: "gha", type: "consonant", group: "Kaṇṭhya",   groupEn: "Guttural",  description: "Aspirated voiced velar stop",                 example: "as in 'leghorn'" },
  { id: "nga", devanagari: "ङ",  iast: "ṅa",  type: "consonant", group: "Kaṇṭhya",   groupEn: "Guttural",  description: "Velar nasal",                                 example: "as in 'sing'" },
  // Consonants – Palatal
  { id: "ca",  devanagari: "च",  iast: "ca",  type: "consonant", group: "Tālavya",   groupEn: "Palatal",   description: "Unaspirated voiceless palatal affricate",     example: "as in 'church'" },
  { id: "cha", devanagari: "छ",  iast: "cha", type: "consonant", group: "Tālavya",   groupEn: "Palatal",   description: "Aspirated voiceless palatal affricate",       example: "strong ch" },
  { id: "ja",  devanagari: "ज",  iast: "ja",  type: "consonant", group: "Tālavya",   groupEn: "Palatal",   description: "Unaspirated voiced palatal affricate",        example: "as in 'jam'" },
  { id: "jha", devanagari: "झ",  iast: "jha", type: "consonant", group: "Tālavya",   groupEn: "Palatal",   description: "Aspirated voiced palatal affricate",          example: "aspirated j" },
  { id: "nya", devanagari: "ञ",  iast: "ña",  type: "consonant", group: "Tālavya",   groupEn: "Palatal",   description: "Palatal nasal",                               example: "as in 'canyon'" },
  // Consonants – Retroflex
  { id: "tta",  devanagari: "ट", iast: "ṭa",  type: "consonant", group: "Mūrdhanya", groupEn: "Retroflex", description: "Unaspirated voiceless retroflex stop",        example: "tongue tip curled back" },
  { id: "ttha", devanagari: "ठ", iast: "ṭha", type: "consonant", group: "Mūrdhanya", groupEn: "Retroflex", description: "Aspirated voiceless retroflex stop",          example: "aspirated ṭ" },
  { id: "dda",  devanagari: "ड", iast: "ḍa",  type: "consonant", group: "Mūrdhanya", groupEn: "Retroflex", description: "Unaspirated voiced retroflex stop",           example: "retroflex d" },
  { id: "ddha", devanagari: "ढ", iast: "ḍha", type: "consonant", group: "Mūrdhanya", groupEn: "Retroflex", description: "Aspirated voiced retroflex stop",             example: "aspirated ḍ" },
  { id: "nna",  devanagari: "ण", iast: "ṇa",  type: "consonant", group: "Mūrdhanya", groupEn: "Retroflex", description: "Retroflex nasal",                             example: "nasal with curled tongue" },
  // Consonants – Dental
  { id: "ta",  devanagari: "त", iast: "ta",  type: "consonant", group: "Dantya",     groupEn: "Dental",    description: "Unaspirated voiceless dental stop",           example: "as in Spanish 'tú'" },
  { id: "tha", devanagari: "थ", iast: "tha", type: "consonant", group: "Dantya",     groupEn: "Dental",    description: "Aspirated voiceless dental stop",             example: "as in 'Thames'" },
  { id: "da",  devanagari: "द", iast: "da",  type: "consonant", group: "Dantya",     groupEn: "Dental",    description: "Unaspirated voiced dental stop",              example: "as in Spanish 'donde'" },
  { id: "dha", devanagari: "ध", iast: "dha", type: "consonant", group: "Dantya",     groupEn: "Dental",    description: "Aspirated voiced dental stop",                example: "aspirated d" },
  { id: "na",  devanagari: "न", iast: "na",  type: "consonant", group: "Dantya",     groupEn: "Dental",    description: "Dental nasal",                                example: "as in 'now'" },
  // Consonants – Labial
  { id: "pa",  devanagari: "प", iast: "pa",  type: "consonant", group: "Oṣṭhya",     groupEn: "Labial",    description: "Unaspirated voiceless bilabial stop",         example: "as in 'spot'" },
  { id: "pha", devanagari: "फ", iast: "pha", type: "consonant", group: "Oṣṭhya",     groupEn: "Labial",    description: "Aspirated voiceless bilabial stop",           example: "as in 'phone'" },
  { id: "ba",  devanagari: "ब", iast: "ba",  type: "consonant", group: "Oṣṭhya",     groupEn: "Labial",    description: "Unaspirated voiced bilabial stop",            example: "as in 'ball'" },
  { id: "bha", devanagari: "भ", iast: "bha", type: "consonant", group: "Oṣṭhya",     groupEn: "Labial",    description: "Aspirated voiced bilabial stop",              example: "aspirated b" },
  { id: "ma",  devanagari: "म", iast: "ma",  type: "consonant", group: "Oṣṭhya",     groupEn: "Labial",    description: "Bilabial nasal",                              example: "as in 'mother'" },
  // Semi-vowels & Sibilants
  { id: "ya",  devanagari: "य", iast: "ya",  type: "consonant", group: "Tālavya",    groupEn: "Palatal",      description: "Palatal approximant / semi-vowel",          example: "as in 'yes'" },
  { id: "ra",  devanagari: "र", iast: "ra",  type: "consonant", group: "Mūrdhanya",  groupEn: "Retroflex",    description: "Retroflex flap / trill",                    example: "rolled r" },
  { id: "la",  devanagari: "ल", iast: "la",  type: "consonant", group: "Dantya",     groupEn: "Dental",       description: "Dental lateral approximant",                example: "as in 'light'" },
  { id: "va",  devanagari: "व", iast: "va",  type: "consonant", group: "Dantōṣṭhya", groupEn: "Dento-Labial", description: "Labiodental approximant",                   example: "between v and w" },
  { id: "sha", devanagari: "श", iast: "śa",  type: "consonant", group: "Tālavya",    groupEn: "Palatal",      description: "Voiceless palatal sibilant",                example: "as in 'ship'" },
  { id: "ssa", devanagari: "ष", iast: "ṣa",  type: "consonant", group: "Mūrdhanya",  groupEn: "Retroflex",    description: "Voiceless retroflex sibilant",              example: "retroflex sh" },
  { id: "sa",  devanagari: "स", iast: "sa",  type: "consonant", group: "Dantya",     groupEn: "Dental",       description: "Voiceless dental sibilant",                 example: "as in 'sun'" },
  { id: "ha",  devanagari: "ह", iast: "ha",  type: "consonant", group: "Kaṇṭhya",    groupEn: "Guttural",     description: "Voiced glottal fricative / aspirate",       example: "as in 'hill'" },
];

const GROUP_COLORS: Record<string, string> = {
  "Kaṇṭhya":       "#c0392b",
  "Tālavya":       "#27ae60",
  "Mūrdhanya":     "#2980b9",
  "Dantya":        "#d68910",
  "Oṣṭhya":        "#8e44ad",
  "Kaṇṭhatālavya": "#e67e22",
  "Kaṇṭhoṣṭhya":   "#c0392b",
  "Dantōṣṭhya":    "#16a085",
  "Nāsikya":       "#7f8c8d",
};

const ARTICULATION_INFO: Record<string, { en: string; place: string; tip: string }> = {
  "Kaṇṭhya":       { en: "Guttural",       place: "Throat / Velum",    tip: "Sound originates at the back of the throat." },
  "Tālavya":       { en: "Palatal",         place: "Hard Palate",       tip: "Tongue blade touches or approaches the hard palate." },
  "Mūrdhanya":     { en: "Retroflex",       place: "Cerebral / Dome",   tip: "Tongue tip curls back to touch the dome of the mouth." },
  "Dantya":        { en: "Dental",          place: "Upper Teeth",       tip: "Tongue tip touches the back of the upper teeth." },
  "Oṣṭhya":        { en: "Labial",          place: "Lips",              tip: "Sound formed primarily with the lips." },
  "Kaṇṭhatālavya": { en: "Gutturo-Palatal", place: "Throat + Palate",   tip: "Combination of guttural and palatal articulation." },
  "Kaṇṭhoṣṭhya":   { en: "Gutturo-Labial",  place: "Throat + Lips",     tip: "Combination of guttural and labial articulation." },
  "Dantōṣṭhya":    { en: "Dento-Labial",    place: "Teeth + Lips",      tip: "Lower lip approaches upper teeth." },
  "Nāsikya":       { en: "Nasal",           place: "Nasal Passage",     tip: "Sound passes through the nasal cavity." },
};
// ── Helper ────────────────────────────────────────────────────────────────────

function groupSounds(sounds: Sound[], type: SoundType) {
  const grouped: Record<string, Sound[]> = {};
  sounds.filter((s) => s.type === type).forEach((s) => {
    if (!grouped[s.group]) grouped[s.group] = [];
    grouped[s.group].push(s);
  });
  return grouped;
}

// ── Devanagari → Sound ID (direct Unicode map for mr-IN / hi-IN ASR output) ──

// Strip Devanagari matras/diacritics to get base characters only
const DEVANAGARI_MATRA_RE = /[\u093A-\u094F\u0900-\u0902\u0903\u093C\u0951-\u0954]/g;

// Base Devanagari char → sound id
const DEV_TO_ID: Record<string, string> = {
  "\u0905": "a",   "\u0906": "aa",  "\u0907": "i",   "\u0908": "ii",
  "\u0909": "u",   "\u090A": "uu",  "\u090F": "e",   "\u0910": "ai",
  "\u0913": "o",   "\u0914": "au",
  "\u0915": "ka",  "\u0916": "kha", "\u0917": "ga",  "\u0918": "gha", "\u0919": "nga",
  "\u091A": "ca",  "\u091B": "cha", "\u091C": "ja",  "\u091D": "jha", "\u091E": "nya",
  "\u091F": "tta", "\u0920": "ttha","\u0921": "dda", "\u0922": "ddha","\u0923": "nna",
  "\u0924": "ta",  "\u0925": "tha", "\u0926": "da",  "\u0927": "dha", "\u0928": "na",
  "\u092A": "pa",  "\u092B": "pha", "\u092C": "ba",  "\u092D": "bha", "\u092E": "ma",
  "\u092F": "ya",  "\u0930": "ra",  "\u0932": "la",  "\u0935": "va",
  "\u0936": "sha", "\u0937": "ssa", "\u0938": "sa",  "\u0939": "ha",
};

// Full Devanagari words that mr-IN ASR commonly returns for each sound
const DEV_WORD_MAP: Record<string, string> = {
  "\u0905": "a",  "\u0906": "aa", "\u0907": "i",  "\u0908": "ii",
  "\u0909": "u",  "\u090A": "uu", "\u090F": "e",  "\u0910": "ai",
  "\u0913": "o",  "\u0914": "au",
  "\u0915": "ka",   "\u0915\u093E": "ka",  "\u0915\u093E\u092F": "ka",
  "\u0916": "kha",  "\u0916\u093E": "kha",
  "\u0917": "ga",   "\u0917\u093E": "ga",
  "\u0918": "gha",  "\u0918\u093E": "gha",
  "\u091A": "ca",   "\u091A\u093E": "ca",
  "\u091B": "cha",  "\u091B\u093E": "cha",
  "\u091C": "ja",   "\u091C\u093E": "ja",
  "\u091D": "jha",  "\u091D\u093E": "jha",
  "\u091F": "tta",  "\u091F\u093E": "tta",
  "\u0920": "ttha",
  "\u0921": "dda",  "\u0921\u093E": "dda",
  "\u0922": "ddha",
  "\u0924": "ta",   "\u0924\u093E": "ta",
  "\u0925": "tha",  "\u0925\u093E": "tha",
  "\u0926": "da",   "\u0926\u093E": "da",
  "\u0927": "dha",  "\u0927\u093E": "dha",
  "\u0928": "na",   "\u0928\u093E": "na",
  "\u092A": "pa",   "\u092A\u093E": "pa",
  "\u092B": "pha",  "\u092B\u093E": "pha",
  "\u092C": "ba",   "\u092C\u093E": "ba",
  "\u092D": "bha",  "\u092D\u093E": "bha",
  "\u092E": "ma",   "\u092E\u093E": "ma",
  "\u092F": "ya",   "\u092F\u093E": "ya",
  "\u0930": "ra",   "\u0930\u093E": "ra",
  "\u0932": "la",   "\u0932\u093E": "la",
  "\u0935": "va",   "\u0935\u093E": "va",
  "\u0936": "sha",  "\u0936\u093E": "sha",
  "\u0937": "ssa",  "\u0937\u093E": "ssa",
  "\u0938": "sa",   "\u0938\u093E": "sa",
  "\u0939": "ha",   "\u0939\u093E": "ha",
};

function tryDevanagari(token: string): string | null {
  // 1. Exact Devanagari word match
  if (DEV_WORD_MAP[token]) return DEV_WORD_MAP[token];
  // 2. Char-by-char scan
  for (const ch of token) {
    if (DEV_TO_ID[ch]) return DEV_TO_ID[ch];
  }
  // 3. Strip matras, scan again
  const stripped = token.replace(DEVANAGARI_MATRA_RE, "");
  for (const ch of stripped) {
    if (DEV_TO_ID[ch]) return DEV_TO_ID[ch];
  }
  return null;
}

// ── English phonetic map (Indian accent + common ASR mishearings) ─────────────

const SYLLABLE_MAP: Record<string, string> = {
  // Vowels — अ इ उ ए ऐ ओ औ आ ई ऊ
  a: "a", ah: "a", uh: "a", huh: "a", up: "a", um: "a",
  aa: "aa", aah: "aa", aar: "aa", aur: "aa", ar: "aa",
  i: "i", ih: "i",
  ee: "ii", sea: "ii", see: "ii",
  u: "u", oo: "u", book: "u", put: "u",
  ooh: "uu", moon: "uu", you: "uu",
  ay: "e", hey: "e", they: "e", e: "e",
  eye: "ai", aye: "ai", ai: "ai",
  oh: "o", o: "o", go: "o",
  ow: "au", now: "au", au: "au", ao: "au", out: "au",
  // क — aspirations of car/care/cut by Indian speakers
  ka: "ka", kaa: "ka", kuh: "ka", kya: "ka",
  car: "ka", care: "ka", cur: "ka", core: "ka", cot: "ka",
  cut: "ka", cup: "ka", call: "ka", col: "ka",
  // ख
  kha: "kha", khaa: "kha", khah: "kha",
  // ग
  ga: "ga", gaa: "ga", guh: "ga", gut: "ga", gun: "ga",
  gone: "ga", got: "ga", gum: "ga",
  // घ
  gha: "gha", ghaa: "gha",
  // ङ (nasal velar — rare)
  nga: "nga",
  // च
  ca: "ca", cha: "cha", chaa: "cha", ch: "cha",
  char: "cha", charm: "cha", chum: "cha", chha: "cha",
  // ज
  ja: "ja", jaa: "ja", juh: "ja", jar: "ja", jam: "ja",
  // झ
  jha: "jha", jhaa: "jha",
  // ञ
  nya: "nya",
  // ट
  tta: "tta", ttaa: "tta",
  // ठ
  ttha: "ttha", tthaa: "ttha",
  // ड
  dda: "dda", ddaa: "dda",
  // ढ
  ddha: "ddha", ddhaa: "ddha",
  // ण
  nna: "nna",
  // त (dental — softer than English t)
  ta: "ta", taa: "ta", tuh: "ta", tar: "ta", ton: "ta", tun: "ta",
  // थ (aspirated dental)
  tha: "tha", thaa: "tha", the: "tha", thar: "tha",
  // द
  da: "da", daa: "da", duh: "da", dun: "da", dub: "da",
  // ध
  dha: "dha", dhaa: "dha",
  // न
  na: "na", naa: "na", nuh: "na", nun: "na",
  // प
  pa: "pa", paa: "pa", puh: "pa", pub: "pa", pot: "pa",
  // फ
  pha: "pha", phaa: "pha", fa: "pha", far: "pha", fun: "pha",
  // ब
  ba: "ba", baa: "ba", buh: "ba", bub: "ba", but: "ba", bob: "ba",
  // भ
  bha: "bha", bhaa: "bha",
  // म
  ma: "ma", maa: "ma", muh: "ma", mum: "ma", mom: "ma", mop: "ma",
  // य
  ya: "ya", yaa: "ya", yuh: "ya", yar: "ya",
  // र
  ra: "ra", raa: "ra", ruh: "ra", run: "ra", rum: "ra",
  // ल
  la: "la", laa: "la", luh: "la", lum: "la", lot: "la",
  // व
  va: "va", vaa: "va", wa: "va", waa: "va", wuh: "va",
  // श
  sha: "sha", shaa: "sha", sh: "sha", she: "sha", show: "sha",
  // ष
  ssa: "ssa", ssaa: "ssa",
  // स
  sa: "sa", saa: "sa", suh: "sa", sun: "sa", sum: "sa", sob: "sa", sub: "sa",
  // ह
  ha: "ha", haa: "ha", hah: "ha", hum: "ha", hop: "ha", hot: "ha",
  // single-letter fallbacks
  k: "ka", g: "ga", c: "ca", j: "ja", t: "ta", d: "da",
  p: "pa", b: "ba", m: "ma", n: "na", r: "ra", l: "la",
  s: "sa", h: "ha", v: "va", y: "ya",
};

// ── Core detection function ───────────────────────────────────────────────────

function detectFromSpeech(raw: string): { sound: Sound; confidence: number; heard: string } {
  const rawTrimmed = raw.trim();

  // Pass 1 — Devanagari tokens (mr-IN / hi-IN ASR output)
  for (const token of rawTrimmed.split(/\s+/)) {
    const devId = tryDevanagari(token);
    if (devId) {
      const s = SOUNDS.find((x) => x.id === devId);
      if (s) return { sound: s, confidence: 0.97, heard: raw };
    }
  }

  // Pass 2 — English phonetics
  const t = rawTrimmed.toLowerCase().replace(/[^a-z ]/g, "").trim();
  const words = t.split(/\s+/).filter(Boolean);

  for (const word of words) {
    // 2a — exact sound id
    const byId = SOUNDS.find((s) => s.id === word);
    if (byId) return { sound: byId, confidence: 0.97, heard: raw };

    // 2b — IAST romanized
    for (const s of SOUNDS) {
      const plain = s.iast.replace(/[āīūṭḍṇśṣṅñṛ]/g, (c) => {
        const m: Record<string, string> = { ā: "aa", ī: "ii", ū: "uu", ṭ: "t", ḍ: "d", ṇ: "n", ś: "sh", ṣ: "sh", ṅ: "ng", ñ: "ny", ṛ: "ri" };
        return m[c] || c;
      });
      if (word === plain) return { sound: s, confidence: 0.95, heard: raw };
    }

    // 2c — syllable map
    const sid = SYLLABLE_MAP[word];
    if (sid) {
      const s = SOUNDS.find((x) => x.id === sid);
      if (s) return { sound: s, confidence: 0.85, heard: raw };
    }

    // 2d — word starts with a sound id
    const startsWith = SOUNDS.find((s) => word.startsWith(s.id));
    if (startsWith) return { sound: startsWith, confidence: 0.65, heard: raw };

    // 2e — sound id starts with word
    const idStartsWith = SOUNDS.find((s) => s.id.startsWith(word) && word.length >= 2);
    if (idStartsWith) return { sound: idStartsWith, confidence: 0.60, heard: raw };
  }

  // Pass 3 — first-char fallback on combined string
  if (t.length > 0) {
    const match = SOUNDS.find((s) => s.id[0] === t[0]) || SOUNDS.find((s) => s.iast[0] === t[0]);
    if (match) return { sound: match, confidence: 0.35, heard: raw };
  }

  return { sound: SOUNDS[0], confidence: 0.0, heard: "(no speech detected)" };
}

function detectBestFromAlternatives(alts: string[]): { sound: Sound; confidence: number; heard: string } {
  if (!alts || alts.length === 0) return { sound: SOUNDS[0], confidence: 0.0, heard: "(no speech detected)" };
  let best: { sound: Sound; confidence: number; heard: string } | null = null;
  for (const alt of alts) {
    if (!alt?.trim()) continue;
    const res = detectFromSpeech(alt);
    if (!best || res.confidence > best.confidence) best = res;
  }
  return best || { sound: SOUNDS[0], confidence: 0.0, heard: "(no speech detected)" };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SoundCell({ sound, selected, onSelect }: { sound: Sound; selected: boolean; onSelect: (s: Sound) => void }) {
  const color = GROUP_COLORS[sound.group] || "#555";
  return (
    <button
      onClick={() => onSelect(sound)}
      title={`${sound.iast} — ${sound.description}`}
      style={{
        borderColor: selected ? color : "transparent",
        backgroundColor: selected ? color + "18" : "transparent",
        color: selected ? color : "var(--foreground)",
        outline: selected ? `2px solid ${color}` : "none",
      }}
      className="w-full aspect-square flex flex-col items-center justify-center rounded transition-all duration-150 cursor-pointer border hover:border-current group"
    >
      <span className="text-2xl leading-none font-normal" style={{ fontFamily: "serif", color: selected ? color : "inherit" }}>
        {sound.devanagari}
      </span>
      <span className="text-[10px] mt-0.5 font-mono tracking-tight opacity-60 group-hover:opacity-100" style={{ color: selected ? color : "var(--muted-foreground)" }}>
        {sound.iast}
      </span>
    </button>
  );
}

function GroupSection({ group, sounds, selectedId, onSelect }: { group: string; sounds: Sound[]; selectedId: string | null; onSelect: (s: Sound) => void }) {
  const color = GROUP_COLORS[group] || "#555";
  const info = ARTICULATION_INFO[group];
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{group}</span>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>— {info?.en}</span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(sounds.length, 5)}, minmax(0,1fr))` }}>
        {sounds.map((s) => (
          <SoundCell key={s.id} sound={s} selected={selectedId === s.id} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function MouthDiagram({ group }: { group: ArticulationGroup }) {
  const regions: Record<string, number[]> = {
    "Kaṇṭhya":       [5],
    "Tālavya":       [3],
    "Mūrdhanya":     [2],
    "Dantya":        [1],
    "Oṣṭhya":        [0],
    "Kaṇṭhatālavya": [3, 5],
    "Kaṇṭhoṣṭhya":   [0, 5],
    "Dantōṣṭhya":    [0, 1],
    "Nāsikya":       [4],
  };
  const labels = ["Lips", "Teeth", "Palate", "Hard P.", "Nasal", "Throat"];
  const active = regions[group] || [];
  return (
    <div className="flex items-center gap-1 mt-2">
      {labels.map((l, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-[9px] font-semibold text-center leading-tight transition-all duration-200"
            style={{
              backgroundColor: active.includes(i) ? GROUP_COLORS[group] || "#555" : "var(--muted)",
              color: active.includes(i) ? "#fff" : "var(--muted-foreground)",
              border: active.includes(i) ? `2px solid ${GROUP_COLORS[group]}` : "2px solid transparent",
            }}
          >
            {l.replace(" ", "\n")}
          </div>
          <div className="w-0.5 h-2 rounded-full" style={{ backgroundColor: active.includes(i) ? GROUP_COLORS[group] : "var(--border)" }} />
        </div>
      ))}
    </div>
  );
}

type RecordingState = "idle" | "recording" | "processing" | "correct" | "try-again";

function ResultBadge({ state }: { state: RecordingState }) {
  if (state === "correct")
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold"
        style={{ backgroundColor: "#d4f0dc", color: "#1a6b35", border: "1px solid #9ddcb4" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="#1a6b35" fillOpacity=".15" />
          <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#1a6b35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Correct Pronunciation!
      </div>
    );
  if (state === "try-again")
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold"
        style={{ backgroundColor: "#fde8d8", color: "#b84c0a", border: "1px solid #f4b896" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="#b84c0a" fillOpacity=".15" />
          <path d="M8 5v4M8 11v.5" stroke="#b84c0a" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Try Again — Listen carefully and retry
      </div>
    );
  return null;
}

// ── Live Waveform Bars ─────────────────────────────────────────────────────────

function LiveWaveform({ active, levels }: { active: boolean; levels: number[] }) {
  const bars = [0.3, 0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.5, 0.3, 0.4, 0.6, 0.8, 0.6, 0.4, 0.3];
  return (
    <div className="flex items-center justify-center gap-[3px]" style={{ height: 48 }}>
      {bars.map((base, i) => {
        const liveLevel = levels[i % levels.length] ?? 0;
        const h = active ? Math.max(base * 0.4, liveLevel) : base * 0.25;
        return (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: 3,
              height: `${Math.min(100, h * 100)}%`,
              backgroundColor: active ? "var(--primary)" : "var(--border)",
              transition: active ? "height 0.08s ease" : "height 0.3s ease",
              animationDelay: `${i * 0.07}s`,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Voice Detector (Google Live-style, fully fixed) ────────────────────────────

type ListenState = "idle" | "requesting" | "listening" | "processing" | "done" | "error";

interface DetectResult {
  sound: Sound;
  confidence: number;
  heard: string;
}

// Language cascade for best Sanskrit/Marathi recognition
const LANG_CASCADE = ["mr-IN", "hi-IN", "en-IN", "en-US"];

function VoiceDetector() {
  const [listenState, setListenState] = useState<ListenState>("idle");
  const [result, setResult] = useState<DetectResult | null>(null);
  const [liveText, setLiveText] = useState("");
  const [silenceMsg, setSilenceMsg] = useState(false);
  const [waveLevels, setWaveLevels] = useState<number[]>(Array(15).fill(0));
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [autoMode, setAutoMode] = useState(false);
  const [history, setHistory] = useState<DetectResult[]>([]);

  const resultCardRef = useRef<HTMLDivElement | null>(null);

  const recogRef = useRef<SpeechRecognition | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false); // guards against double-fire
  const langIndexRef = useRef(0);
  const autoRestartRef = useRef(false);
  const liveTextRef = useRef(""); // always has latest transcript (no stale closure)

  // ── Audio visualizer ──────────────────────────────────────────────────────
  function startVisualizer(stream: MediaStream) {
    try {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      function draw() {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const levels: number[] = [];
        const step = Math.floor(data.length / 15);
        for (let i = 0; i < 15; i++) {
          const val = (data[i * step] || 0) / 255;
          levels.push(val);
        }
        setWaveLevels(levels);
        rafRef.current = requestAnimationFrame(draw);
      }
      draw();
    } catch (_) { /* ignore */ }
  }

  function stopVisualizer() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch (_) {} }
    analyserRef.current = null;
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch (_) {} }
    audioCtxRef.current = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setWaveLevels(Array(15).fill(0));
  }

  // ── Silence timer ─────────────────────────────────────────────────────────
  function clearSilenceTimer() {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }

  function resetSilenceTimer() {
    clearSilenceTimer();
    setSilenceMsg(false);
    silenceTimerRef.current = setTimeout(() => {
      setSilenceMsg(true);
    }, 6000);
  }

  // ── Elapsed counter ───────────────────────────────────────────────────────
  function startElapsed() {
    setElapsed(0);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }

  function stopElapsed() {
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
  }

  // ── Speak result ─────────────────────────────────────────────────────────
  function speakResult(res: DetectResult) {
    if (!res || res.confidence < 0.1) return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    function doSpeak() {
      const text = `I detected the Sanskrit sound "${res.sound.iast}". It is a ${res.sound.type === "vowel" ? "vowel, called Svara" : "consonant, called Vyanjana"}. The articulation group is ${res.sound.group}. ${ARTICULATION_INFO[res.sound.group]?.tip || ""}`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.pitch = 1.2;
      utter.rate = 0.9;
      utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((v) => /en/i.test(v.lang) && /female|girl|zira|samantha|karen|victoria|moira|fiona|google us english/i.test(v.name))
        || voices.find((v) => /en/i.test(v.lang));
      if (v) utter.voice = v;
      window.speechSynthesis.speak(utter);
    }
    if (window.speechSynthesis.getVoices().length > 0) doSpeak();
    else { window.speechSynthesis.onvoiceschanged = () => { doSpeak(); window.speechSynthesis.onvoiceschanged = null; }; setTimeout(doSpeak, 200); }
  }

  // ── Show result ───────────────────────────────────────────────────────────
  function showResult(res: DetectResult) {
    if (activeRef.current) return; // already done
    activeRef.current = true;
    stopElapsed();
    clearSilenceTimer();
    setSilenceMsg(false);

    setListenState("processing");
    setTimeout(() => {
      stopVisualizer();
      setResult(res);
      setListenState("done");
      if (res.confidence > 0.1) {
        speakResult(res);
        setHistory((h) => [res, ...h].slice(0, 5));
      }
      // auto-scroll to result card smoothly
      setTimeout(() => {
        resultCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
      // auto-restart after 3s only if auto mode is on
      if (autoRestartRef.current) {
        setTimeout(() => {
          if (autoRestartRef.current) startListening();
        }, 3000);
      }
    }, 500);
  }

  // ── Start listening ───────────────────────────────────────────────────────
  function startListening() {
    activeRef.current = false;
    setResult(null);
    liveTextRef.current = "";
    setLiveText("");
    setSilenceMsg(false);
    setErrorMsg("");
    setListenState("requesting");

    const SRClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SRClass) {
      setErrorMsg("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      setListenState("error");
      return;
    }

    // Request mic for visualizer
    navigator.mediaDevices?.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        streamRef.current = stream;
        startVisualizer(stream);
      })
      .catch(() => { /* visualizer optional */ });

    const lang = LANG_CASCADE[langIndexRef.current % LANG_CASCADE.length];
    const recog: SpeechRecognition = new SRClass();
    recog.lang = lang;
    recog.continuous = false;       // one-shot per utterance — most reliable
    recog.interimResults = true;    // show live text while speaking
    recog.maxAlternatives = 10;     // more alternatives = better matching
    recogRef.current = recog;

    recog.onstart = () => {
      setListenState("listening");
      startElapsed();
      resetSilenceTimer();
    };

    recog.onspeechstart = () => {
      setSilenceMsg(false);
      clearSilenceTimer();
    };

    recog.onspeechend = () => {
      // speech ended — recognition will fire onresult soon
      clearSilenceTimer();
    };

    recog.onresult = (e: SpeechRecognitionEvent) => {
      clearSilenceTimer();
      setSilenceMsg(false);

      // Collect all alternatives across all results
      const alts: string[] = [];
      let hasFinal = false;

      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) hasFinal = true;
        for (let j = 0; j < r.length; j++) {
          const t = r[j].transcript?.trim();
          if (t && !alts.includes(t)) alts.push(t);
        }
      }

      // Show live text from best alternative (also update ref for onend)
      if (alts[0]) { liveTextRef.current = alts[0]; setLiveText(alts[0]); }

      if (hasFinal && !activeRef.current) {
        try { recog.stop(); } catch (_) {}
        const res = detectBestFromAlternatives(alts);
        showResult(res);
      }
    };

    recog.onend = () => {
      // If we got onend without a final result, use whatever interim we have
      if (!activeRef.current) {
        const alts = liveTextRef.current ? [liveTextRef.current] : [];
        const res = detectBestFromAlternatives(alts.length > 0 ? alts : [""]);
        showResult(res);
      }
    };

    recog.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed") {
        stopVisualizer();
        stopElapsed();
        setErrorMsg("❌ Microphone access denied. Please allow microphone in browser settings and refresh.");
        setListenState("error");
        return;
      }
      if (e.error === "no-speech") {
        // Try next language in cascade silently
        if (!activeRef.current) {
          langIndexRef.current = (langIndexRef.current + 1) % LANG_CASCADE.length;
          setSilenceMsg(true);
        }
        return;
      }
      if (e.error === "network") {
        // Offline — try next lang or show error
        if (!activeRef.current) {
          stopVisualizer(); stopElapsed();
          setErrorMsg("Network error. Check your internet connection for speech recognition.");
          setListenState("error");
        }
        return;
      }
    };

    // Hard timeout — 10s max
    setTimeout(() => {
      if (!activeRef.current) {
        try { recog.stop(); } catch (_) {}
      }
    }, 10000);

    try { recog.start(); } catch (err) {
      setErrorMsg("Could not start microphone. Make sure you have a working mic and try again.");
      setListenState("error");
    }
  }

  // ── Stop listening ────────────────────────────────────────────────────────
  function stopListening() {
    autoRestartRef.current = false;
    try { recogRef.current?.stop(); } catch (_) {}
    stopVisualizer();
    stopElapsed();
    clearSilenceTimer();
    window.speechSynthesis?.cancel();
    setListenState("idle");
    setLiveText("");
    setSilenceMsg(false);
    activeRef.current = false;
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function reset() {
    stopListening();
    setResult(null);
    setErrorMsg("");
    setElapsed(0);
  }

  useEffect(() => {
    return () => { stopListening(); };
  }, []);

  const isListening = listenState === "listening";
  const isRequesting = listenState === "requesting";
  const isProcessing = listenState === "processing";
  const isDone = listenState === "done";
  const isError = listenState === "error";
  const isIdle = listenState === "idle";

  const accentCol = result ? GROUP_COLORS[result.sound.group] || "var(--primary)" : "var(--primary)";

  return (
    <section style={{ borderTop: "1px solid var(--border)", background: "var(--background)" }}>
      {/* Section header */}
      <div style={{ padding: "40px 24px 0", maxWidth: 800, margin: "0 auto" }}>
        <div className="flex items-center gap-3 mb-2">
          <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
          <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, whiteSpace: "nowrap", padding: "0 12px" }}>
            🎙 Live Voice Detection
          </h2>
          <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
        </div>
        <p style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, marginBottom: 24 }}>
          Speak any Sanskrit sound — <strong>क ka, ख kha, अ a, इ i, ग ga, त ta…</strong><br />
          The system detects it instantly and reads the result aloud.
        </p>
      </div>

      {/* Main voice card */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 40px" }}>
        <div className="voice-card" style={{
          borderRadius: 20,
          border: `1px solid ${isListening ? "var(--primary)" : "var(--border)"}`,
          background: "var(--card)",
          padding: 28,
          boxShadow: isListening
            ? "0 0 0 3px var(--primary)20, 0 8px 40px rgba(184,76,10,0.12)"
            : "0 4px 24px rgba(0,0,0,0.06)",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}>

          {/* Auto-mode toggle */}
          <div className="flex items-center justify-between mb-5">
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Recognition Mode
            </div>
            <button
              onClick={() => { autoRestartRef.current = !autoMode; setAutoMode((v) => !v); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "4px 14px",
                borderRadius: 20, border: "1px solid var(--border)", cursor: "pointer",
                background: autoMode ? "var(--primary)" : "var(--secondary)",
                color: autoMode ? "#fff" : "var(--secondary-foreground)",
                fontSize: 12, fontWeight: 600, transition: "all 0.2s",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: autoMode ? "#fff" : "var(--muted-foreground)", display: "inline-block" }} />
              {autoMode ? "🔄 Auto (keeps listening)" : "Manual (one shot)"}
            </button>
          </div>

          {/* Waveform visualization */}
          <div style={{
            borderRadius: 12, background: "var(--muted)", padding: "16px 20px", marginBottom: 20,
            position: "relative", overflow: "hidden",
          }}>
            {(isListening) && (
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(90deg, var(--primary)08, var(--primary)12, var(--primary)08)",
                animation: "shimmer 2s ease-in-out infinite",
              }} />
            )}
            <LiveWaveform active={isListening} levels={waveLevels} />

            {/* State message overlay */}
            <div style={{ textAlign: "center", marginTop: 8, minHeight: 24 }}>
              {isIdle && (
                <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Tap the button below to start</span>
              )}
              {isRequesting && (
                <span style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>⏳ Requesting microphone…</span>
              )}
              {isListening && !silenceMsg && (
                <span style={{ color: "var(--primary)", fontSize: 13, fontWeight: 700 }}>
                  ● Listening… {elapsed}s — speak now!
                </span>
              )}
              {isListening && silenceMsg && (
                <span style={{ color: "#b84c0a", fontSize: 13, fontWeight: 600, animation: "fadeIn 0.4s ease" }}>
                  🔇 No speech detected — please speak louder or closer to mic
                </span>
              )}
              {isProcessing && (
                <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>⚙️ Analyzing your voice…</span>
              )}
              {isDone && result && (
                <span style={{ color: "#27ae60", fontSize: 13, fontWeight: 600 }}>✅ Detection complete — result below</span>
              )}
              {isError && (
                <span style={{ color: "#c0392b", fontSize: 13, fontWeight: 600 }}>{errorMsg}</span>
              )}
            </div>

            {/* Live transcript */}
            {(isListening || isProcessing) && liveText && (
              <div style={{
                marginTop: 8, background: "var(--background)", borderRadius: 8, padding: "6px 12px",
                fontFamily: "JetBrains Mono, monospace", fontSize: 13, textAlign: "center",
                color: "var(--foreground)", border: "1px solid var(--border)",
              }}>
                "{liveText}"
              </div>
            )}
          </div>

          {/* Big mic button */}
          <div className="flex flex-col items-center gap-4">
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isListening && (
                <>
                  <span style={{
                    position: "absolute", width: 140, height: 140, borderRadius: "50%",
                    background: "var(--primary)", opacity: 0.08,
                    animation: "ping 1.2s ease-out infinite",
                  }} />
                  <span style={{
                    position: "absolute", width: 120, height: 120, borderRadius: "50%",
                    background: "var(--primary)", opacity: 0.12,
                    animation: "ping 1.2s ease-out infinite 0.4s",
                  }} />
                </>
              )}
              <button
                onClick={() => {
                  if (isListening || isRequesting) { stopListening(); }
                  else if (isDone) { reset(); }
                  else { autoRestartRef.current = autoMode; startListening(); }
                }}
                disabled={isProcessing}
                style={{
                  width: 112, height: 112, borderRadius: "50%",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                  fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  border: "none", outline: "none",
                  background: isListening ? "#c0392b"
                    : isProcessing ? "var(--muted)"
                    : isDone ? "var(--secondary)"
                    : "var(--primary)",
                  color: isProcessing ? "var(--muted-foreground)"
                    : isDone ? "var(--secondary-foreground)"
                    : "#fff",
                  boxShadow: isListening
                    ? "0 0 0 4px #c0392b30, 0 8px 32px #c0392b50"
                    : isProcessing ? "none"
                    : "0 6px 28px rgba(184,76,10,0.4)",
                  transition: "all 0.25s ease",
                  transform: "scale(1)",
                }}
                onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)"; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                {isListening ? (
                  <>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect x="7" y="7" width="14" height="14" rx="3" fill="currentColor" />
                    </svg>
                    <span>STOP</span>
                  </>
                ) : isRequesting ? (
                  <>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" />
                    </svg>
                    <span>WAIT</span>
                  </>
                ) : isProcessing ? (
                  <>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" />
                    </svg>
                    <span>ANALYZING</span>
                  </>
                ) : isDone ? (
                  <>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <path d="M6 14l7 7 9-11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>AGAIN</span>
                  </>
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect x="10" y="3" width="8" height="15" rx="4" fill="currentColor" />
                      <path d="M5 14a9 9 0 0018 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="14" y1="23" x2="14" y2="27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="10" y1="27" x2="18" y2="27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>TAP &amp; SPEAK</span>
                  </>
                )}
              </button>
            </div>

            {/* Keyboard shortcut hint */}
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
              {isIdle || isDone ? "Tap the button above, then speak a Sanskrit sound" : isListening ? "Speak clearly into your microphone" : ""}
            </p>
          </div>
        </div>

        {/* Result card */}
        {isDone && result && result.confidence > 0 && (
          <div
            ref={resultCardRef}
            style={{
              marginTop: 20, borderRadius: 20, padding: 24,
              border: `2px solid ${accentCol}40`,
              background: `linear-gradient(135deg, var(--card) 0%, ${accentCol}06 100%)`,
              boxShadow: `0 4px 32px ${accentCol}18`,
              animation: "slideUp 0.4s ease",
            }}
          >
            {/* Big character display */}
            <div className="flex items-center gap-5 mb-5">
              <div style={{
                width: 100, height: 100, borderRadius: 16, flexShrink: 0,
                background: `linear-gradient(135deg, ${accentCol}18, ${accentCol}30)`,
                border: `2px solid ${accentCol}50`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 20px ${accentCol}20`,
              }}>
                <span style={{ fontFamily: "serif", fontSize: 52, color: accentCol, lineHeight: 1 }}>
                  {result.sound.devanagari}
                </span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: accentCol, marginTop: 2 }}>
                  {result.sound.iast}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    background: accentCol, color: "#fff",
                  }}>
                    {result.sound.type === "vowel" ? "Vowel — Svara" : "Consonant — Vyañjana"}
                  </span>
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    background: accentCol + "18", color: accentCol, border: `1px solid ${accentCol}40`,
                  }}>
                    {result.sound.group}
                  </span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{result.sound.description}</p>
                <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--muted-foreground)" }}>{result.sound.example}</p>
              </div>
            </div>

            {/* Info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Articulation", value: ARTICULATION_INFO[result.sound.group]?.en },
                { label: "Place", value: ARTICULATION_INFO[result.sound.group]?.place },
                { label: "Type", value: result.sound.type === "vowel" ? "Svara (Vowel)" : "Vyañjana (Consonant)" },
              ].map((item) => (
                <div key={item.label} style={{ background: "var(--muted)", borderRadius: 10, padding: "10px 12px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)", marginBottom: 2 }}>{item.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Articulation tip */}
            <div style={{
              background: accentCol + "0d", border: `1px solid ${accentCol}25`,
              borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13,
            }}>
              <span style={{ color: accentCol, marginRight: 6 }}>▶</span>
              {ARTICULATION_INFO[result.sound.group]?.tip}
            </div>

            {/* Confidence bar */}
            <div style={{ marginBottom: 14 }}>
              <div className="flex justify-between" style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Detection Confidence</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: accentCol }}>
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: "var(--muted)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 8, background: `linear-gradient(90deg, ${accentCol}cc, ${accentCol})`,
                  width: `${result.confidence * 100}%`, transition: "width 0.8s ease",
                }} />
              </div>
              {result.confidence < 0.5 && (
                <p style={{ fontSize: 11, marginTop: 4, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                  Low confidence — try saying clearly: <em>"ka", "ga", "ta", "a", "i", "sha"</em>
                </p>
              )}
            </div>

            {/* What was heard */}
            {result.heard && result.heard !== "(no speech detected)" && (
              <div style={{
                background: "var(--muted)", borderRadius: 8, padding: "6px 12px",
                fontFamily: "JetBrains Mono, monospace", fontSize: 12,
                color: "var(--muted-foreground)", marginBottom: 14,
              }}>
                Heard: "{result.heard}"
              </div>
            )}

            {/* Replay + actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => speakResult(result)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 10, background: "var(--primary)", color: "#fff",
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}
              >
                🔊 Replay Voice
              </button>
              <button
                onClick={() => { autoRestartRef.current = autoMode; startListening(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 10, background: "var(--secondary)", color: "var(--secondary-foreground)",
                  border: "1px solid var(--border)", cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}
              >
                🎙 Speak Again
              </button>
            </div>
          </div>
        )}

        {/* No speech result */}
        {isDone && result && result.confidence === 0 && (
          <div style={{
            marginTop: 20, borderRadius: 16, padding: 20,
            background: "#fff6f6", border: "1px solid #f4b8b8", color: "#b84c0a",
            fontSize: 14, textAlign: "center", animation: "slideUp 0.4s ease",
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔇</div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>No speech detected</p>
            <p style={{ color: "#c0392b", fontSize: 13 }}>
              Please speak clearly and closer to your microphone. Try saying <em>"ka", "a", "ta"</em>
            </p>
            <button
              onClick={() => { autoRestartRef.current = autoMode; startListening(); }}
              style={{
                marginTop: 12, padding: "8px 20px", borderRadius: 10,
                background: "var(--primary)", color: "#fff", border: "none",
                cursor: "pointer", fontWeight: 600, fontSize: 13,
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* History strip */}
        {history.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)", marginBottom: 8 }}>
              Recent Detections
            </p>
            <div className="flex gap-2 flex-wrap">
              {history.map((h, i) => {
                const c = GROUP_COLORS[h.sound.group] || "var(--primary)";
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                    borderRadius: 20, background: c + "14", border: `1px solid ${c}30`,
                  }}>
                    <span style={{ fontFamily: "serif", fontSize: 18, color: c }}>{h.sound.devanagari}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: c }}>{h.sound.iast}</span>
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{Math.round(h.confidence * 100)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<"vowels" | "consonants">("vowels");
  const [selected, setSelected] = useState<Sound | null>(null);
  const [recordState, setRecordState] = useState<RecordingState>("idle");
  const [hasPlayed, setHasPlayed] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const vowelGroups = groupSounds(SOUNDS, "vowel");
  const consonantGroups = groupSounds(SOUNDS, "consonant");
  const groups = tab === "vowels" ? vowelGroups : consonantGroups;

  function handleSelect(s: Sound) {
    setSelected(s);
    setRecordState("idle");
    setHasPlayed(false);
  }

  function handlePlayDemo() {
    if (!selected) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const text = selected.iast.replace(/[āīūṭḍṇśṣṅñṛ]/g, (c) => {
        const map: Record<string, string> = { ā: "aa", ī: "ii", ū: "oo", ṭ: "t", ḍ: "d", ṇ: "n", ś: "sh", ṣ: "sh", ṅ: "ng", ñ: "ny", ṛ: "ri" };
        return map[c] || c;
      });
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.65;
      utter.pitch = 1.1;
      window.speechSynthesis.speak(utter);
    }
    setHasPlayed(true);
  }

  async function handleRecord() {
    if (recordState === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as any;
      const ctx = new AudioCtx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let maxRms = 0;
      let rafId: number | null = null;
      function monitor() {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / data.length);
        if (rms > maxRms) maxRms = rms;
        rafId = requestAnimationFrame(monitor);
      }
      monitor();
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.onstop = () => {
        if (rafId) cancelAnimationFrame(rafId);
        try { ctx.close(); } catch (_) {}
        stream.getTracks().forEach((t) => t.stop());
        setRecordState("processing");
        if (maxRms < 0.02) {
          timerRef.current = setTimeout(() => setRecordState("try-again"), 600);
          return;
        }
        timerRef.current = setTimeout(() => {
          setRecordState(Math.random() > 0.4 ? "correct" : "try-again");
        }, 800);
      };
      mr.start();
      setRecordState("recording");
      timerRef.current = setTimeout(() => mr.stop(), 3000);
    } catch {
      alert("Microphone access denied. Please allow microphone access to record pronunciation.");
    }
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const accentColor = selected ? GROUP_COLORS[selected.group] || "var(--primary)" : "var(--primary)";

  return (
    <div className="min-h-full flex flex-col" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "#fff", boxShadow: "0 2px 8px rgba(184,76,10,0.3)" }}
          >
            ॐ
          </div>
          <div>
            <h1 className="text-lg leading-tight" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>
              Sanskrit Sound Trainer
            </h1>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Śikṣā — Classification &amp; Pronunciation Practice
            </p>
          </div>
        </div>
        <nav className="hidden sm:flex items-center gap-5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <a href="#chart" className="hover:text-foreground transition-colors">Sound Chart</a>
          <a href="#practice" className="hover:text-foreground transition-colors">Practice</a>
          <a href="#voice" className="hover:text-foreground transition-colors">Voice</a>
        </nav>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-0">

        {/* LEFT — Sound Chart Panel */}
        <aside
          id="chart"
          className="border-r overflow-y-auto p-5"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", maxHeight: "calc(100vh - 65px)" }}
        >
          {/* Tab switcher */}
          <div className="flex mb-5 rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            {(["vowels", "consonants"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelected(null); setRecordState("idle"); }}
                className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all duration-150"
                style={{
                  backgroundColor: tab === t ? "var(--primary)" : "transparent",
                  color: tab === t ? "var(--primary-foreground)" : "var(--muted-foreground)",
                }}
              >
                {t === "vowels" ? "Vowels (Svara)" : "Consonants (Vyañjana)"}
              </button>
            ))}
          </div>

          <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
            Select a sound from the chart below. Grouped by <em>articulation place</em>.
          </p>

          {Object.entries(groups).map(([group, sounds]) => (
            <GroupSection
              key={group}
              group={group}
              sounds={sounds}
              selectedId={selected?.id || null}
              onSelect={handleSelect}
            />
          ))}
        </aside>

        {/* RIGHT — Detail + Practice Panel */}
        <section
          id="practice"
          className="overflow-y-auto p-6 lg:p-10 flex flex-col gap-8"
          style={{ maxHeight: "calc(100vh - 65px)" }}
        >
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-20">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
                style={{ background: "linear-gradient(135deg, var(--muted), var(--secondary))", color: "var(--muted-foreground)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
              >
                अ
              </div>
              <h2 className="text-2xl" style={{ fontFamily: "Fraunces, serif", color: "var(--muted-foreground)" }}>
                Choose a sound to begin
              </h2>
              <p className="text-sm max-w-xs" style={{ color: "var(--muted-foreground)" }}>
                Select any Sanskrit vowel or consonant from the chart on the left to see its classification and practice pronunciation.
              </p>
            </div>
          ) : (
            <>
              {/* Sound Identity Card */}
              <div
                className="rounded-xl p-6 border flex flex-col sm:flex-row sm:items-start gap-6"
                style={{
                  backgroundColor: "var(--card)", borderColor: accentColor + "30",
                  boxShadow: `0 4px 24px ${accentColor}10`,
                  background: `linear-gradient(135deg, var(--card) 60%, ${accentColor}06)`,
                }}
              >
                <div
                  className="w-24 h-24 rounded-xl flex flex-col items-center justify-center shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}30)`,
                    border: `2px solid ${accentColor}40`,
                    boxShadow: `0 4px 16px ${accentColor}20`,
                  }}
                >
                  <span className="text-5xl leading-none" style={{ fontFamily: "serif", color: accentColor }}>{selected.devanagari}</span>
                  <span className="text-sm mt-1 font-mono" style={{ color: accentColor }}>{selected.iast}</span>
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: accentColor, color: "#fff" }}>
                      {selected.type === "vowel" ? "Svara — Vowel" : "Vyañjana — Consonant"}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: accentColor + "18", color: accentColor, border: `1px solid ${accentColor}40` }}>
                      {selected.group}
                    </span>
                  </div>
                  <h2 className="text-3xl mb-1" style={{ fontFamily: "Fraunces, serif" }}>
                    {selected.devanagari}&nbsp;
                    <span className="text-2xl" style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>{selected.iast}</span>
                  </h2>
                  <p className="text-sm mb-1">{selected.description}</p>
                  <p className="text-sm italic" style={{ color: "var(--muted-foreground)" }}>{selected.example}</p>
                </div>
              </div>

              {/* Articulation Info */}
              <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>
                  Articulation Analysis
                </h3>
                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  {[
                    { label: "Sanskrit Term",         value: selected.group },
                    { label: "English Name",           value: ARTICULATION_INFO[selected.group]?.en || "—" },
                    { label: "Place of Articulation",  value: ARTICULATION_INFO[selected.group]?.place || "—" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg p-3" style={{ backgroundColor: "var(--muted)" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "var(--muted-foreground)" }}>{item.label}</p>
                      <p className="text-sm font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm rounded-lg p-3 flex items-start gap-2"
                  style={{ backgroundColor: accentColor + "0d", border: `1px solid ${accentColor}20` }}>
                  <span style={{ color: accentColor }}>▶</span>
                  {ARTICULATION_INFO[selected.group]?.tip}
                </p>
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>Articulation Region</p>
                  <MouthDiagram group={selected.group} />
                </div>
              </div>

              {/* Pronunciation Practice */}
              <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted-foreground)" }}>
                  Pronunciation Practice
                </h3>
                <ol className="flex flex-col gap-4 mb-6">
                  {/* Step 1 — Listen */}
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: hasPlayed ? accentColor : "var(--muted)", color: hasPlayed ? "#fff" : "var(--muted-foreground)" }}>1</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">Listen to the correct pronunciation</p>
                      <button onClick={handlePlayDemo} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95"
                        style={{ backgroundColor: accentColor, color: "#fff" }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 2.5l9 4.5-9 4.5V2.5z" fill="currentColor" />
                        </svg>
                        Play Demo
                      </button>
                    </div>
                  </li>

                  {/* Step 2 — Record */}
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: ["recording", "processing", "correct", "try-again"].includes(recordState) ? accentColor : "var(--muted)",
                        color: ["recording", "processing", "correct", "try-again"].includes(recordState) ? "#fff" : "var(--muted-foreground)",
                      }}>2</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">Record your pronunciation</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <button onClick={handleRecord} disabled={recordState === "processing"}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 relative"
                          style={{
                            backgroundColor: recordState === "recording" ? "#c0392b" : recordState === "processing" ? "var(--muted)" : "var(--secondary)",
                            color: recordState === "recording" ? "#fff" : recordState === "processing" ? "var(--muted-foreground)" : "var(--secondary-foreground)",
                            cursor: recordState === "processing" ? "not-allowed" : "pointer",
                          }}>
                          {recordState === "recording" ? (
                            <><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#fff" }} />Stop Recording</>
                          ) : recordState === "processing" ? (
                            <><svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="25 10" /></svg>Analyzing…</>
                          ) : (
                            <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="4" fill="currentColor" /><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1" /></svg>{recordState === "idle" ? "Record" : "Try Again"}</>
                          )}
                        </button>
                        {recordState === "recording" && (
                          <span className="text-xs animate-pulse" style={{ color: "#c0392b" }}>● Recording (3s)</span>
                        )}
                      </div>
                    </div>
                  </li>

                  {/* Step 3 — Result */}
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: ["correct", "try-again"].includes(recordState) ? accentColor : "var(--muted)",
                        color: ["correct", "try-again"].includes(recordState) ? "#fff" : "var(--muted-foreground)",
                      }}>3</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">See your result</p>
                      {["correct", "try-again"].includes(recordState) ? (
                        <ResultBadge state={recordState} />
                      ) : (
                        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Result will appear here after recording.</p>
                      )}
                    </div>
                  </li>
                </ol>

                {recordState === "try-again" && (
                  <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: "#fff8f4", border: "1px solid #f4b896" }}>
                    <p className="font-semibold mb-1">Pronunciation Tip</p>
                    <p>{ARTICULATION_INFO[selected.group]?.tip}</p>
                    <p className="mt-1 italic" style={{ color: "var(--muted-foreground)" }}>
                      Try placing your tongue at the <strong>{ARTICULATION_INFO[selected.group]?.place}</strong> region before articulating.
                    </p>
                  </div>
                )}
              </div>

              {/* All Sounds in Same Group */}
              <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>
                  Other {selected.group} Sounds
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SOUNDS.filter((s) => s.group === selected.group && s.id !== selected.id).map((s) => (
                    <button key={s.id} onClick={() => handleSelect(s)}
                      className="px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1.5 transition-all duration-100 hover:border-current"
                      style={{ borderColor: "var(--border)", color: accentColor, backgroundColor: "transparent" }}>
                      <span className="text-base" style={{ fontFamily: "serif" }}>{s.devanagari}</span>
                      <span className="text-xs font-mono">{s.iast}</span>
                    </button>
                  ))}
                  {SOUNDS.filter((s) => s.group === selected.group && s.id !== selected.id).length === 0 && (
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No other sounds in this group.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Voice Detector Section */}
      <div id="voice">
        <VoiceDetector />
      </div>

      {/* Footer */}
      <footer
        id="about"
        className="border-t px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", backgroundColor: "var(--card)" }}
      >
        <span>Sanskrit Sound Classification &amp; Pronunciation Trainer</span>
        <span>Frontend: React · TypeScript · Tailwind CSS</span>
        <span style={{ fontFamily: "Fraunces, serif", fontStyle: "italic" }}>शिक्षा — Śikṣā (Phonetics)</span>
      </footer>
    </div>
  );
}
