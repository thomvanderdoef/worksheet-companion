import { GoogleGenAI, Type } from "@google/genai";
import type { WorksheetQuestionContext } from "../content/worksheetSource";

export type ScanPhase = "empty" | "completed";

export type ScanIssueReason =
  | "blurry"
  | "partial_page"
  | "glare"
  | "too_far"
  | "too_close"
  | "cropped"
  | "handwriting_unclear"
  | "low_light"
  | "motion_blur"
  | "other";

export type ActivityType =
  | "quiz"
  | "graphic_organizer"
  | "worksheet"
  | "exit_ticket"
  | "reading_response"
  | "unknown";

export type ExpectedResponseType =
  | "multiple_choice"
  | "short_text"
  | "number"
  | "drawing"
  | "multi_part"
  | "unknown";

export type ResponseLegibility = "clear" | "partially_clear" | "unclear";
export type AnalysisConfidence = "high" | "medium" | "low";
export type AnalysisVerdict = "correct" | "incorrect" | "uncertain" | "incomplete";

export interface CaptureMetricsContext {
  captureMode: "auto" | "manual";
}

export interface WorksheetMetadata {
  name?: string;
  date?: string;
  unitOrLesson?: string;
  activityType: ActivityType;
  subject?: string;
  worksheetTitle?: string;
}

export interface WorksheetQuestion {
  id: string;
  label?: string;
  prompt: string;
  instructions?: string;
  expectedResponseType: ExpectedResponseType;
}

export interface WorksheetSection {
  id: string;
  title?: string;
  instructions?: string;
  questions: WorksheetQuestion[];
}

export interface WorksheetCompleteness {
  isFullPageVisible: boolean;
  missingAreas: string[];
  confidenceNote?: string;
}

export interface EmptyWorksheetData {
  metadata: WorksheetMetadata;
  studentTaskSummary: string;
  sections: WorksheetSection[];
  completeness: WorksheetCompleteness;
}

export interface StudentResponse {
  questionRef?: string;
  promptAnchor: string;
  studentAnswer: string;
  studentWorkDescription?: string;
  answered: boolean;
  legibility: ResponseLegibility;
  notes?: string;
}

export interface ResponseInsight {
  questionRef?: string;
  promptAnchor: string;
  expectedAnswer?: string;
  verdict: AnalysisVerdict;
  confidence: AnalysisConfidence;
  likelyMisconception?: string;
  evidence?: string;
  studentFeedback: string;
  teacherNote?: string;
}

export interface WorksheetFeedbackAnalysis {
  responseInsights: ResponseInsight[];
  strengths: string[];
  nextSteps: string[];
  caution?: string;
  textFeedback: string;
  voiceFeedback: string;
}

export interface CompletedWorksheetData {
  studentName?: string;
  responses: StudentResponse[];
  unmatchedMarks: string[];
  isGradingSafe: boolean;
  missingResponseAreas: string[];
  capturedPortionSummary?: string;
  completionNotes?: string;
  visualWorkSummary?: string;
  feedback?: string;
  score?: string;
  analysis?: WorksheetFeedbackAnalysis;
}

export interface ScanIssue {
  phase: ScanPhase;
  reason: ScanIssueReason;
  message: string;
}

export type EmptyWorksheetExtractionResult =
  | { outcome: "captured"; data: EmptyWorksheetData }
  | { outcome: "need_better_view"; issue: ScanIssue };

export type CompletedWorksheetExtractionResult =
  | { outcome: "captured"; data: CompletedWorksheetData }
  | { outcome: "need_better_view"; issue: ScanIssue };

interface ImagePayload {
  data: string;
  mimeType: string;
}

interface ExtractionContext {
  subject?: string;
  emptyWorksheet?: EmptyWorksheetData;
  answerKey?: WorksheetQuestionContext[];
  metrics?: CaptureMetricsContext;
}

interface ResponseInsightItem {
  questionRef?: string;
  verdict?: string;
  confidence?: string;
  likelyMisconception?: string;
  evidence?: string;
  studentFeedback?: string;
  teacherNote?: string;
}

interface FeedbackAnalysisResponse {
  responseInsights?: ResponseInsightItem[];
  strengths?: string[];
  nextSteps?: string[];
  caution?: string;
  textFeedback?: string;
  voiceFeedback?: string;
}

interface EmptyQuestionResponse {
  label?: string;
  prompt?: string;
  instructions?: string;
  expectedResponseType?: string;
}

interface EmptySectionResponse {
  title?: string;
  instructions?: string;
  questions?: EmptyQuestionResponse[];
}

interface EmptyExtractionResponse {
  outcome?: "captured" | "need_better_view";
  metadata?: {
    name?: string;
    date?: string;
    unitOrLesson?: string;
    activityType?: string;
    subject?: string;
    worksheetTitle?: string;
  };
  studentTaskSummary?: string;
  sections?: EmptySectionResponse[];
  completeness?: {
    isFullPageVisible?: boolean;
    missingAreas?: string[];
    confidenceNote?: string;
  };
  reason?: string;
  message?: string;
}

interface CompletedResponseItem {
  questionRef?: string;
  promptAnchor?: string;
  studentAnswer?: string;
  studentWorkDescription?: string;
  answered?: boolean;
  legibility?: string;
  notes?: string;
}

interface CompletedExtractionResponse {
  outcome?: "captured" | "need_better_view";
  studentName?: string;
  responses?: CompletedResponseItem[];
  unmatchedMarks?: string[];
  isGradingSafe?: boolean;
  missingResponseAreas?: string[];
  capturedPortionSummary?: string;
  completionNotes?: string;
  visualWorkSummary?: string;
  feedback?: string;
  score?: string;
  reason?: string;
  message?: string;
}

const NEED_BETTER_VIEW_FIELDS = {
  reason: {
    type: Type.STRING,
    enum: [
      "blurry",
      "partial_page",
      "glare",
      "too_far",
      "too_close",
      "cropped",
      "handwriting_unclear",
      "low_light",
      "motion_blur",
      "other",
    ],
    description: "Why the worksheet needs a better image.",
  },
  message: {
    type: Type.STRING,
    description: "Short kid-friendly guidance when a better image is needed.",
  },
} as const;

const EMPTY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    outcome: {
      type: Type.STRING,
      enum: ["captured", "need_better_view"],
      description: "Whether the worksheet image is readable enough to extract.",
    },
    metadata: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        date: { type: Type.STRING },
        unitOrLesson: { type: Type.STRING },
        activityType: {
          type: Type.STRING,
          enum: [
            "quiz",
            "graphic_organizer",
            "worksheet",
            "exit_ticket",
            "reading_response",
            "unknown",
          ],
        },
        subject: { type: Type.STRING },
        worksheetTitle: { type: Type.STRING },
      },
      required: ["activityType"],
    },
    studentTaskSummary: {
      type: Type.STRING,
      description: "A concise structured summary of what the student is being asked to do.",
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          instructions: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                prompt: { type: Type.STRING },
                instructions: { type: Type.STRING },
                expectedResponseType: {
                  type: Type.STRING,
                  enum: [
                    "multiple_choice",
                    "short_text",
                    "number",
                    "drawing",
                    "multi_part",
                    "unknown",
                  ],
                },
              },
              required: ["prompt", "expectedResponseType"],
            },
          },
        },
        required: ["questions"],
      },
    },
    completeness: {
      type: Type.OBJECT,
      properties: {
        isFullPageVisible: { type: Type.BOOLEAN },
        missingAreas: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        confidenceNote: { type: Type.STRING },
      },
      required: ["isFullPageVisible", "missingAreas"],
    },
    ...NEED_BETTER_VIEW_FIELDS,
  },
  required: ["outcome"],
} as const;

const COMPLETED_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    outcome: {
      type: Type.STRING,
      enum: ["captured", "need_better_view"],
      description: "Whether the worksheet image is readable enough to extract.",
    },
    studentName: {
      type: Type.STRING,
      description: "The student's name when it is clearly visible.",
    },
    responses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionRef: {
            type: Type.STRING,
            description: "The worksheet question ID when it can be matched confidently.",
          },
          promptAnchor: {
            type: Type.STRING,
            description: "A short description of the worksheet prompt this answer belongs to.",
          },
          studentAnswer: {
            type: Type.STRING,
            description: "Only the student's visible answer, with no grading or interpretation.",
          },
          studentWorkDescription: {
            type: Type.STRING,
            description: "Short description of the visible student work for this prompt, including drawings, equation layout, circling, underlining, or other non-text work.",
          },
          answered: {
            type: Type.BOOLEAN,
            description: "Whether the student appears to have attempted this prompt.",
          },
          legibility: {
            type: Type.STRING,
            enum: ["clear", "partially_clear", "unclear"],
          },
          notes: {
            type: Type.STRING,
            description: "Short note about uncertainty, missing work, or ambiguity. Do NOT judge whether answers are correct or incorrect.",
          },
        },
        required: ["promptAnchor", "studentAnswer", "answered", "legibility"],
      },
    },
    unmatchedMarks: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "Visible student marks that cannot be matched confidently to a known prompt.",
    },
    isGradingSafe: {
      type: Type.BOOLEAN,
      description: "Whether the visible worksheet contains enough student work to support reliable grading or evaluation.",
    },
    missingResponseAreas: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "Prompts, sections, or response areas that appear missing from the captured image.",
    },
    capturedPortionSummary: {
      type: Type.STRING,
      description: "Short summary of which part of the completed worksheet is visible in this scan.",
    },
    completionNotes: {
      type: Type.STRING,
      description: "Any concise notes about the overall worksheet completion state.",
    },
    visualWorkSummary: {
      type: Type.STRING,
      description: "Short overall description of the student's visible work, especially drawings, layouts, annotations, or equation work.",
    },
    feedback: {
      type: Type.STRING,
      description: "Encouraging feedback that celebrates the student's effort and praises them for showing their thinking and work. Do NOT check or grade answers — only comment on effort, completion, and visible work shown. Example: 'Great job showing all your work on the addition problems! I love that you wrote out each step.'",
    },
    score: {
      type: Type.STRING,
      description: "Optional score or progress label for the completed worksheet.",
    },
    ...NEED_BETTER_VIEW_FIELDS,
  },
  required: ["outcome"],
} as const;

const FEEDBACK_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    responseInsights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionRef: {
            type: Type.STRING,
            description: "The question ID from the provided answer key.",
          },
          verdict: {
            type: Type.STRING,
            enum: ["correct", "incorrect", "uncertain", "incomplete"],
          },
          confidence: {
            type: Type.STRING,
            enum: ["high", "medium", "low"],
          },
          likelyMisconception: {
            type: Type.STRING,
            description: "Likely misconception when the evidence supports one.",
          },
          evidence: {
            type: Type.STRING,
            description: "Short evidence-based explanation grounded in the visible work.",
          },
          studentFeedback: {
            type: Type.STRING,
            description: "One short, warm, specific coaching sentence for this question.",
          },
          teacherNote: {
            type: Type.STRING,
            description: "A short internal note about uncertainty or what to check next.",
          },
        },
        required: ["questionRef", "verdict", "confidence", "studentFeedback"],
      },
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Specific strengths visible across the worksheet.",
    },
    nextSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Specific, student-friendly next steps.",
    },
    caution: {
      type: Type.STRING,
      description: "A short caution when the scan is partial or uncertain.",
    },
    textFeedback: {
      type: Type.STRING,
      description: "2-3 sentences of specific on-screen feedback for the student.",
    },
    voiceFeedback: {
      type: Type.STRING,
      description: "1-2 short sentences to read aloud exactly to the student.",
    },
  },
  required: ["responseInsights", "strengths", "nextSteps", "textFeedback", "voiceFeedback"],
} as const;

export class GeminiWorksheetService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async extractEmptyWorksheet(
    image: ImagePayload,
    context?: { metrics?: CaptureMetricsContext }
  ): Promise<EmptyWorksheetExtractionResult> {
    return this.extractEmptyWorksheetData(image, context);
  }

  async extractCompletedWorksheet(
    image: ImagePayload,
    context?: ExtractionContext
  ): Promise<CompletedWorksheetExtractionResult> {
    return this.extractCompletedWorksheetData(image, context);
  }

  private async extractEmptyWorksheetData(
    image: ImagePayload,
    context?: { metrics?: CaptureMetricsContext }
  ): Promise<EmptyWorksheetExtractionResult> {
    const prompt = this.buildPrompt("empty", context);
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: EMPTY_RESPONSE_SCHEMA,
      },
    });

    let parsed: EmptyExtractionResponse = {};
    try {
      parsed = JSON.parse(response.text ?? "{}") as EmptyExtractionResponse;
    } catch (error) {
      console.error("Failed to parse Gemini extraction response:", error, response.text);
    }

    return this.normalizeEmptyResponse(parsed);
  }

  private async extractCompletedWorksheetData(
    image: ImagePayload,
    context?: ExtractionContext
  ): Promise<CompletedWorksheetExtractionResult> {
    const prompt = this.buildPrompt("completed", context);
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: COMPLETED_RESPONSE_SCHEMA,
      },
    });

    let parsed: CompletedExtractionResponse = {};
    try {
      parsed = JSON.parse(response.text ?? "{}") as CompletedExtractionResponse;
    } catch (error) {
      console.error("Failed to parse Gemini extraction response:", error, response.text);
    }

    const normalized = this.normalizeCompletedResponse(parsed, context);
    if (normalized.outcome !== "captured") {
      return normalized;
    }

    return {
      outcome: "captured",
      data: await this.enrichCompletedWorksheet(normalized.data, context),
    };
  }

  private buildPrompt(phase: "empty", context?: { metrics?: CaptureMetricsContext }): string;
  private buildPrompt(phase: "completed", context?: ExtractionContext): string;
  private buildPrompt(
    phase: ScanPhase,
    context?: { metrics?: CaptureMetricsContext } | ExtractionContext
  ): string {
    const metrics = context?.metrics;
    const metricsLine = metrics
      ? `Capture mode: ${metrics.captureMode}.`
      : "";

    const commonRules = [
      "You are reading a single captured photo of a paper worksheet.",
      "Be conservative and accurate.",
      "Never guess, infer, autocomplete, or reconstruct unreadable text.",
      "Reject the image with outcome='need_better_view' if any instructional text, prompt text, answer area, or meaningful page region appears cut off, cropped, too blurry, hidden by glare, too dark, too far away, or otherwise unreadable.",
      "Allow small finger or hand occlusions near the page edges only when no instructional text, prompt, or answer area is hidden.",
      "If the page is readable and complete, return outcome='captured'.",
      metricsLine,
      "Return JSON only.",
    ].filter(Boolean);

    if (phase === "empty") {
      return [
        ...commonRules,
        "This is the blank worksheet before the student has answered anything.",
        "Before returning captured, confirm the full worksheet page is visible from top, bottom, left, and right edges.",
        "Extract structured worksheet metadata into `metadata`: name, date, unitOrLesson, activityType, subject, worksheetTitle.",
        "Write `studentTaskSummary` as a concise description of what the student is being asked to do.",
        "Break the worksheet into `sections`, and for each section list the instructions and the individual prompts/questions in order.",
        "Use `expectedResponseType` for each question: multiple_choice, short_text, number, drawing, multi_part, or unknown.",
        "Set `completeness.isFullPageVisible=true` only if the whole worksheet is visible and readable.",
        "If any meaningful part of the page is missing, set outcome='need_better_view' instead of captured.",
        "If the photo is not readable enough, provide a short kid-friendly `message` such as 'Move closer' or 'Reduce glare'.",
      ].join(" ");
    }

    const completedContext = context as ExtractionContext | undefined;
    const worksheetReference = completedContext?.emptyWorksheet
      ? this.buildWorksheetReference(completedContext.emptyWorksheet)
      : "";
    const answerKeyReference = completedContext?.answerKey?.length
      ? this.buildAnswerKeyReference(completedContext.answerKey)
      : "";
    const subjectLine = completedContext?.subject
      ? `Known worksheet subject: ${completedContext.subject}.`
      : "";

    return [
      ...commonRules,
      "This is the completed worksheet with the student's work.",
      "Only describe what is actually visible in the student's writing, drawing, circling, or marking.",
      "Match each visible student response to the worksheet structure when possible.",
      "Include one response entry per known prompt whenever possible, even if the student left it unanswered.",
      "Use `questionRef` only when you can confidently match the response to one of the provided worksheet question IDs.",
      "Use `promptAnchor` to describe the prompt that the answer belongs to.",
      "Set `studentAnswer` to only the student's actual answer text, number, selected choice, or short transcription of what they wrote. Do not repeat the printed worksheet prompt unless the student rewrote it as part of their work.",
      "Use `studentWorkDescription` to describe how the student responded visually, including drawings, equation setup, crossed-out work, circling, arrows, boxed answers, or vertical math.",
      "Set `answered=false` for prompts that appear blank or unanswered.",
      "Use `legibility='unclear'` when the student's writing cannot be read confidently.",
      "Put stray marks or unclear work that cannot be matched into `unmatchedMarks`.",
      "Set `isGradingSafe=true` only when enough of the student's visible work is present to support reliable grading or evaluation.",
      "If only part of the worksheet is visible, describe the visible portion in `capturedPortionSummary` and list any missing prompts or answer regions in `missingResponseAreas`.",
      "If the partial scan is useful but incomplete, return `captured` with `isGradingSafe=false` rather than guessing about unseen work.",
      "Add short `completionNotes` and a short overall `visualWorkSummary`.",
      "Write `feedback` that celebrates the student's effort and praises them for showing their thinking and work. Comment on how many questions they attempted, whether they showed their steps, and the effort they put in. Do NOT check whether answers are mathematically correct or incorrect — you are not reliable at grading math. Focus only on effort, completion, and showing work.",
      "Add an optional `score`.",
      subjectLine,
      worksheetReference,
      answerKeyReference,
      "If the worksheet image hides or cuts off any important response area, return outcome='need_better_view'.",
      "If the photo is not readable enough, provide a short kid-friendly `message` such as 'Hold it steadier' or 'I can only see part of the page'.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  private normalizeEmptyResponse(response: EmptyExtractionResponse): EmptyWorksheetExtractionResult {
    if (response.outcome === "captured") {
      const studentTaskSummary = response.studentTaskSummary?.trim();
      const sections = this.normalizeSections(response.sections);
      const completeness = {
        isFullPageVisible: response.completeness?.isFullPageVisible !== false,
        missingAreas: this.normalizeStringArray(response.completeness?.missingAreas),
        confidenceNote: response.completeness?.confidenceNote?.trim(),
      };

      const hasStructuredContent = sections.some(
        (section) =>
          Boolean(section.instructions) || section.questions.some((question) => Boolean(question.prompt))
      );

      if (!studentTaskSummary || !hasStructuredContent) {
        return this.needBetterView("empty", "other", "I need a clearer picture of the whole worksheet.");
      }

      if (!completeness.isFullPageVisible || completeness.missingAreas.length > 0) {
        return this.needBetterView(
          "empty",
          "partial_page",
          "I need to see the full worksheet page."
        );
      }

      return {
        outcome: "captured",
        data: {
          metadata: {
            name: response.metadata?.name?.trim(),
            date: response.metadata?.date?.trim(),
            unitOrLesson: response.metadata?.unitOrLesson?.trim(),
            activityType: this.normalizeActivityType(response.metadata?.activityType),
            subject: response.metadata?.subject?.trim() || "Worksheet",
            worksheetTitle: response.metadata?.worksheetTitle?.trim(),
          },
          studentTaskSummary,
          sections,
          completeness,
        },
      };
    }

    return this.needBetterView(
      "empty",
      this.normalizeReason(response.reason),
      response.message?.trim() || "Hold the worksheet steady so I can read it."
    );
  }

  private normalizeCompletedResponse(
    response: CompletedExtractionResponse,
    context?: ExtractionContext
  ): CompletedWorksheetExtractionResult {
    if (response.outcome === "captured") {
      const responses = this.ensureQuestionCoverage(
        context?.emptyWorksheet,
        context?.answerKey,
        this.normalizeStudentResponses(response.responses)
      );
      const unmatchedMarks = this.normalizeStringArray(response.unmatchedMarks);
      const missingResponseAreas = this.normalizeStringArray(response.missingResponseAreas);
      const capturedPortionSummary = response.capturedPortionSummary?.trim();
      const hasPartialCapture = missingResponseAreas.length > 0 || Boolean(capturedPortionSummary);

      if (responses.length === 0 && unmatchedMarks.length === 0) {
        return this.needBetterView("completed", "other", "I need a clearer picture of your answers.");
      }

      return {
        outcome: "captured",
        data: {
          studentName: response.studentName?.trim(),
          responses,
          unmatchedMarks,
          isGradingSafe: response.isGradingSafe === true || (!hasPartialCapture && response.isGradingSafe !== false),
          missingResponseAreas,
          capturedPortionSummary,
          completionNotes: response.completionNotes?.trim(),
          visualWorkSummary: response.visualWorkSummary?.trim(),
          feedback: response.feedback?.trim() || "Nice work. I captured your worksheet.",
          score: response.score?.trim(),
        },
      };
    }

    return this.needBetterView(
      "completed",
      this.normalizeReason(response.reason),
      response.message?.trim() || "Hold the worksheet steady so I can read it."
    );
  }

  private async enrichCompletedWorksheet(
    worksheet: CompletedWorksheetData,
    context?: ExtractionContext
  ): Promise<CompletedWorksheetData> {
    const analysis = await this.analyzeCompletedWorksheet(worksheet, context);

    return {
      ...worksheet,
      analysis,
    };
  }

  private async analyzeCompletedWorksheet(
    worksheet: CompletedWorksheetData,
    context?: ExtractionContext
  ): Promise<WorksheetFeedbackAnalysis> {
    const deterministicInsights = this.buildDeterministicInsights(worksheet, context?.answerKey);
    if (!context?.answerKey?.length) {
      return this.buildFallbackAnalysis(worksheet, deterministicInsights);
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: this.buildAnalysisPrompt(worksheet, context.answerKey, deterministicInsights) }],
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: FEEDBACK_ANALYSIS_SCHEMA,
        },
      });

      let parsed: FeedbackAnalysisResponse = {};
      try {
        parsed = JSON.parse(response.text ?? "{}") as FeedbackAnalysisResponse;
      } catch (error) {
        console.error("Failed to parse Gemini feedback analysis:", error, response.text);
      }

      return this.normalizeFeedbackAnalysis(parsed, worksheet, deterministicInsights);
    } catch (error) {
      console.error("Completed worksheet analysis failed:", error);
      return this.buildFallbackAnalysis(worksheet, deterministicInsights);
    }
  }

  private buildAnalysisPrompt(
    worksheet: CompletedWorksheetData,
    answerKey: WorksheetQuestionContext[],
    deterministicInsights: ResponseInsight[]
  ): string {
    const lines = [
      "You are reviewing early elementary student math work after the image has already been transcribed into structured data.",
      "Use only the answer key, extracted responses, and visible-work notes provided below.",
      "Only mark a response as correct or incorrect when the extracted answer is clear enough and the evidence strongly supports it.",
      "When handwriting is unclear, the page is partial, or the evidence is incomplete, use verdict='uncertain' or verdict='incomplete'.",
      "If you mention a misconception, keep it grounded in the visible work and avoid overclaiming.",
      "Keep every `studentFeedback` sentence warm, specific, and helpful for a young student.",
      "`textFeedback` should be 2-3 specific sentences for the finished screen.",
      "`voiceFeedback` should be 1-2 short sentences that can be read aloud exactly.",
      worksheet.capturedPortionSummary
        ? `Visible portion summary: ${worksheet.capturedPortionSummary}`
        : "Visible portion summary: full worksheet appears visible.",
      worksheet.missingResponseAreas.length > 0
        ? `Missing response areas: ${worksheet.missingResponseAreas.join("; ")}`
        : "Missing response areas: none reported.",
      worksheet.visualWorkSummary ? `Visual work summary: ${worksheet.visualWorkSummary}` : "",
      worksheet.completionNotes ? `Completion notes: ${worksheet.completionNotes}` : "",
      "Answer key and extracted responses:",
    ].filter(Boolean);

    deterministicInsights.forEach((insight) => {
      const response = worksheet.responses.find((item) => {
        if (insight.questionRef && item.questionRef === insight.questionRef) {
          return true;
        }

        return item.promptAnchor.toLowerCase() === insight.promptAnchor.toLowerCase();
      });
      const key = answerKey.find((item) => item.questionRef === insight.questionRef);

      lines.push(
        [
          `Question ${insight.questionRef || response?.questionRef || "unknown"}:`,
          key ? `Prompt: ${key.prompt}` : `Prompt anchor: ${insight.promptAnchor}`,
          key?.expectedAnswer ? `Expected answer: ${key.expectedAnswer}` : "",
          key?.skillTag ? `Skill tag: ${key.skillTag}` : "",
          key?.misconceptionHints?.length
            ? `Possible misconception hints: ${key.misconceptionHints.join(" | ")}`
            : "",
          `Student answer: ${response?.studentAnswer || "(blank)"}`,
          `Answered: ${response?.answered ? "yes" : "no"}`,
          `Legibility: ${response?.legibility || "unclear"}`,
          response?.studentWorkDescription
            ? `Visible work: ${response.studentWorkDescription}`
            : "Visible work: none noted.",
          response?.notes ? `Extraction notes: ${response.notes}` : "",
          `Deterministic check: verdict=${insight.verdict}, confidence=${insight.confidence}.`,
          insight.evidence ? `Deterministic evidence: ${insight.evidence}` : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
    });

    return lines.join("\n");
  }

  private normalizeFeedbackAnalysis(
    response: FeedbackAnalysisResponse,
    worksheet: CompletedWorksheetData,
    deterministicInsights: ResponseInsight[]
  ): WorksheetFeedbackAnalysis {
    const insightsByRef = new Map(
      (response.responseInsights ?? [])
        .filter((item): item is ResponseInsightItem & { questionRef: string } => Boolean(item.questionRef))
        .map((item) => [item.questionRef, item])
    );

    const responseInsights = deterministicInsights.map((fallbackInsight) => {
      const parsed = fallbackInsight.questionRef
        ? insightsByRef.get(fallbackInsight.questionRef)
        : undefined;

      return {
        ...fallbackInsight,
        verdict: this.normalizeAnalysisVerdict(parsed?.verdict, fallbackInsight.verdict),
        confidence: this.normalizeAnalysisConfidence(parsed?.confidence, fallbackInsight.confidence),
        likelyMisconception: parsed?.likelyMisconception?.trim() || fallbackInsight.likelyMisconception,
        evidence: parsed?.evidence?.trim() || fallbackInsight.evidence,
        studentFeedback: parsed?.studentFeedback?.trim() || fallbackInsight.studentFeedback,
        teacherNote: parsed?.teacherNote?.trim() || fallbackInsight.teacherNote,
      };
    });

    const fallback = this.buildFallbackAnalysis(worksheet, responseInsights);
    const strengths = this.normalizeStringArray(response.strengths).slice(0, 3);
    const nextSteps = this.normalizeStringArray(response.nextSteps).slice(0, 3);

    return {
      responseInsights,
      strengths: strengths.length > 0 ? strengths : fallback.strengths,
      nextSteps: nextSteps.length > 0 ? nextSteps : fallback.nextSteps,
      caution: response.caution?.trim() || fallback.caution,
      textFeedback: response.textFeedback?.trim() || fallback.textFeedback,
      voiceFeedback: response.voiceFeedback?.trim() || fallback.voiceFeedback,
    };
  }

  private buildFallbackAnalysis(
    worksheet: CompletedWorksheetData,
    responseInsights: ResponseInsight[]
  ): WorksheetFeedbackAnalysis {
    const answeredCount = worksheet.responses.filter((response) => response.answered).length;
    const totalCount = worksheet.responses.length;
    const correctHighConfidence = responseInsights.filter(
      (insight) => insight.verdict === "correct" && insight.confidence === "high"
    );
    const incorrectHighConfidence = responseInsights.filter(
      (insight) => insight.verdict === "incorrect" && insight.confidence === "high"
    );
    const showedWork = worksheet.responses.some((response) => Boolean(response.studentWorkDescription));
    const caution = !worksheet.isGradingSafe || worksheet.missingResponseAreas.length > 0
      ? "Some parts of the worksheet were hard to read, so this feedback stays cautious."
      : undefined;
    const strengths = [
      answeredCount > 0 ? `You worked on ${answeredCount} of ${totalCount} questions.` : "",
      showedWork ? "You showed your thinking on the page." : "",
      correctHighConfidence[0]?.studentFeedback ?? "",
    ].filter(Boolean);
    const nextSteps = [
      incorrectHighConfidence[0]?.studentFeedback ?? "",
      caution ? "Keep your work dark and clear so it is easier to read next time." : "",
    ].filter(Boolean);

    const textFeedback = [
      answeredCount > 0
        ? `You completed ${answeredCount} of ${totalCount} questions and showed what you were thinking.`
        : "You got started on the worksheet and showed me part of your thinking.",
      incorrectHighConfidence[0]?.studentFeedback ||
        worksheet.feedback ||
        "Keep checking each problem one step at a time.",
      caution || "",
    ].filter(Boolean).join(" ");

    const voiceFeedback = [
      answeredCount > 0
        ? `You worked on ${answeredCount} of ${totalCount} questions and showed your thinking.`
        : "You got started and showed me some of your work.",
      incorrectHighConfidence[0]?.studentFeedback ||
        "Keep checking each problem one careful step at a time.",
    ].join(" ");

    return {
      responseInsights,
      strengths,
      nextSteps,
      caution,
      textFeedback,
      voiceFeedback,
    };
  }

  private needBetterView(
    phase: "empty",
    reason: ScanIssueReason,
    message: string
  ): EmptyWorksheetExtractionResult;
  private needBetterView(
    phase: "completed",
    reason: ScanIssueReason,
    message: string
  ): CompletedWorksheetExtractionResult;
  private needBetterView(
    phase: ScanPhase,
    reason: ScanIssueReason,
    message: string
  ): EmptyWorksheetExtractionResult | CompletedWorksheetExtractionResult {
    return {
      outcome: "need_better_view",
      issue: {
        phase,
        reason,
        message,
      },
    };
  }

  private normalizeReason(reason?: string): ScanIssueReason {
    switch (reason) {
      case "blurry":
      case "partial_page":
      case "glare":
      case "too_far":
      case "too_close":
      case "cropped":
      case "handwriting_unclear":
      case "low_light":
      case "motion_blur":
        return reason;
      default:
        return "other";
    }
  }

  private normalizeActivityType(activityType?: string): ActivityType {
    switch (activityType) {
      case "quiz":
      case "graphic_organizer":
      case "worksheet":
      case "exit_ticket":
      case "reading_response":
        return activityType;
      default:
        return "unknown";
    }
  }

  private normalizeExpectedResponseType(
    expectedResponseType?: string
  ): ExpectedResponseType {
    switch (expectedResponseType) {
      case "multiple_choice":
      case "short_text":
      case "number":
      case "drawing":
      case "multi_part":
        return expectedResponseType;
      default:
        return "unknown";
    }
  }

  private normalizeLegibility(legibility?: string): ResponseLegibility {
    switch (legibility) {
      case "clear":
      case "partially_clear":
      case "unclear":
        return legibility;
      default:
        return "unclear";
    }
  }

  private normalizeSections(sections?: EmptySectionResponse[]): WorksheetSection[] {
    return (sections ?? [])
      .map<WorksheetSection | null>((section, sectionIndex) => {
        const questions = (section.questions ?? [])
          .map<WorksheetQuestion | null>((question, questionIndex) => {
            const prompt = question.prompt?.trim();
            if (!prompt) {
              return null;
            }

            return {
              id: `Q${sectionIndex + 1}.${questionIndex + 1}`,
              label: question.label?.trim(),
              prompt,
              instructions: question.instructions?.trim(),
              expectedResponseType: this.normalizeExpectedResponseType(
                question.expectedResponseType
              ),
            };
          })
          .filter(isDefined);

        if (
          !section.title?.trim() &&
          !section.instructions?.trim() &&
          questions.length === 0
        ) {
          return null;
        }

        return {
          id: `section-${sectionIndex + 1}`,
          title: section.title?.trim(),
          instructions: section.instructions?.trim(),
          questions,
        };
      })
      .filter(isDefined);
  }

  private normalizeStudentResponses(
    responses?: CompletedResponseItem[]
  ): StudentResponse[] {
    return (responses ?? [])
      .map<StudentResponse | null>((response) => {
        const promptAnchor = response.promptAnchor?.trim();
        if (!promptAnchor) {
          return null;
        }

        return {
          questionRef: response.questionRef?.trim(),
          promptAnchor,
          studentAnswer: response.studentAnswer?.trim() || "",
          studentWorkDescription: response.studentWorkDescription?.trim(),
          answered: Boolean(response.answered),
          legibility: this.normalizeLegibility(response.legibility),
          notes: response.notes?.trim(),
        };
      })
      .filter(isDefined);
  }

  private normalizeStringArray(values?: string[]): string[] {
    return (values ?? [])
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
  }

  private normalizeAnalysisVerdict(
    verdict: string | undefined,
    fallback: AnalysisVerdict
  ): AnalysisVerdict {
    switch (verdict) {
      case "correct":
      case "incorrect":
      case "uncertain":
      case "incomplete":
        return verdict;
      default:
        return fallback;
    }
  }

  private normalizeAnalysisConfidence(
    confidence: string | undefined,
    fallback: AnalysisConfidence
  ): AnalysisConfidence {
    switch (confidence) {
      case "high":
      case "medium":
      case "low":
        return confidence;
      default:
        return fallback;
    }
  }

  private buildDeterministicInsights(
    worksheet: CompletedWorksheetData,
    answerKey?: WorksheetQuestionContext[]
  ): ResponseInsight[] {
    if (!answerKey?.length) {
      return worksheet.responses.map((response) => ({
        questionRef: response.questionRef,
        promptAnchor: response.promptAnchor,
        verdict: response.answered ? "uncertain" : "incomplete",
        confidence: response.answered && response.legibility !== "unclear" ? "medium" : "low",
        evidence: response.studentWorkDescription || response.notes,
        studentFeedback: response.answered
          ? "You showed your thinking here. Keep checking each step carefully."
          : "Try to give this problem a try so I can see your thinking.",
        teacherNote: response.notes,
      }));
    }

    return answerKey.map((question) => {
      const response = worksheet.responses.find(
        (item) =>
          item.questionRef === question.questionRef ||
          item.promptAnchor.toLowerCase() === question.prompt.toLowerCase()
      );

      if (!response || !response.answered || !response.studentAnswer.trim()) {
        return {
          questionRef: question.questionRef,
          promptAnchor: question.prompt,
          expectedAnswer: question.expectedAnswer,
          verdict: "incomplete",
          confidence: "high",
          evidence: "No clear student answer was extracted for this problem.",
          studentFeedback: "You can come back to this problem and show your work one step at a time.",
          teacherNote: "No completed response was extracted for this question.",
        };
      }

      if (response.legibility === "unclear") {
        return {
          questionRef: question.questionRef,
          promptAnchor: response.promptAnchor,
          expectedAnswer: question.expectedAnswer,
          verdict: "uncertain",
          confidence: "low",
          likelyMisconception: question.misconceptionHints?.[0],
          evidence: "The writing on this answer is too unclear to evaluate safely.",
          studentFeedback: "I can see you worked on this one. Try writing the answer a little darker so it is easier to check.",
          teacherNote: response.notes || "Legibility is too low for a safe correctness call.",
        };
      }

      const expected = normalizeComparableAnswer(question.expectedAnswer);
      const actual = normalizeComparableAnswer(response.studentAnswer);
      const comparableAnswer = Boolean(expected) && Boolean(actual);
      const isExactMatch = comparableAnswer && expected === actual;
      const confidence: AnalysisConfidence =
        response.legibility === "clear" ? "high" : "medium";

      if (isExactMatch) {
        return {
          questionRef: question.questionRef,
          promptAnchor: response.promptAnchor,
          expectedAnswer: question.expectedAnswer,
          verdict: "correct",
          confidence,
          evidence: `The extracted answer "${response.studentAnswer}" matches the expected answer "${question.expectedAnswer}".`,
          studentFeedback: "Nice job checking this problem carefully and showing your work.",
          teacherNote: response.studentWorkDescription,
        };
      }

      return {
        questionRef: question.questionRef,
        promptAnchor: response.promptAnchor,
        expectedAnswer: question.expectedAnswer,
        verdict: comparableAnswer ? "incorrect" : "uncertain",
        confidence: comparableAnswer ? confidence : "low",
        likelyMisconception: question.misconceptionHints?.[0],
        evidence: comparableAnswer
          ? `The extracted answer "${response.studentAnswer}" does not match the expected answer "${question.expectedAnswer}".`
          : "The extracted answer could not be matched to the expected answer confidently.",
        studentFeedback: comparableAnswer
          ? buildQuestionSpecificCoaching(question)
          : "You showed your thinking here. Try checking the numbers one more careful step at a time.",
        teacherNote: response.studentWorkDescription || response.notes,
      };
    });
  }

  private buildAnswerKeyReference(answerKey: WorksheetQuestionContext[]): string {
    return [
      "Known worksheet questions:",
      ...answerKey.map((question) =>
        [
          `Question ${question.questionRef}: ${question.prompt}.`,
          `Expected answer: ${question.expectedAnswer}.`,
          question.skillTag ? `Skill: ${question.skillTag}.` : "",
        ]
          .filter(Boolean)
          .join(" ")
      ),
    ].join(" ");
  }

  private buildWorksheetReference(worksheet: EmptyWorksheetData): string {
    const lines: string[] = [
      "Reference worksheet structure:",
      `Activity type: ${worksheet.metadata.activityType}.`,
    ];

    if (worksheet.metadata.subject) {
      lines.push(`Subject: ${worksheet.metadata.subject}.`);
    }

    if (worksheet.metadata.worksheetTitle) {
      lines.push(`Title: ${worksheet.metadata.worksheetTitle}.`);
    }

    worksheet.sections.forEach((section, sectionIndex) => {
      lines.push(`Section ${sectionIndex + 1}${section.title ? ` (${section.title})` : ""}:`);
      if (section.instructions) {
        lines.push(`Section instructions: ${section.instructions}`);
      }
      section.questions.forEach((question) => {
        lines.push(
          `Question ${question.id}${question.label ? ` [${question.label}]` : ""}: ${question.prompt} (${question.expectedResponseType})`
        );
      });
    });

    return lines.join(" ");
  }

  private ensureQuestionCoverage(
    worksheet: EmptyWorksheetData | undefined,
    answerKey: WorksheetQuestionContext[] | undefined,
    responses: StudentResponse[]
  ): StudentResponse[] {
    if (!worksheet) {
      return answerKey?.length ? this.ensureAnswerKeyCoverage(answerKey, responses) : responses;
    }

    const responseByRef = new Map(
      responses
        .filter((response) => response.questionRef)
        .map((response) => [response.questionRef as string, response])
    );

    const expandedResponses: StudentResponse[] = [];

    worksheet.sections.forEach((section) => {
      section.questions.forEach((question) => {
        const matchingResponse = responseByRef.get(question.id);
        if (matchingResponse) {
          expandedResponses.push(matchingResponse);
          return;
        }

        const fallbackMatch = responses.find(
          (response) =>
            !response.questionRef &&
            response.promptAnchor.toLowerCase() === question.prompt.toLowerCase()
        );

        if (fallbackMatch) {
          expandedResponses.push({ ...fallbackMatch, questionRef: question.id });
          return;
        }

        expandedResponses.push({
          questionRef: question.id,
          promptAnchor: question.prompt,
          studentAnswer: "",
          studentWorkDescription: "No visible response was extracted for this prompt.",
          answered: false,
          legibility: "unclear",
          notes: "No response was extracted for this prompt.",
        });
      });
    });

    const unmatchedResponses = responses.filter((response) => {
      if (response.questionRef && responseByRef.has(response.questionRef)) {
        return !expandedResponses.some(
          (candidate) =>
            candidate.questionRef === response.questionRef &&
            candidate.promptAnchor === response.promptAnchor &&
            candidate.studentAnswer === response.studentAnswer
        );
      }

      return !expandedResponses.some(
        (candidate) =>
          candidate.promptAnchor === response.promptAnchor &&
          candidate.studentAnswer === response.studentAnswer
      );
    });

    return [...expandedResponses, ...unmatchedResponses];
  }

  private ensureAnswerKeyCoverage(
    answerKey: WorksheetQuestionContext[],
    responses: StudentResponse[]
  ): StudentResponse[] {
    const responseByRef = new Map(
      responses
        .filter((response) => response.questionRef)
        .map((response) => [response.questionRef as string, response])
    );

    const expandedResponses = answerKey.map((question) => {
      const byRef = responseByRef.get(question.questionRef);
      if (byRef) {
        return byRef;
      }

      const byPrompt = responses.find(
        (response) => response.promptAnchor.toLowerCase() === question.prompt.toLowerCase()
      );
      if (byPrompt) {
        return { ...byPrompt, questionRef: question.questionRef };
      }

      return {
        questionRef: question.questionRef,
        promptAnchor: question.prompt,
        studentAnswer: "",
        studentWorkDescription: "No visible response was extracted for this prompt.",
        answered: false,
        legibility: "unclear" as const,
        notes: "No response was extracted for this prompt.",
      };
    });

    const unmatchedResponses = responses.filter((response) => {
      return !expandedResponses.some(
        (candidate) =>
          candidate.questionRef === response.questionRef ||
          (candidate.promptAnchor === response.promptAnchor &&
            candidate.studentAnswer === response.studentAnswer)
      );
    });

    return [...expandedResponses, ...unmatchedResponses];
  }
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function normalizeComparableAnswer(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.-]+/g, "");
}

function buildQuestionSpecificCoaching(question: WorksheetQuestionContext): string {
  if (question.questionRef === "Q1.1") {
    return "You showed your work here. Check the tens and ones again to make sure they add up to the total.";
  }

  if (question.questionRef === "Q1.2") {
    return "You are close. Solve the addition first, then write that total in the blank on the left side.";
  }

  return "You showed your thinking here. Try checking the numbers one more careful step at a time.";
}
