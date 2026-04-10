# SmartPaper: Student Feedback Assistant

SmartPaper is a React + Vite prototype for guiding a student through a worksheet capture flow and generating friendly AI feedback from the completed sheet.

The current app follows a 4-step Figma-inspired experience:

1. View the worksheet image
2. Work on the worksheet offline
3. Use Gemini Live guided capture to scan the completed page
4. Show a celebratory finished state with voice feedback

## What It Does

- Shows a worksheet preview with `Listen` and `Ready` actions
- Plays short Gemini-powered voice prompts during the flow
- Uses the device camera for worksheet capture
- Streams low-res frames to Gemini Live for capture guidance
- Extracts structured worksheet feedback from the final captured image
- Displays the captured page and AI-generated encouragement at the end

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- `motion` for animation
- `lucide-react` for icons
- `@google/genai` for Gemini Live and worksheet extraction

## Local Development

### Prerequisites

- Node.js 18+
- A Gemini API key
- Camera access in your browser

### Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` and add your API key:

```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

3. Start the dev server:

```bash
npm run dev
```

4. Open the local URL shown in the terminal.

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Project Structure

```text
src/
  assets/                 Static worksheet placeholder asset
  components/
    CameraPreview.tsx     Camera feed, frame sampling, still capture
    ConfettiEffect.tsx    Finished-state celebration animation
    OvalButton.tsx        Reusable Figma-style pill button
  services/
    geminiLiveGuidanceService.ts
    geminiWorksheetService.ts
  App.tsx                 Main 4-step workflow
  index.css               Fonts and design tokens
```

## Workflow Notes

- The current worksheet preview is a placeholder asset in `src/assets/worksheet-placeholder.svg`.
- The `Listen` button is currently a UI placeholder for a future Gemini TTS feature.
- Guided capture reuses the existing Gemini Live camera workflow.
- The old empty-worksheet scanning flow has been replaced by the new PDF/worksheet-preview-first flow.

## Build Notes

- `npm run lint` runs TypeScript type-checking with `tsc --noEmit`
- `npm run build` produces a production build in `dist/`
- Vite may choose port `3001` or another port if `3000` is already in use

## Next Improvements

- Replace the placeholder worksheet asset with a real PNG
- Implement the `Listen` button with Gemini speech generation
- Add text highlighting while worksheet instructions are spoken
- Support dynamic worksheet/image loading instead of a hardcoded asset
