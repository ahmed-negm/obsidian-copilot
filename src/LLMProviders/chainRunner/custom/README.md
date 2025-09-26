# Workflow-based Chain Runner Architecture

This folder contains a new workflow-based architecture for chain runners, designed to improve maintainability and extensibility.

## Directory Structure

```
custom/
├── base/               # Base classes and interfaces
│   ├── StepRunner.ts   # Interface for workflow steps
│   └── WorkflowRunner.ts # Base class for workflow runners
├── hadith/             # Domain-specific code for hadith workflows
│   ├── HadithWorkflowRunner.ts # Main hadith workflow runner
│   ├── models/         # Type definitions
│   │   ├── HadithNarrator.ts
│   │   ├── TahdibNarrator.ts
│   │   └── WorkflowState.ts
│   └── steps/          # Individual workflow steps
│       ├── ExtractNarratorsStep.ts
│       ├── VerifyNarratorsStep.ts
│       ├── LoadTahdibStep.ts
│       ├── FindSymbolsStep.ts
│       └── FinalizeNotesStep.ts
├── ui/                 # UI components
│   └── ChoiceSuggestModal.ts
└── utils/              # Utility functions
    ├── fileUtils.ts
    ├── formatUtils.ts
    ├── promptUtils.ts
    ├── scoreUtils.ts
    └── index.ts
```

## Key Components

### Base Architecture

- **StepRunner**: Interface for workflow steps with `formatInput` and `run` methods
- **WorkflowRunner**: Base class that orchestrates step execution and manages state

### Workflow State

The workflow state is maintained and passed between steps, allowing for:

- Data sharing between steps
- Clear state transitions
- Better error handling

### Steps

Each workflow consists of a series of steps, where each step:

- Formats the input for the LLM
- Processes the LLM response
- Updates the workflow state
- Returns the formatted output

## Hadith Workflow

The hadith workflow consists of the following steps:

1. **ExtractNarratorsStep**: Extracts narrators from hadith text
2. **VerifyNarratorsStep**: Verifies narrators against the database
3. **LoadTahdibStep**: Loads and processes Tahdhib content
4. **FindSymbolsStep**: Finds symbols and matches narrators in the chain
5. **FinalizeNotesStep**: Creates notes and runs quiz

## Usage

```typescript
// Create a workflow runner
const workflowRunner = new HadithWorkflowRunner(chainManager);

// Get a runner via the CustomChainRunnerManager
const runner = CustomChainRunnerManager.getRunner(chainManager, "تتبع الرواة");

// Resume a workflow from saved state
const resumedRunner = CustomChainRunnerManager.resumeWorkflow(chainManager, "hadith", savedState);
```

## Testing

Test functions are available in `testHadithWorkflow.ts` to verify the implementation works correctly.

## Benefits of the New Architecture

1. **Better Separation of Concerns**:

   - Each step has a single responsibility
   - State is clearly defined and shared between steps

2. **Improved Maintainability**:

   - Steps are easier to understand and modify
   - Less coupling between components

3. **Enhanced Extensibility**:

   - Easy to add new steps or modify existing ones
   - Workflow can be extended with minimal changes

4. **Better Error Handling**:
   - Each step can handle errors independently
   - State transitions are more explicit
