// import { WorkflowRunner } from "./../base/WorkflowRunner";
// import { StepRunner } from "./../base/StepRunner";
// import { TraceNarratorsWorkflowState } from "../models/WorkflowState";
// import { ExtractNarratorsStep } from "../steps/ExtractNarratorsStep";
// import { VerifyNarratorsStep } from "../steps/VerifyNarratorsStep";
// import { LoadTahdibStep } from "../steps/LoadTahdibStep";
// import { FindSymbolsStep } from "../steps/FindSymbolsStep";
// import { FinalizeNotesStep } from "../steps/FinalizeNotesStep";
// import { readVaultFile } from "./../utils/fileUtils";
// import { NarratorInfo } from "../models/HadithNarrator";

// /**
//  * Main workflow runner for hadith tracing
//  */
// export class TraceNarratorsWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
//   /**
//    * Trigger phrase to activate this workflow
//    */
//   static trigger = "تتبع الرواة";

//   /**
//    * Create a new hadith workflow runner
//    * @param chainManager The chain manager instance
//    * @param initialState Optional initial state for the workflow
//    */
//   constructor(chainManager: any, initialState?: Partial<TraceNarratorsWorkflowState>) {
//     super(chainManager, {
//       hadithNarrators: [],
//       allNarrators: [],
//       hadithLink: "",
//       executeNextStep: true,
//       reverseHadithNarrators: true,
//       hadithNarratorIndex: 0,
//       ...initialState,
//     });

//     // If execute next step is true, load the narrators data
//     if (this.state.executeNextStep) {
//       this.loadNarratorsData();
//     }
//   }

//   /**
//    * Load narrators data from the vault
//    */
//   private async loadNarratorsData(): Promise<void> {
//     try {
//       const jsonString = await readVaultFile("_extras/Data/Tahdhib.json");
//       this.state.allNarrators = JSON.parse(jsonString) as NarratorInfo[];
//     } catch (error) {
//       console.error("Failed to load narrators data:", error);
//     }
//   }

//   /**
//    * Register steps for this workflow
//    * @returns Array of step runners
//    */
//   protected registerSteps(): StepRunner<TraceNarratorsWorkflowState>[] {
//     return [
//       new ExtractNarratorsStep(),
//       new VerifyNarratorsStep(),
//       new LoadTahdibStep(),
//       new FindSymbolsStep(),
//       new FinalizeNotesStep(),
//     ];
//   }
// }
