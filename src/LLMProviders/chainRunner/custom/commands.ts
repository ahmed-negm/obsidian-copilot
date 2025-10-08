import { ExplainWorkflowRunner } from "./workflows/ExplainWorkflowRunner";
import { ExtractNarratorsWorkflowRunner } from "./workflows/ExtractNarratorsWorkflowRunner";
import { TraceNarratorsWorkflowRunner } from "./workflows/TraceNarratorsWorkflowRunner";
import { COMMANDS } from "./constants";

export const commands = [
  {
    command: COMMANDS.EXPLAIN,
    workflow: ExplainWorkflowRunner,
  },
  {
    command: COMMANDS.EXTRACT_NARRATORS,
    workflow: ExtractNarratorsWorkflowRunner,
  },
  {
    command: COMMANDS.TRACE_NARRATORS,
    workflow: TraceNarratorsWorkflowRunner,
  },
];
