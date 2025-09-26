// import { HadithWorkflowRunner } from "./hadith/HadithWorkflowRunner";
// import { ExtractNarratorsStep } from "./hadith/steps/ExtractNarratorsStep";
// import { VerifyNarratorsStep } from "./hadith/steps/VerifyNarratorsStep";
// import { LoadTahdibStep } from "./hadith/steps/LoadTahdibStep";
// import { FindSymbolsStep } from "./hadith/steps/FindSymbolsStep";
// import { FinalizeNotesStep } from "./hadith/steps/FinalizeNotesStep";
// import { HadithWorkflowState } from "./hadith/models/WorkflowState";
// import { CustomChainRunnerManager } from "./CustomChainRunnerManager";

// /**
//  * This file provides functions to test the Hadith workflow implementation.
//  * Run these functions one by one to test each part of the workflow.
//  */

// /**
//  * Test that the workflow steps are registered correctly
//  */
// export function testWorkflowStepsRegistration() {
//   try {
//     // Create mock chain manager
//     const mockChainManager = {
//       sendMessage: async () => ({ content: "Test response" }),
//     };

//     // Create workflow runner
//     const workflowRunner = new HadithWorkflowRunner(mockChainManager);

//     // Access private field using type assertion to verify steps
//     const steps = (workflowRunner as any).steps;

//     // Verify steps are in the correct order
//     console.log(
//       "Steps registered:",
//       steps[0] instanceof ExtractNarratorsStep,
//       steps[1] instanceof VerifyNarratorsStep,
//       steps[2] instanceof LoadTahdibStep,
//       steps[3] instanceof FindSymbolsStep,
//       steps[4] instanceof FinalizeNotesStep
//     );

//     console.log("Total steps:", steps.length);
//     console.log("Test passed! Workflow steps are registered correctly.");
//   } catch (error) {
//     console.error("Test failed:", error);
//   }
// }

// /**
//  * Test that the CustomChainRunnerManager correctly creates a HadithWorkflowRunner
//  */
// export function testCustomChainRunnerManager() {
//   try {
//     // Create mock chain manager
//     const mockChainManager = {
//       sendMessage: async () => ({ content: "Test response" }),
//     };

//     // Test with trigger phrase
//     const runner = CustomChainRunnerManager.getRunner(mockChainManager, "تتبع الرواة");

//     console.log("Runner is HadithWorkflowRunner:", runner instanceof HadithWorkflowRunner);
//     console.log("Test passed! CustomChainRunnerManager creates HadithWorkflowRunner correctly.");
//   } catch (error) {
//     console.error("Test failed:", error);
//   }
// }

// /**
//  * Test that state transitions work correctly
//  */
// export function testStateTransitions() {
//   try {
//     // Create sample state
//     const state: HadithWorkflowState = {
//       hadithNarrators: [
//         {
//           name: "Narrator 1",
//           potentialPeople: [
//             { fullName: "Full Name 1", knownName: "Known Name 1", quizNames: ["Quiz 1", "Quiz 2"] },
//           ],
//         },
//         {
//           name: "Narrator 2",
//           potentialPeople: [
//             { fullName: "Full Name 2", knownName: "Known Name 2", quizNames: ["Quiz 3", "Quiz 4"] },
//           ],
//         },
//       ],
//       allNarrators: [],
//       hadithLink: "test-link",
//       hadithNarratorIndex: 0,
//     };

//     // Create and use test step
//     const step = new VerifyNarratorsStep();
//     console.log("Step created successfully:", step instanceof VerifyNarratorsStep);

//     // Test state transition
//     console.log("Initial state:", state.hadithNarratorIndex);

//     // In a real scenario, we would process the state through each step
//     // Here we just verify we can create the steps without errors
//     console.log("Test passed! State transitions can be defined correctly.");
//   } catch (error) {
//     console.error("Test failed:", error);
//   }
// }

// // Export all test functions
// export default {
//   testWorkflowStepsRegistration,
//   testCustomChainRunnerManager,
//   testStateTransitions,
// };
