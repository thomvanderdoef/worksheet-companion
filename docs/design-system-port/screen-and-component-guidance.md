# Screen And Component Styling Guidance

This doc explains how to restyle the current Vite + Tailwind app screen by screen, while keeping the existing service behavior intact.

## Core Principle

Change structure and styling around the workflow, not the workflow itself.

The current app already has useful behavioral states:

- `start`
- `view_pdf`
- `working`
- `guided_capture`
- `processing`
- `finished`

When styling, keep those states working even if the visible labels become:

- step 1
- step 2
- step 3 capture
- step 3 feedback

## Global Shell

The visual shell should look like a K-1 student experience, not a generic responsive dashboard.

### Top shell requirements

Every major screen should share:

- fixed or visually stable top nav
- left side: home button plus student name block
- center or near-center: current step label
- right side: arrows and step count
- globe button with language dropdown

### Layout tone

Use:

- soft light student background
- big rounded cards
- large tap targets
- obvious primary CTA hierarchy
- centered compositions

Avoid:

- dense desktop UI
- small text-heavy controls
- generic gray dashboards
- hidden or low-contrast controls

## Screen 1: Choice / Start

Current source state:

- `start`

### What it should feel like

This should feel like a welcoming first step, not a utility launch screen.

### Styling goals

- center the main action in a roomy canvas
- include a big worksheet illustration or card mock
- make the primary CTA large and unmistakable
- keep helper copy short and child-friendly

### Layout guidance

- use a centered column layout
- max content width around 960px to 1200px
- keep generous top and bottom breathing room
- use one main hero card instead of several equal-weight panels

### Content hierarchy

1. short title
2. one-sentence helper copy
3. worksheet preview or option card
4. primary CTA

## Screen 2: Worksheet Preview + Listen

Current source state:

- `view_pdf`

### What it should feel like

This is the “look at your worksheet and listen” screen.

### Layout guidance

Use a two-column layout:

- left: worksheet preview card
- right: instructions, listen button, and continue CTA

On narrow screens, stack vertically with the worksheet first.

### Worksheet preview styling

The worksheet container should feel like paper on a soft student UI background:

- bright white paper
- rounded outer card
- subtle raised shadow
- clean framing around the PDF or image

Do not let the PDF frame look like a dark embedded document viewer.

### Listen controls

The listen button should read as a top-level action:

- large white or light face
- strong blue label/icon treatment
- rounded K-1 shape
- clear loading and playing states

### Status copy

Read-aloud status text should live near the listen button, not feel detached from it.

## Screen 3A: Working / Capture Entry

Current source states:

- `working`
- transition into `guided_capture`

### What it should feel like

This is the handoff between worksheet work time and capture time.

### Styling goals

- simplify the visual field
- one strong instruction
- one large “take picture” action
- optional worksheet mini-preview as context

### Recommended layout

- centered instruction card
- large camera CTA beneath
- minimal secondary controls

This is not a place for lots of side content.

## Screen 3B: Guided Capture

Current source state:

- `guided_capture`

### What it should feel like

This should feel like the student is inside a friendly camera helper, not a raw webcam screen.

### Camera container

Wrap the camera in a student-styled card:

- large rounded corners
- soft outer background
- clear frame target
- status chip or bubble over the camera

### Scanning frame

The frame guide should feel soft and supportive:

- white or light border
- subtle scanning line
- no harsh “security scan” vibes

### Capture controls

Manual capture button should match the K-1 primary CTA pattern.

If retry or fallback actions appear, style them as secondary or tertiary actions, not generic web buttons.

### Status text

Use a pill or floating guidance bubble for status:

- short
- easy to read
- kid-friendly
- high contrast over the camera feed

## Screen 3C: Processing

Current source state:

- `processing`

### What it should feel like

This should feel calm and intentional, not like an error wait state.

### Styling goals

- keep the worksheet or captured image visible if possible
- show one primary loading message
- add a soft animated indicator if needed
- avoid busy spinner-heavy UI

### Good patterns

- a centered processing card
- subtle overlay over the capture surface
- one reassuring sentence

## Screen 3D: Feedback / Finished

Current source state:

- `finished`

### What it should feel like

Celebrate effort, not correctness.

### Layout guidance

Use a two-column layout if space allows:

- left: captured worksheet
- right: feedback card and restart controls

Or a stacked layout if the screen feels crowded.

### Feedback card styling

This card should be visually warm and encouraging:

- white surface
- large rounded corners
- strong headline
- positive color accents
- short readable line length

Do not make this feel like a grading report.

### Celebration

Confetti is acceptable, but keep it brief and secondary to the feedback card.

### Restart control

Use a secondary button treatment. Restart should be available but should not visually compete with the main success message.

## Component Guidance

## `src/components/OvalButton.tsx`

Keep this component, but make it the shared source of truth for K-1 raised pill buttons.

### Update goals

- support shell + face + offset model clearly
- support primary, secondary, and disabled styling from semantic tokens
- avoid random fixed grays when token equivalents exist

### Visual rules

- height around existing K-1 size is good
- use blue for primary face
- use white face plus blue text for secondary
- use cool gray shell instead of generic neutral gray
- active press should collapse the bottom offset, not only scale

## `src/components/WorksheetPreview.tsx`

Treat this as a framed worksheet surface, not a utilitarian PDF slot.

### Update goals

- outer card uses K-1 rounded card styling
- remove any overly app-like browser/PDF framing
- overlay controls should look like student buttons
- language slot should visually fit into top shell logic

## `src/components/CameraPreview.tsx`

Keep behavior, restyle presentation.

### Update goals

- move from dark-tech camera framing to friendly classroom framing
- make status overlays match the K-1 shell
- keep scan guide readable without feeling severe
- ensure success overlay uses the same design language as the feedback screen

## `src/App.tsx`

This is the main styling workload.

### Refactor direction

Do not start by rewriting state logic.

Instead:

1. isolate repeated shell wrappers
2. normalize max widths and padding
3. convert each workflow screen into a predictable visual composition
4. introduce nav shell and shared content container

### Good intermediate state

It is acceptable if `App.tsx` remains the orchestrator while its JSX becomes more structured and easier to style.

## Language Switcher Styling

The globe is important because the port docs define language as app-wide state, not a worksheet-only control.

### Requirements

- place it in the top shell
- make it obvious but not dominant
- dropdown should feel like part of the student shell
- selected language should update visible text immediately

### Visual treatment

- circular or pill button
- white face on cool-gray shell
- dropdown surface in white
- active option highlighted in student blue

## Motion Guidance

Use motion sparingly.

### Good motion

- hover color shift
- press offset collapse
- fade or scale for overlays
- short loading transitions

### Avoid

- spring-heavy bounces
- long page transitions
- playful movement on every element

## Fastest Implementation Order

1. Upgrade `src/index.css` token set.
2. Restyle `OvalButton`.
3. Add shared top shell to `App.tsx`.
4. Restyle `view_pdf` screen.
5. Restyle `guided_capture` screen.
6. Restyle `finished` screen.
7. Add globe and dropdown styling.
8. Tune spacing and responsive behavior.

## Final QA Checklist

- All screens feel like the same K-1 product.
- Primary blue and cool-gray tokens are used consistently.
- Buttons use raised K-1 depth treatment.
- The worksheet surface reads as paper.
- Camera flow feels friendly and guided.
- Feedback feels effort-based and celebratory.
- Focus states are visible.
- The app still works with the existing Gemini services unchanged.
