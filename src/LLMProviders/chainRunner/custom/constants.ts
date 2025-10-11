export const PATHS = {
  PROMPTS: "_extras/Prompt",
  TEMPLATES: "_extras/Templates",
  DATA: "_extras/Data",
  TAHDHIB_INDEX: "_extras/Data/Tahdhib.json",
  BUKHARI_HADITH: "Sunnah/صحيح البخاري",
  FIGURES: "Figures",
};

export const MSG_FOUND_NARRATOR =
  "✅ تم العثور على **{{narrator}}** في تهذيب الكمال [المجلد {{part}} - الصفحة {{page}}](https://shamela.ws/book/3722/{{shamelaIndex}})";
export const MSG_NARRATOR_NOT_FOUND =
  "لم يتم العثور على الراوي **{{narrator}}** في تهذيب الكمال. الرجاء التحقق من صحة الاسم .";
export const MSG_FOUND_STUDENT =
  "✅ تم العثور على **{{student}}** فيمن رووا عن **{{teacher}}** في  صحيح البخاري";
export const MSG_STUDENT_TEACHER_LOOKUP =
  "جاري البحث عن **{{student}}** فيمن رووا عن **{{teacher}}** في صحيح البخاري";
export const MSG_NARRATOR_FILE_EXISTS = "ملف الراوي موجود بالفعل، تخطي الإنشاء.";
export const MSG_NARRATOR_FILE_CREATED = "تم إنشاء ملف الراوي بنجاح.";
export const MSG_CHAIN_IS = "\nسند الحديث {{hadithLink}} هو:\n\n{{narrators}}\n";
export const MSG_NARRATOR_IDENTIFICATION_FAILED = "تعذر تحديد الراوي";
export const MSG_NO_NARRATORS_FOUND = "لم يتم العثور على أي رواة في نص الحديث.";

export const MSG_SEARCHING_NARRATORS = "سنبدأ الآن في البحث عن الرواة في تهذيب الكمال ...";
export const MSG_SEARCHING_NEXT_NARRATOR = "لننتقل إلى الراوي التالي في السلسلة...";

export const NARRATOR_IDENTIFICATION_FAILED = "لم أتمكن من تحديد راوٍ واحد بشكل قاطع للاسم";
export const START_CHAIN_QUIZ =
  "الآن، سنختبر معرفتك بسلسلة الرواة. اختر الشخص الذي يلي كل راوٍ في السلسلة.";
export const WORKFLOW_COMPLETE = "✅ اكتمل التحقق من جميع الرواة.";
export const WORKFLOW_STEP_FAILED = "❌ تم إيقاف السلسلة بسبب فشل في خطوة ما.";

export const BOOKS = [
  { symbol: "خ", name: "البخاري" },
  { symbol: "م", name: "مسلم" },
  { symbol: "ت", name: "الترمذي" },
  { symbol: "س", name: "النسائي" },
  { symbol: "ق", name: "ابن ماجه" },
  { symbol: "د", name: "أبي داود" },
] as const;

export const OTHERS = "Others";
export const STUDENTS_TITLE = "رَوَى عَنه:";
export const TEACHERS_TITLE = "رَوَى عن:";
export const CHECKMARKS = ["✔", "✓", "✅"];
export const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
