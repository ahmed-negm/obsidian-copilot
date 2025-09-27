import { ExplainWorkflowRunner } from "./workflows/ExplainWorkflowRunner";
import { ExtractNarratorsWorkflowRunner } from "./workflows/ExtractNarratorsWorkflowRunner";

export const commands = [
  {
    command: "أشرح",
    workflow: ExplainWorkflowRunner,
  },
  {
    command: "استخرج الرواة",
    workflow: ExtractNarratorsWorkflowRunner,
  },
  // {
  //   command: "تتبع الرواة",
  //   workflow: TraceNarratorsWorkflowRunner,
  // },
];
