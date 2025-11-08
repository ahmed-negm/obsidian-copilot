export const BOOKS = [
  { symbol: "خ", name: "البخاري" },
  { symbol: "م", name: "مسلم" },
  { symbol: "ت", name: "الترمذي" },
  { symbol: "س", name: "النسائي" },
  { symbol: "ق", name: "ابن ماجه" },
  { symbol: "د", name: "أبي داود" },
] as const;

export const PATHS = {
  PROMPTS: "_extras/Prompt",
  TEMPLATES: "_extras/Templates",
  AI_KNOWLEDGE: "_extras/AI knowledge",
  DATA: "_extras/Data",
  BUKHARI: "Sunnah/صحيح البخاري/الأحاديث",
  FIGURES: "Figures",
  TAHDHIB_VAULT: "../Books/Tahdhib-al-Kamal",
  TEMP: "_extras/copilot-conversations",
};

export const MSG_FOUND_NARRATOR =
  "✔ تم العثور على **{{narrator}}** في تهذيب الكمال [المجلد {{part}} - الصفحة {{page}}](obsidian://open?vault=Tahdhib-al-Kamal&file=Figures/{{signed_name}})";
export const MSG_NARRATOR_NOT_FOUND_IN_TAHDIB =
  "❌ لم يتم العثور على الراوي **{{narrator}}** في تهذيب الكمال. ([بحث في الانترنت]({{search_link}}))";

export const MSG_FOUND_STUDENT =
  "✔ تم العثور على **{{student}}** فيمن رووا عن **{{teacher}}** في  صحيح البخاري";
export const MSG_NOT_FOUND_STUDENT =
  "❌ لم يتم العثور على **{{student}}** فيمن رووا عن **{{teacher}}** في  صحيح البخاري";
export const MSG_STUDENT_LOOKUP =
  "جاري البحث عن **{{student}}** فيمن رووا عن **{{teacher}}** في صحيح البخاري";

export const MSG_FOUND_TEACHER =
  "✔ تم العثور على **{{teacher}}** فيمن روى عنهم **{{student}}** في  صحيح البخاري";
export const MSG_NOT_FOUND_TEACHER =
  "❌ لم يتم العثور على **{{teacher}}** فيمن روى عنهم **{{student}}** في  صحيح البخاري";
export const MSG_TEACHER_LOOKUP =
  "جاري البحث عن **{{teacher}}** فيمن روى عنهم **{{student}}** في صحيح البخاري";

export const MSG_NARRATOR_FILE_EXISTS = "ملف الراوي موجود بالفعل، تخطي الإنشاء.";
export const MSG_NARRATOR_FILE_CREATED = "تم إنشاء ملف الراوي بنجاح.";
export const MSG_NARRATOR_FILE_NOT_FOUND_CREATING =
  "لم يتم العثور على الملف الخاص بهذا الراوي، جاري إنشاء الملف من بيانات تهذيب الكمال...";
export const MSG_CHAIN_IS = "\nسند الحديث {{hadithLink}} هو:\n\n{{narrators}}\n";
export const MSG_MULTIPLE_CHAINS_ARE = "عدد أسانيد الحديث {{hadithLink}} هو: {{isnad_count}}";
export const MSG_SINGLE_CHAIN_IS = "السند رقم  {{isnad_index}}:\n\n{{narrators}}\n";
export const MSG_NO_NARRATORS_FOUND = "لم يتم العثور على أي رواة في نص الحديث.";
export const MSG_SEARCHING_NARRATORS = "سنبدأ الآن في البحث عن الرواة في تهذيب الكمال ...";
export const MSG_SEARCHING_NEXT_NARRATOR = "لننتقل إلى الراوي التالي في السلسلة...";
export const MSG_NARRATOR_IDENTIFICATION_FAILED = "لم أتمكن من تحديد راوٍ واحد بشكل قاطع للاسم";
export const MSG_START_CHAIN_QUIZ = "الآن، سنختبر معرفتك بسلسلة الرواة.";
export const MSG_WORKFLOW_COMPLETE = "🎉 اكتمل التحقق من جميع الرواة.";
export const MSG_WORKFLOW_STEP_FAILED = "❌ تم إيقاف السلسلة بسبب فشل في خطوة ما.";
export const MSG_HADITH_CONTAINS_INTERNAL_LINKS =
  "الحديث {{hadithLink}} يحتوي على روابط داخلية، لذا لا يمكن استخراج الإسناد.";
