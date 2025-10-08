import { ExplainWorkflowRunner } from "./workflows/ExplainWorkflowRunner";
import { ExtractNarratorsWorkflowRunner } from "./workflows/ExtractNarratorsWorkflowRunner";
import { TraceNarratorsWorkflowRunner } from "./workflows/TraceNarratorsWorkflowRunner";

export const commands = [
  {
    command: "أشرح",
    workflow: ExplainWorkflowRunner,
  },
  {
    command: "استخرج الرواة",
    workflow: ExtractNarratorsWorkflowRunner,
  },
  {
    command: "تتبع الرواة",
    workflow: TraceNarratorsWorkflowRunner,
  },
];
