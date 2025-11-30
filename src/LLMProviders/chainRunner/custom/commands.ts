import { ExplainWorkflowRunner } from "./workflows/ExplainWorkflowRunner";
import { ExtractIsnadFromHadithWorkflowRunner } from "./workflows/ExtractIsnadFromHadithWorkflowRunner";
import { ExtractQuranRunner } from "./workflows/ExtractQuranRunner";
import { ListUnprocessedHadithsRunner } from "./workflows/ListUnprocessedHadithsRunner";
import { MohadithDictionaryRunner } from "./workflows/MohadithDictionaryRunner";
import { TraceNarratorsWorkflowRunner } from "./workflows/TraceNarratorsWorkflowRunner";

export const commands = [
  {
    command: "أشرح",
    workflow: ExplainWorkflowRunner,
  },
  {
    command: "استخرج الرواة",
    workflow: ExtractIsnadFromHadithWorkflowRunner,
  },
  {
    command: "تتبع الرواة",
    workflow: TraceNarratorsWorkflowRunner,
  },
  {
    command: "قائمة الأحاديث غير المعالجة",
    workflow: ListUnprocessedHadithsRunner,
  },
  {
    command: "معجم المحدثين",
    workflow: MohadithDictionaryRunner,
  },
  {
    command: "استخرج القرآن",
    workflow: ExtractQuranRunner,
  },
];
