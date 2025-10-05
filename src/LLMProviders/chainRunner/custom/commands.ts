import { ExplainWorkflowRunner } from "./workflows/ExplainWorkflowRunner";
import { ExtractNarratorsWorkflowRunner } from "./workflows/ExtractNarratorsWorkflowRunner";
import { TraceNarratorsWorkflowRunnerV1 } from "./workflows/TraceNarratorsWorkflowRunnerV1";
import { TraceNarratorsWorkflowRunnerV2 } from "./workflows/TraceNarratorsWorkflowRunnerV2";

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
    workflow: TraceNarratorsWorkflowRunnerV1,
  },
  {
    command: "الرواة",
    workflow: TraceNarratorsWorkflowRunnerV2,
  },
];
