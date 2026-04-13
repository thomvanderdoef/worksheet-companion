# Localization Spec

## Source Repo Reference
The current implementation being extended lives at:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant`

Most relevant current-source files for localization work:
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/App.tsx`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiLiveGuidanceService.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiWorksheetReadAloudService.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/services/geminiWorksheetService.ts`
- `/Users/thomvanderdoef/Documents/Cursor Projects/smartpaper_-student-feedback-assistant/src/content/worksheetSource.ts`

## Requirement
The new prototype must support full language switching between English and Spanish.

This is not limited to worksheet read-aloud. The selected language must control the entire prototype experience.

## Source Of Truth
Use one global language state for the prototype, for example:
- `en`
- `es`

Every layer must read from that same state:
- visible UI copy
- dropdown labels
- button labels
- status text
- error text
- Gemini Live prompts
- worksheet read-aloud script generation
- final feedback text
- spoken encouragement

## Globe Behavior
The globe button in the top shell opens a dropdown.

When the student selects Spanish:
- the app language changes immediately
- visible copy rerenders in Spanish
- future Gemini Live guidance is spoken in Spanish
- worksheet read-aloud uses Spanish
- feedback shown after capture is Spanish
- retry/error/fallback strings are Spanish

When the student selects English, the reverse should happen.

## What Must Be Localized

### Static UI copy
- slide titles if present
- CTA buttons
- status labels
- capture instructions
- loading text
- error text
- retry text
- redo/start-over text
- dropdown option labels

### Dynamic UI copy
- Gemini-driven encouragement shown on screen
- fallback feedback when Gemini output is missing
- messages shown after failed scan attempts

### Gemini Live spoken copy
- slide-entry voice prompts
- live scan guidance
- retry prompts
- final encouragement

### Worksheet audio
- existing worksheet read-aloud behavior
- any loading or stop-state labels connected to that flow

## Implementation Model

### 1. Localized copy dictionary
Create one copy object keyed by language, for example:

```ts
type PrototypeLanguage = 'en' | 'es';
```

The dictionary should own:
- button labels
- status strings
- fallback errors
- non-Gemini instructional copy

### 2. Localized prompt builders
Do not hardcode English prompt strings inline inside components.

Prompt builders should accept the current language and return the correct prompt text for:
- Gemini Live guidance
- read-aloud script generation
- final spoken encouragement
- retry/failure nudges

### 3. Feedback language contract
If the selected language is Spanish, the final feedback shown to the student must be Spanish.

Recommended approach:
- extraction remains structured and language-agnostic where possible
- presentation text and spoken encouragement are generated in the selected language

This avoids coupling image extraction too tightly to one UI language while still keeping the student-facing result localized.

## Migration Impact On Existing Source

### Current state in this repo
Already supported:
- Spanish worksheet read-aloud

Not yet fully supported:
- Spanish buttons
- Spanish capture guidance
- Spanish retry/error copy
- Spanish final feedback everywhere

### Required expansion
Agents porting the prototype must not stop after reusing the current read-aloud language toggle. They need to promote language into app-wide state.

## Guardrails For Agents
- Never let UI language and Gemini spoken language drift apart.
- Never use one-off inline strings if a localized copy source exists.
- When adding new UI text, add both English and Spanish immediately.
- When adding new Gemini prompts, define both language versions in the same place.
- When a fallback string exists, localize it too.

## Verification Checklist
- Switching the globe to Spanish updates visible buttons immediately.
- Slide 2 worksheet listen flow speaks Spanish.
- Slide 3 capture guidance speaks Spanish.
- Slide 3 feedback is shown in Spanish.
- Errors and retry prompts are Spanish.
- Switching back to English updates the whole prototype consistently.
