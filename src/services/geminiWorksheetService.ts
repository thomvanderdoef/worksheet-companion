import { GoogleGenAI, Type } from "@google/genai";

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
  metrics?: CaptureMetricsContext;
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

    return this.normalizeCompletedResponse(parsed, context);
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
        this.normalizeStudentResponses(response.responses)
      );
      const unmatchedMarks = this.normalizeStringArray(response.unmatchedMarks);

      if (responses.length === 0 && unmatchedMarks.length === 0) {
        return this.needBetterView("completed", "other", "I need a clearer picture of your answers.");
      }

      return {
        outcome: "captured",
        data: {
          studentName: response.studentName?.trim(),
          responses,
          unmatchedMarks,
          isGradingSafe: response.isGradingSafe !== false,
          missingResponseAreas: this.normalizeStringArray(response.missingResponseAreas),
          capturedPortionSummary: response.capturedPortionSummary?.trim(),
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
    responses: StudentResponse[]
  ): StudentResponse[] {
    if (!worksheet) {
      return responses;
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
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
