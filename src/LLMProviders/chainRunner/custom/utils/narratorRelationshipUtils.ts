import { NarratorInfo } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import { BOOKS, PATHS } from "../constants";
import {
  readVaultFile,
  findStudents,
  findTeachers,
  updateStudents,
  updateTeachers,
  updateVaultFile,
  extractJsonCodeBlock,
  getPromptTemplate,
  populateTemplate,
  getAIKnowledge,
} from "../utils";
import { HIGH_CONFIDENCE, LLMNarratorResponse } from "../steps/FindNarratorInTahdibIndexStep";

export type RelationshipType = "student" | "teacher";

export interface NarratorRelationshipContext {
  currentNarrator: NarratorInfo;
  targetNarrator: NarratorInfo;
  currentName: string;
  targetName: string;
  targetFullName: string;
  relationsToSearch: Array<{ id: number; name: string }>;
  relationshipType: RelationshipType;
}

/**
 * Builds context for narrator relationship searches (student-teacher relationships).
 * Handles both directions: finding students of a teacher or teachers of a student.
 */
export async function buildNarratorRelationshipContext(
  state: TraceNarratorsWorkflowState,
  relationshipType: RelationshipType
): Promise<NarratorRelationshipContext> {
  const isStudentSearch = relationshipType === "student";

  const currentNarrator = isStudentSearch ? state.currentNarratorInfo : state.currentNarratorInfo;
  const targetNarrator = isStudentSearch ? state.nextNarratorInfo : state.previousNarratorInfo;

  if (!currentNarrator || !targetNarrator) {
    throw new Error("Required narrator information not found");
  }

  const narratorBio = await readVaultFile(`${PATHS.FIGURES}/${currentNarrator.name}.md`);

  const existingRelations = isStudentSearch
    ? findStudents(narratorBio, BOOKS[0].name)
    : findTeachers(narratorBio, BOOKS[0].name);

  const relationsToSearch = existingRelations.includes("-- " + targetNarrator.name)
    ? []
    : existingRelations
        .filter((relation) => !relation.startsWith("-- "))
        .map((relation: string, index: number) => ({
          id: index,
          name: relation,
        }));

  return {
    currentNarrator,
    targetNarrator,
    currentName: isStudentSearch
      ? state.currentNarrator.expectedKnownName
      : state.currentNarrator.expectedKnownName,
    targetName: isStudentSearch
      ? state.nextNarrator.expectedKnownName
      : state.previousNarrator.expectedKnownName,
    targetFullName: isStudentSearch
      ? state.nextNarrator.expectedFullName
      : state.previousNarrator.expectedFullName,
    relationsToSearch,
    relationshipType,
  };
}

/**
 * Generates a search prompt for finding narrator relationships.
 */
export async function generateRelationshipSearchPrompt(
  context: NarratorRelationshipContext
): Promise<string> {
  const promptTemplate = await getPromptTemplate("FindNarratorInList");

  return populateTemplate(promptTemplate, {
    name_to_search: context.targetFullName,
    JSON: JSON.stringify(context.relationsToSearch, null, 2),
    KNOWLEDGE: await getAIKnowledge(BOOKS[0].name),
  });
}

/**
 * Extracts selected narrator from AI response with high confidence requirement.
 */
export function extractSelectedNarrator(response: string): LLMNarratorResponse | null {
  const parsed = extractJsonCodeBlock<LLMNarratorResponse[]>(response);

  if (!parsed || !Array.isArray(parsed)) {
    return null;
  }

  return parsed.find((result) => result.confidence === HIGH_CONFIDENCE) || null;
}

/**
 * Updates narrator biography with the relationship information.
 * Handles both student and teacher relationship updates.
 */
export async function updateNarratorRelationship(
  context: NarratorRelationshipContext,
  selectedRelationName: string
): Promise<void> {
  const filePath = `${PATHS.FIGURES}/${context.currentNarrator.name}.md`;
  const narratorBio = await readVaultFile(filePath);

  const updatedBio =
    context.relationshipType === "student"
      ? updateStudents(narratorBio, selectedRelationName, context.targetNarrator.name)
      : updateTeachers(narratorBio, selectedRelationName, context.targetNarrator.name);

  await updateVaultFile(filePath, updatedBio);
}
