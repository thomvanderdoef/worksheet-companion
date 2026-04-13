# Architecture Reference

## Source Repo Reference
Portable source root:
- `smartpaper_-student-feedback-assistant/`

Local source root on this machine:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant`

## Current Working Behavior
The current repo already proves these behaviors:
- worksheet preview
- Gemini-powered worksheet read-aloud
- Gemini Live scan guidance from camera frames
- still-image worksheet extraction
- effort-based student feedback after capture

The safest migration strategy is to preserve the Gemini service layer and rebuild the page orchestration around the new repo's prototype shell.

## Current Source Files And Responsibilities

### `src/App.tsx`
Single orchestrator for:
- workflow step state
- service lifecycle
- read-aloud caching
- capture transitions
- extraction handling
- finishing feedback

This file is too Vite/Tailwind-specific to port directly. Rebuild its logic as hooks + smaller components.
Absolute path on this machine:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/App.tsx`

### `src/services/geminiLiveGuidanceService.ts`
Responsibilities:
- connect to Gemini Live
- stream JPEG frames
- receive spoken guidance audio
- receive transcription text
- trigger `readyToCapture`
- send final spoken prompts

Why it is portable:
- most logic is domain-specific, not UI-specific
- prompt design and connection lifecycle are already working

What will change:
- import paths
- env source
- possibly API transport strategy
Absolute path on this machine:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiLiveGuidanceService.ts`

### `src/services/geminiWorksheetReadAloudService.ts`
Responsibilities:
- create a read-aloud script from worksheet text
- speak the script via Gemini Live
- choose voice by language

Why it is portable:
- the script/build/speak split is already clean
- language-aware voice selection already exists

What will expand:
- today it mostly supports English/Spanish worksheet audio
- in the new prototype it must integrate with full app-level localization
Absolute path on this machine:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiWorksheetReadAloudService.ts`

### `src/services/geminiWorksheetService.ts`
Responsibilities:
- send still worksheet capture to Gemini
- extract structured student response data
- return feedback-oriented structured JSON

Why it is portable:
- it is already the cleanest logic boundary in the app
- it has explicit schemas and output contracts

What to preserve:
- structured JSON approach
- conservative prompt behavior
- no grading claims beyond effort/completion style feedback
Absolute path on this machine:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiWorksheetService.ts`

### `src/components/CameraPreview.tsx`
Responsibilities:
- camera setup
- periodic frame capture for Gemini Live
- still capture for manual/auto capture

Porting guidance:
- reuse behavior, not component code
- rewrite styling and shell integration
- keep frame interval and still capture ideas unless the new repo needs different tuning
Absolute path on this machine:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/components/CameraPreview.tsx`

### `src/components/WorksheetPreview.tsx`
Responsibilities:
- show worksheet PDF or image
- overlay listen button
- optional language UI slot

Porting guidance:
- reuse interface ideas
- rewrite for Next PDF handling and CSS Modules
Absolute path on this machine:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/components/WorksheetPreview.tsx`

### `src/content/worksheetSource.ts`
Responsibilities:
- identify worksheet asset
- provide worksheet metadata
- provide `accessibleText` for read-aloud generation

Porting guidance:
- this should remain explicit content data
- asset loading will need to match the target repo's Next conventions
Absolute path on this machine:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/content/worksheetSource.ts`

## Suggested Architecture In The New Repo

### Page layer
`page.tsx` should be a thin prototype entry that renders the slide shell and hooks.

### Hook layer
Use hooks for stateful orchestration:
- `useWorksheetWorkflow`
- `usePrototypeLanguage`

### UI layer
Use small components for slide and panel composition:
- `SlideShell`
- `ChoiceSlide`
- `WorksheetListenSlide`
- `CaptureFeedbackSlide`
- `WorksheetPreview`
- `CameraCapture`
- `FeedbackPanel`

### Service layer
Keep Gemini services isolated under a local library folder, for example:
- `_lib/gemini/geminiLiveGuidanceService.ts`
- `_lib/gemini/geminiWorksheetReadAloudService.ts`
- `_lib/gemini/geminiWorksheetService.ts`

### Content layer
Keep localized copy and worksheet content separate:
- `_lib/localizedCopy.ts`
- `_lib/worksheetSource.ts`

## Client-Only Boundaries
These must stay client-side:
- camera access
- `AudioContext`
- Gemini Live session usage
- anything relying on `window`, `navigator`, or `atob`

In practice:
- the prototype page can be a client component, or
- the page can render a client entry component that owns all interactive behavior

## Migration Rules
- Preserve service prompts first; do not rewrite them casually during the first port.
- Rebuild the UI to match the design system instead of carrying over Tailwind markup.
- Keep the slide shell visually stable while wiring functionality under it.
- Centralize language selection so every layer reads the same current language.

## Key Risk Areas
- Next SSR vs client component boundaries
- PDF worker setup in Next
- browser-exposed Gemini keys
- accidental drift between localized UI copy and Gemini prompt language
- over-coupling prototype-specific logic into shared design-system components
