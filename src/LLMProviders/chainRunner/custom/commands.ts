import { ExplainWorkflowRunner } from "./workflows/ExplainWorkflowRunner";
import { ExtractIsnadFromHadithWorkflowRunner } from "./workflows/ExtractIsnadFromHadithWorkflowRunner";
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
];
