import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { getDeepseekModel } from "./deepseekModel";

// Define the output schema for the model's response
export const outputSchema = z.object({
  matchScore: z.number().min(0).max(100).describe("Match score between 0 and 100"),
  missingSkills: z.array(z.string()).describe("List of skills missing from the resume but required in the job description"),
  suggestions: z.array(z.string()).describe("List of suggestions to improve the resume for this job")
});

export type MatchResult = z.infer<typeof outputSchema>;

// Create a parser that will validate and type the model output
const outputParser = StructuredOutputParser.fromZodSchema(outputSchema);

// Create a prompt template with instructions
const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert resume analyzer. You'll compare a resume to a job description and provide detailed feedback.

Resume:
{resumeText}

Job Description:
{jobDesc}

Based on the resume and job description above, analyze the match between them. Provide:
1. A match score between 0 and 100, where 0 means no match and 100 means perfect match.
2. A list of key skills or qualifications mentioned in the job description that are missing from the resume.
3. Specific suggestions to improve the resume to better match this job description.

${outputParser.getFormatInstructions()}
`);

// Create a function to use the chain with type safety
export async function analyzeResumeMatch(resumeText: string, jobDesc: string): Promise<{ 
  success: boolean;
  data?: MatchResult;
  error?: string;
}> {
  try {
    // Initialize the model
    const model = getDeepseekModel();
    
    const prompt = await promptTemplate.format({
      resumeText,
      jobDesc
    });
    const response = await model.invoke(prompt);
    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
    const result = await outputParser.parse(content);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error("Error analyzing resume match:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
} 
