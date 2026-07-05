import type { NextApiRequest, NextApiResponse } from 'next';
import { analyzeResumeMatch } from '../../utils/matchResumeToJD';

type ErrorResponse = {
  success: false;
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    } as ErrorResponse);
  }

  try {
    const { resumeText, jobDesc } = req.body;

    // Input validation
    if (!resumeText || !jobDesc) {
      return res.status(400).json({
        success: false,
        error: 'Both resumeText and jobDesc are required'
      } as ErrorResponse);
    }

    if (typeof resumeText !== 'string' || typeof jobDesc !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Both resumeText and jobDesc must be strings'
      } as ErrorResponse);
    }

    // Process the request
    const result = await analyzeResumeMatch(resumeText, jobDesc);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to analyze resume'
      } as ErrorResponse);
    }

    // Return successful response
    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error processing resume analysis request:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as ErrorResponse);
  }
} 