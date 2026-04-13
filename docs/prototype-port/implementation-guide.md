# Implementation Guide

## Goal
Rebuild the current worksheet companion in the new Next.js design-system repo as a 3-screen slide prototype, while preserving the working Gemini behavior from this repo.

## Source Repo Reference
Portable source root:
- `smartpaper_-student-feedback-assistant/`

Local source root on this machine:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant`

Most important direct file paths:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/App.tsx`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/components/CameraPreview.tsx`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/components/WorksheetPreview.tsx`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/content/worksheetSource.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiLiveGuidanceService.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiWorksheetReadAloudService.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiWorksheetService.ts`

## Non-Negotiables
- Do not do a straight copy of `src/App.tsx`.
- Reuse the Gemini service logic first; rebuild the UI shell around the new repo's patterns.
- Follow the target repo's prototype structure:
  - `app/prototypes/[prototype-name]/page.tsx`
  - `app/prototypes/[prototype-name]/styles.module.css`
  - homepage card added in `app/page.tsx`
- Use CSS Modules and design-token variables from `app/globals.css`.
- The globe switcher must change the entire prototype language, not just worksheet audio.

## Figma Product Shape
Reference: [Digital Print Companion](https://www.figma.com/design/7e1ECnOGBchU5fLn7nsqON/Digital-Print-Companion?node-id=80-7834&t=DE0vOZmQqhxXxMSt-11)

The target flow is a K-1 slide experience with a fixed top shell:
- Slide 1: choose prototype option
- Slide 2: worksheet preview plus listen
- Slide 3: capture finished worksheet, then show feedback in the same slide family

Important nuance:
- The Figma section shows `Step 3.1 - Upload finished worksheet` and `Step 3.2 - Feedback`.
- Treat these as substates inside slide 3, not as separate top-level pages.

## Map Current Flow To New Slide Flow

### Current repo states
- `start`
- `view_pdf`
- `working`
- `guided_capture`
- `processing`
- `finished`

### New repo states
- `slide1_choice`
- `slide2_listen`
- `slide3_capture`
- `slide3_processing`
- `slide3_feedback`

### Mapping
- `start` and the current initial entry experience map to `slide1_choice`
- `view_pdf` maps to `slide2_listen`
- `working`, `guided_capture`, and `processing` collapse into the slide-3 capture flow
- `finished` maps to `slide3_feedback`

## What To Port

### Reuse with minimal edits
- `src/services/geminiLiveGuidanceService.ts`
- `src/services/geminiWorksheetReadAloudService.ts`
- `src/services/geminiWorksheetService.ts`
- `src/content/worksheetSource.ts`

### Treat as reference implementations, not copy-paste targets
- `src/components/CameraPreview.tsx`
- `src/components/WorksheetPreview.tsx`
- `src/App.tsx`

For agents running on this machine, the matching absolute paths are:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiLiveGuidanceService.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiWorksheetReadAloudService.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiWorksheetService.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/content/worksheetSource.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/components/CameraPreview.tsx`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/components/WorksheetPreview.tsx`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/App.tsx`

## Recommended File Layout In The New Repo
- `app/prototypes/[prototype-name]/page.tsx`
- `app/prototypes/[prototype-name]/styles.module.css`
- `app/prototypes/[prototype-name]/_components/SlideShell.tsx`
- `app/prototypes/[prototype-name]/_components/ChoiceSlide.tsx`
- `app/prototypes/[prototype-name]/_components/WorksheetListenSlide.tsx`
- `app/prototypes/[prototype-name]/_components/CaptureFeedbackSlide.tsx`
- `app/prototypes/[prototype-name]/_components/WorksheetPreview.tsx`
- `app/prototypes/[prototype-name]/_components/CameraCapture.tsx`
- `app/prototypes/[prototype-name]/_components/FeedbackPanel.tsx`
- `app/prototypes/[prototype-name]/_hooks/useWorksheetWorkflow.ts`
- `app/prototypes/[prototype-name]/_hooks/usePrototypeLanguage.ts`
- `app/prototypes/[prototype-name]/_lib/localizedCopy.ts`
- `app/prototypes/[prototype-name]/_lib/worksheetSource.ts`
- `app/prototypes/[prototype-name]/_lib/gemini/`

If the new repo prefers shared reusable components under `app/components/`, only move pieces there when they are clearly reusable outside this prototype.

## Recommended Build Sequence
1. Scaffold the prototype route and homepage card.
2. Build the static 3-screen slide shell to match Figma.
3. Add global language state and localized copy.
4. Port Gemini services with minimal prompt/schema edits.
5. Wire slide 2 listen behavior.
6. Wire slide 3 capture, processing, and feedback.
7. Replace placeholder content with actual worksheet data and camera flow.
8. Finalize Next-specific env, PDF, and client-only boundaries.

## UI Notes For Agents
- Match the Figma shell first:
  - fixed nav/header
  - home icon area
  - globe button with dropdown
  - arrow buttons and step number
  - large oval CTAs
- Recreate layout with CSS Modules, not Tailwind.
- Use the design system's existing button/icon/tokens if available.
- Avoid introducing visual one-offs when an equivalent token/component exists already.

## Technical Notes For Agents
- Camera, audio, and Gemini Live code must run in client components.
- Do not keep using `import.meta.env`; adapt to Next env handling.
- Prefer a server boundary for Gemini keys if possible.
- Keep worksheet `accessibleText` explicit unless there is already a better content source in the new repo.

## Definition Of Done
- The prototype visually follows the 3-screen slide design.
- Core Gemini behavior matches the current repo.
- Slide 2 can read the worksheet aloud.
- Slide 3 can guide capture, process the worksheet, and show feedback.
- English and Spanish both work across the full prototype.
- The route is isolated under `app/prototypes/[prototype-name]/`.
- The homepage card is added.
- `npm run type-check` passes in the target repo.
