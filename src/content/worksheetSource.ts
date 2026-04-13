import worksheetPreviewUrl from '../../ADM-1-5-quiz-1-1E.pdf?url';

export type WorksheetAssetKind = 'image' | 'pdf';

export interface WorksheetQuestionContext {
  questionRef: string;
  prompt: string;
  expectedAnswer: string;
  skillTag?: string;
  misconceptionHints?: string[];
}

export interface WorksheetSource {
  id: string;
  title: string;
  subject: string;
  assetKind: WorksheetAssetKind;
  previewSrc: string;
  pageNumber?: number;
  previewAlt: string;
  mimeType: string;
  accessibleText: string;
  questionContexts: WorksheetQuestionContext[];
}

const worksheetAccessibleText = [
  'Name',
  'Date',
  'Quiz: Sub-Unit 1',
  'Unit 1.5',
  'For Problems 1 and 2, find the number that makes the equation true.',
  'Show your thinking.',
  '1. 34 + 40 =',
  '2. __ = 53 + 26',
].join('\n');

export const bundledWorksheetSource: WorksheetSource = {
  id: 'adm-1-5-quiz-1-1e',
  title: 'Quiz: Sub-Unit 1',
  subject: 'Math',
  assetKind: 'pdf',
  previewSrc: worksheetPreviewUrl,
  pageNumber: 1,
  previewAlt: 'Sub-Unit 1 math quiz PDF',
  mimeType: 'application/pdf',
  accessibleText: worksheetAccessibleText,
  questionContexts: [
    {
      questionRef: 'Q1.1',
      prompt: '34 + 40 =',
      expectedAnswer: '74',
      skillTag: 'add_tens_and_ones',
      misconceptionHints: [
        'Make sure the student combines tens and ones correctly.',
        'Watch for adding only one part of the number or skipping the tens.',
      ],
    },
    {
      questionRef: 'Q1.2',
      prompt: '__ = 53 + 26',
      expectedAnswer: '79',
      skillTag: 'find_the_total_in_an_equation',
      misconceptionHints: [
        'Watch for confusion when the blank is on the left side of the equation.',
        'Make sure the student solves the addition before filling in the missing number.',
      ],
    },
  ],
};
