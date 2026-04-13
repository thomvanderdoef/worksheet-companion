# Design-System Styling Port Guide

This doc set is for quickly restyling the Vite + Tailwind worksheet companion so it visually aligns with the K-1 design-system prototype in `le-design-prototypes`, without first porting the Gemini, camera, PDF, or workflow logic into the Next.js repo.

Visually the designs should match https://www.figma.com/design/7e1ECnOGBchU5fLn7nsqON/Digital-Print-Companion?node-id=80-7834&t=DE0vOZmQqhxXxMSt-11


## Goal

Use the existing working worksheet companion as the behavior source of truth and port over:

- K-1 student visual language
- design-system token values
- layout and shell structure from the new K-1 prototype
- the 3-screen Figma direction for the worksheet companion

## Priority

If speed matters, treat this repo as:

- behavior source of truth
- prototype delivery repo
- temporary integration point for design-system styling

Do not spend time trying to make this repo structurally match the Next.js design-system repo before the prototype is working.

## Source References

### Behavior source of truth in this repo

- `src/App.tsx`
- `src/components/CameraPreview.tsx`
- `src/components/WorksheetPreview.tsx`
- `src/components/OvalButton.tsx`
- `src/services/geminiLiveGuidanceService.ts`
- `src/services/geminiWorksheetReadAloudService.ts`
- `src/services/geminiWorksheetService.ts`

### Visual source of truth in the design-system repo

- `le-design-prototypes/app/globals.css`
- `le-design-prototypes/app/prototypes/student-screen-k1-theme/page.tsx`
- `le-design-prototypes/app/prototypes/student-screen-k1-theme/styles.module.css`
- `le-design-prototypes/app/prototypes/worksheet-companion-v1/page.tsx`
- `le-design-prototypes/app/prototypes/worksheet-companion-v1/styles.module.css`

### Existing port docs in this repo

- `docs/prototype-port/implementation-guide.md`
- `docs/prototype-port/architecture-reference.md`
- `docs/prototype-port/localization-spec.md`

## What To Change First

1. Expand `src/index.css` so it carries the K-1 student token set from the design-system repo.
2. Restyle shared UI shell elements first:
   - top nav
   - home button
   - arrows
   - primary and secondary oval buttons
   - worksheet card
   - camera frame panel
   - feedback card
3. Rebuild `src/App.tsx` layout structure screen by screen without changing the working Gemini flow.
4. Update `CameraPreview.tsx`, `WorksheetPreview.tsx`, and `OvalButton.tsx` to match the new shell.
5. Add the language globe and dropdown to the top shell only after the shell spacing is stable.

## What Not To Change Early

- Gemini prompts
- extraction schemas
- live-guidance behavior
- capture timing
- worksheet parsing logic

Treat service behavior as stable unless a styling change makes a UI contract impossible.

## Success Criteria

- The app still works end to end.
- The app looks like the K-1 worksheet companion direction rather than the original Tailwind demo.
- The top shell feels like a student K-1 product, not a generic web app.
- Language switching is visually integrated into the shell.
- Camera, worksheet preview, and feedback screens feel like one coherent design system.

## Docs In This Folder

- `token-mapping.md`
  Exact token guidance for `src/index.css` and Tailwind-friendly styling rules.
- `screen-and-component-guidance.md`
  Screen-by-screen and component-by-component styling guidance for the current app structure.
