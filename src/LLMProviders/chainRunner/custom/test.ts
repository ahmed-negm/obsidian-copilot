// import { HadithWorkflowRunner, CustomChainRunnerManager } from "./index";

// /**
//  * This is a sample test file to verify that the refactored code works correctly.
//  * In a real-world scenario, you would use a proper testing framework like Jest.
//  */

// async function testWorkflow() {
//   try {
//     // Create a mock chain manager
//     const mockChainManager = {
//       sendMessage: async (message: string) => {
//         console.log("Sending message:", message);
//         return { content: "Test response" };
//       },
//     };

//     // Test creating a workflow runner
//     const workflowRunner = new HadithWorkflowRunner(mockChainManager);
//     console.log("Successfully created workflow runner");

//     // Test custom chain runner manager
//     const runnerFromManager = CustomChainRunnerManager.getRunner(mockChainManager, "تتبع الرواة");
//     console.log(
//       "Successfully got runner from manager:",
//       runnerFromManager instanceof HadithWorkflowRunner
//     );

//     // Test resuming a workflow
//     const resumedRunner = CustomChainRunnerManager.resumeWorkflow(mockChainManager, "hadith", {
//       hadithNarrators: [],
//       allNarrators: [],
//       hadithLink: "test-link",
//     });
//     console.log("Successfully resumed workflow:", resumedRunner instanceof HadithWorkflowRunner);

//     console.log("All tests passed!");
//   } catch (error) {
//     console.error("Test failed:", error);
//   }
// }

// // Uncomment to run the test
// // testWorkflow();

// export default testWorkflow;
