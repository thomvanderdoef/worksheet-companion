# Gemini Live Prototype Handoff

Copy this folder into the new Next.js prototype repo as the source of truth for agents implementing the worksheet companion experience.

## Included Docs
- `implementation-guide.md`
  Porting strategy, slide mapping, file layout, and recommended build sequence.
- `architecture-reference.md`
  Current repo behavior, service boundaries, and what is safe to reuse vs rewrite.
- `localization-spec.md`
  Full English/Spanish requirements for UI, Gemini Live, read-aloud, and feedback.

## Design Reference
- Figma: [Digital Print Companion](https://www.figma.com/design/7e1ECnOGBchU5fLn7nsqON/Digital-Print-Companion?node-id=80-7834&t=DE0vOZmQqhxXxMSt-11)
- Section: `K-1 Worksheet Companion Prototype`

## Current Source Repo Files
- `src/App.tsx`
- `src/components/CameraPreview.tsx`
- `src/components/WorksheetPreview.tsx`
- `src/content/worksheetSource.ts`
- `src/services/geminiLiveGuidanceService.ts`
- `src/services/geminiWorksheetReadAloudService.ts`
- `src/services/geminiWorksheetService.ts`

## Source Repo On This Machine
Source repo root:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant`

Direct file paths:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/App.tsx`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/components/CameraPreview.tsx`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/components/WorksheetPreview.tsx`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/content/worksheetSource.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiLiveGuidanceService.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiWorksheetReadAloudService.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiWorksheetService.ts`

## Intent
This doc set is for building the same core functionality in a different repo that:
- uses `app/` instead of `src/`
- uses CSS Modules instead of Tailwind
- follows the design-system and prototype conventions described in that repo's `AGENTS.md`
- implements the new 3-screen slide design
- supports full app-level English/Spanish switching
