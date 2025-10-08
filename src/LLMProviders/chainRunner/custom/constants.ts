// Command strings for workflows
export const COMMANDS = {
  EXPLAIN: "أشرح",
  EXTRACT_NARRATORS: "استخرج الرواة",
  TRACE_NARRATORS: "تتبع الرواة",
};
// Paths
export const PATHS = {
  PROMPTS: "_extras/Prompt",
  TEMPLATES: "_extras/Templates",
  DATA: "_extras/Data",
  TAHDHIB_INDEX: "_extras/Data/Tahdhib.json",
  BUKHARI_HADITH: "Sunnah/صحيح البخاري",
  NEW_FIGURES: "NewFigures",
};

// File extensions
export const FILE_EXTENSIONS = {
  MARKDOWN: ".md",
  JSON: ".json",
};

// Template names
export const TEMPLATES = {
  SYSTEM: "SystemPrompt",
  EXTRACT_NARRATORS: "ExtractNarrators",
  MOHADITH: "Mohadith",
};

// User interface messages
export const UI_MESSAGES = {
  WORKFLOW_COMPLETE: "✅ اكتمل التحقق من جميع الرواة.",
  WORKFLOW_STEP_FAILED: "❌ تم إيقاف السلسلة بسبب فشل في خطوة ما.",
  NARRATOR_IDENTIFICATION_FAILED: "لم أتمكن من تحديد راوٍ واحد بشكل قاطع للاسم",
};
/**
 * Centralized file for all magic strings used in the custom workflow code.
 * Update this file to add, remove, or change any repeated string literal.
 */

// UI/response messages
export const MSG_FOUND_NARRATOR =
  "✅ تم العثور على **{student}** فيمن رووا عن **{teacher}** في  صحيح البخاري";
export const MSG_FOUND_NARRATOR_SELF =
  "✅ تم العثور على **{narrator}** فيمن رووا عن **{teacher}** في  صحيح البخاري";
export const MSG_NARRATOR_FILE_EXISTS = "ملف الراوي موجود بالفعل، تخطي الإنشاء.";
export const MSG_NARRATOR_FILE_CREATED = "تم إنشاء ملف الراوي بنجاح.";
export const MSG_CHAIN_IS = "\nسند الحديث {hadithLink} هو:\n\n{narrators}\n";
export const MSG_NARRATOR_IDENTIFICATION_FAILED = "تعذر تحديد الراوي";

// Book names and symbols
export const BOOKS = [
  { symbol: "خ", name: "البخاري" },
  { symbol: "م", name: "مسلم" },
  { symbol: "ت", name: "الترمذي" },
  { symbol: "س", name: "النسائي" },
  { symbol: "ق", name: "ابن ماجه" },
  { symbol: "د", name: "أبي داود" },
] as const;

// Miscellaneous
export const OTHERS = "Others";
export const STUDENTS_TITLE = "رَوَى عَنه:";
export const TEACHERS_TITLE = "رَوَى عن:";
export const CHECKMARKS = ["✔", "✓", "✅"];
export const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
