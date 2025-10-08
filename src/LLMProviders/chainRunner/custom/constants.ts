/**
 * Constants for the custom chain runner
 */
export const PATHS = {
  /** Base path for prompt templates */
  PROMPTS: "_extras/Prompt",

  /** Base path for templates */
  TEMPLATES: "_extras/Templates",

  /** Base path for data files */
  DATA: "_extras/Data",

  /** Path to the Tahdhib index file */
  TAHDHIB_INDEX: "_extras/Data/Tahdhib.json",

  /** Base path for Bukhari hadiths */
  BUKHARI_HADITH: "Sunnah/صحيح البخاري",

  /** Base path for new figure notes */
  NEW_FIGURES: "NewFigures",
};

/**
 * File extensions
 */
export const FILE_EXTENSIONS = {
  /** Markdown extension */
  MARKDOWN: ".md",

  /** JSON extension */
  JSON: ".json",
};

/**
 * Template names
 */
export const TEMPLATES = {
  /** System prompt template */
  SYSTEM: "SystemPrompt",

  /** Extract narrators template */
  EXTRACT_NARRATORS: "ExtractNarrators",

  /** Mohadith template */
  MOHADITH: "Mohadith",
};

/**
 * User interface messages
 */
export const UI_MESSAGES = {
  /** Workflow completed successfully */
  WORKFLOW_COMPLETE: "✅ اكتمل التحقق من جميع الرواة.",

  /** Workflow step failed */
  WORKFLOW_STEP_FAILED: "❌ تم إيقاف السلسلة بسبب فشل في خطوة ما.",

  /** Narrator identification failed */
  NARRATOR_IDENTIFICATION_FAILED: "لم أتمكن من تحديد راوٍ واحد بشكل قاطع للاسم",
};

/**
 * Commands
 */
export const COMMANDS = {
  /** Explain command */
  EXPLAIN: "أشرح",

  /** Extract narrators command */
  EXTRACT_NARRATORS: "استخرج الرواة",

  /** Trace narrators command */
  TRACE_NARRATORS: "تتبع الرواة",
};
