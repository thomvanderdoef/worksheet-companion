export type PrototypeLanguage = "en" | "es";

export interface LanguageOption {
  value: PrototypeLanguage;
  label: string;
}

interface FeedbackVoicePromptParams {
  exactMessage: string;
  caution?: string;
  visualWorkSummary?: string;
  showedWork: boolean;
}

interface PrototypeCopy {
  appTitle: string;
  apiKeyMissing: string;
  languageOptions: LanguageOption[];
  languageButtonLabel: (label: string) => string;
  topShell: {
    goHome: string;
    expand: string;
    previousStep: string;
    nextStep: string;
  };
  buttons: {
    startQuizWorksheet: string;
    uploadDifferentWorksheet: string;
    uploadFinishedWorksheet: string;
    takePicture: string;
    captureNow: string;
    capturing: string;
    listen: string;
    stop: string;
    loading: string;
    redo: string;
  };
  prototypeNotice: string;
  statuses: {
    initialLiveGuidance: string;
    liveGuidanceUnavailable: string;
    connectingLiveGuidance: string;
    allDone: string;
    scanRetry: string;
    readingAnswers: string;
    scanError: string;
    capturingCurrentFrame: string;
    readAloudUnavailable: string;
  };
  captureCaption: {
    liveUnavailable: string;
    connecting: string;
  };
  prompts: {
    viewPdf: string;
    working: string;
    retryScan: string;
    scanError: string;
  };
  worksheetPreview: {
    title: string;
    previewAlt: string;
    loading: string;
    fallback: string;
  };
  cameraPreview: {
    cameraAccessNeeded: string;
    workCaptured: string;
    reviewFeedback: string;
  };
  capturedWorksheetAlt: string;
  feedback: {
    defaultSummary: string;
    loadingMessage: string;
    fallbackSummary: (answeredCount: number, totalCount: number) => string;
    fallbackVoice: (answeredCount: number, totalCount: number) => string;
    voiceWorkPraise: string;
    fallbackNextStep: string;
    caution: string;
    genericEffort: string;
    startedWork: string;
    noResponseExtracted: string;
    noResponseNotes: string;
    incompleteEvidence: string;
    incompleteStudentFeedback: string;
    incompleteTeacherNote: string;
    unclearEvidence: string;
    unclearStudentFeedback: string;
    unclearTeacherNote: string;
    exactMatchEvidence: (actual: string, expected: string) => string;
    exactMatchStudentFeedback: string;
    incorrectEvidence: (actual: string, expected: string) => string;
    unmatchedEvidence: string;
    genericCoaching: string;
    coachingQ11: string;
    coachingQ12: string;
    fallbackAnalysisPrompt: string;
  };
  readAloud: {
    connectionTimedOut: string;
    connectFailed: string;
    closedEarly: string;
    unableToStart: string;
    goAway: string;
    closingInstruction: string;
    generationTargetLanguage: string;
    generationPrompt: (worksheetText: string, targetLanguage: string) => string;
    speechInstruction: string;
    readPrefix: string;
  };
  liveGuidance: {
    voiceName: string;
    systemInstruction: string;
    recurringPrompt: string;
  };
}

const COPY: Record<PrototypeLanguage, PrototypeCopy> = {
  en: {
    appTitle: "Smart Paper Student Feedback Assistant",
    apiKeyMissing: "API Key missing. Set VITE_GEMINI_API_KEY in .env.local",
    languageOptions: [
      { value: "en", label: "English" },
      { value: "es", label: "Español" },
    ],
    languageButtonLabel: (label) => `Language: ${label}`,
    topShell: {
      goHome: "Go home",
      expand: "Expand",
      previousStep: "Previous step",
      nextStep: "Next step",
    },
    buttons: {
      startQuizWorksheet: "Start Quiz Worksheet",
      uploadDifferentWorksheet: "Upload a Different Worksheet",
      uploadFinishedWorksheet: "Upload Finished Worksheet",
      takePicture: "Take Picture",
      captureNow: "Capture Now",
      capturing: "Capturing",
      listen: "Listen",
      stop: "Stop",
      loading: "Loading",
      redo: "Redo",
    },
    prototypeNotice: "These options are visible for prototyping purposes only.",
    statuses: {
      initialLiveGuidance: "Hold up your worksheet so I can see it!",
      liveGuidanceUnavailable: "Live guidance unavailable - tap Capture when ready.",
      connectingLiveGuidance: "Connecting to live guidance...",
      allDone: "All done! Great work.",
      scanRetry: "Almost! I couldn't read everything. Hold it up one more time!",
      readingAnswers: "Reading your answers...",
      scanError: "Oops, something went wrong. Let's try again!",
      capturingCurrentFrame: "Capturing current frame...",
      readAloudUnavailable: "Unable to read the worksheet aloud right now.",
    },
    captureCaption: {
      liveUnavailable: "Live guidance unavailable. Use Capture Now.",
      connecting: "Connecting to live guidance...",
    },
    prompts: {
      viewPdf:
        'Tell the student in a cheerful, short way: "Hi there, click the blue button to listen to the instructions for your worksheet. Go to the next slide button when you are ready to start working on your worksheet." Keep it under 10 seconds.',
      working:
        'Tell the student in a cheerful, short way: "Now grab your pencil and work on your worksheet. When you are all done, come back and press the big blue Take Picture button so I can see your work!" Keep it under 10 seconds.',
      retryScan:
        "The scan didn't work. Tell the student in a friendly way: almost! I couldn't quite read everything. Let's try one more time - hold up the whole worksheet nice and steady.",
      scanError:
        "Something went wrong with the scan. Tell the student: oops, let me try that again - hold up your worksheet one more time!",
    },
    worksheetPreview: {
      title: "Quiz: Sub-Unit 1",
      previewAlt: "Sub-Unit 1 math quiz PDF",
      loading: "Loading worksheet...",
      fallback: "Falling back to PDF preview...",
    },
    cameraPreview: {
      cameraAccessNeeded: "Camera access is needed to scan the worksheet.",
      workCaptured: "Work Captured!",
      reviewFeedback: "Review your feedback below.",
    },
    capturedWorksheetAlt: "Your completed worksheet",
    feedback: {
      defaultSummary: "Nice work finishing your worksheet.",
      loadingMessage: "Getting your feedback ready in English...",
      fallbackSummary: (answeredCount, totalCount) =>
        `You completed ${answeredCount} of ${totalCount} questions.`,
      fallbackVoice: (answeredCount, totalCount) =>
        `You answered ${answeredCount} out of ${totalCount} questions and showed your thinking.`,
      voiceWorkPraise:
        "The student showed their thinking and work on the paper - make sure that praise stays in the message.",
      fallbackNextStep: "Keep checking each problem one careful step at a time.",
      caution: "Some parts of the worksheet were hard to read, so this feedback stays cautious.",
      genericEffort: "Nice work!",
      startedWork: "You got started on the worksheet and showed me part of your thinking.",
      noResponseExtracted: "No visible response was extracted for this prompt.",
      noResponseNotes: "No response was extracted for this prompt.",
      incompleteEvidence: "No clear student answer was extracted for this problem.",
      incompleteStudentFeedback:
        "You can come back to this problem and show your work one step at a time.",
      incompleteTeacherNote: "No completed response was extracted for this question.",
      unclearEvidence: "The writing on this answer is too unclear to evaluate safely.",
      unclearStudentFeedback:
        "I can see you worked on this one. Try writing the answer a little darker so it is easier to check.",
      unclearTeacherNote: "Legibility is too low for a safe correctness call.",
      exactMatchEvidence: (actual, expected) =>
        `The extracted answer "${actual}" matches the expected answer "${expected}".`,
      exactMatchStudentFeedback:
        "Nice job checking this problem carefully and showing your work.",
      incorrectEvidence: (actual, expected) =>
        `The extracted answer "${actual}" does not match the expected answer "${expected}".`,
      unmatchedEvidence:
        "The extracted answer could not be matched to the expected answer confidently.",
      genericCoaching:
        "You showed your thinking here. Try checking the numbers one more careful step at a time.",
      coachingQ11:
        "You showed your work here. Check the tens and ones again to make sure they add up to the total.",
      coachingQ12:
        "You are close. Solve the addition first, then write that total in the blank on the left side.",
      fallbackAnalysisPrompt:
        "Keep checking each problem one step at a time.",
    },
    readAloud: {
      connectionTimedOut: "Read-aloud connection timed out.",
      connectFailed: "Gemini read-aloud failed to connect.",
      closedEarly: "Read-aloud connection closed early.",
      unableToStart: "Unable to start worksheet audio.",
      goAway: "Gemini asked to end the read-aloud session.",
      closingInstruction: "Click the next slide button when you are ready to start.",
      generationTargetLanguage: "English",
      generationPrompt: (worksheetText, targetLanguage) =>
        [
          `You are preparing a worksheet read-aloud for a young student in ${targetLanguage}.`,
          "Use only the worksheet content provided below.",
          "Keep the instructions faithful to the worksheet, but make the spoken delivery easy for a child to follow.",
          "Do not greet the student. Start directly with the worksheet title or directions.",
          "Read the worksheet title, directions, and each problem in order.",
          "Do not solve the problems.",
          "Do not add teacher commentary, extra introductions, or extra closings.",
          `Return the final script entirely in ${targetLanguage}.`,
          "Break the spoken script into short `spokenSegments` that could later be highlighted on screen.",
          "",
          "Worksheet source text:",
          worksheetText,
        ].join("\n"),
      speechInstruction: [
        "You are reading a worksheet aloud to a young student.",
        "Speak fully in English.",
        "Read the provided script exactly.",
        "Do not add greetings, teacher commentary, explanations, or answers.",
        "Use a warm, patient, child-friendly tone.",
      ].join(" "),
      readPrefix: "Read this worksheet aloud exactly as written. Do not add commentary.",
    },
    liveGuidance: {
      voiceName: "Puck",
      systemInstruction: `You are a friendly classroom assistant helping a young student scan their worksheet with a camera. You are watching their camera feed.

Your ONLY job is to guide them to hold up the worksheet properly:
- When you first connect, say: "Hold up your worksheet and make sure I can see the whole page!"
- If no paper is visible, say "Hold up your worksheet so I can see it!"
- If you can see a worksheet and can read the printed text on it, call readyToCapture IMMEDIATELY. Be eager to capture!
- Only give positioning advice if the paper is very blurry, mostly out of frame, or you truly cannot read the text.
- Fingers holding the paper are totally fine.

You should call readyToCapture within a few seconds of seeing a readable worksheet. Err on the side of capturing too early - the system will ask to try again if the image wasn't good enough.
Speak in short, encouraging sentences a child can understand.
Do NOT read or comment on the worksheet content. Stay focused on scanning.

IMPORTANT: When the system sends you a message (not the student), follow its instructions. For example if it tells you the scan failed, relay that to the student in a friendly way.`,
      recurringPrompt: "Look at the camera and guide me.",
    },
  },
  es: {
    appTitle: "Asistente de comentarios para hojas de trabajo",
    apiKeyMissing: "Falta la API key. Agrega VITE_GEMINI_API_KEY en .env.local",
    languageOptions: [
      { value: "en", label: "English" },
      { value: "es", label: "Español" },
    ],
    languageButtonLabel: (label) => `Idioma: ${label}`,
    topShell: {
      goHome: "Ir al inicio",
      expand: "Expandir",
      previousStep: "Paso anterior",
      nextStep: "Siguiente paso",
    },
    buttons: {
      startQuizWorksheet: "Empezar hoja de quiz",
      uploadDifferentWorksheet: "Subir otra hoja de trabajo",
      uploadFinishedWorksheet: "Subir hoja terminada",
      takePicture: "Tomar foto",
      captureNow: "Capturar ahora",
      capturing: "Capturando",
      listen: "Escuchar",
      stop: "Detener",
      loading: "Cargando",
      redo: "Rehacer",
    },
    prototypeNotice: "Estas opciones solo se muestran para fines del prototipo.",
    statuses: {
      initialLiveGuidance: "Levanta tu hoja para que pueda verla.",
      liveGuidanceUnavailable: "La guia por voz no esta disponible. Toca Capturar cuando estes listo.",
      connectingLiveGuidance: "Conectando con la guia por voz...",
      allDone: "Listo. Muy buen trabajo.",
      scanRetry: "Casi. No pude leer todo. Levantala una vez mas.",
      readingAnswers: "Leyendo tus respuestas...",
      scanError: "Ups, algo salio mal. Vamos a intentarlo otra vez.",
      capturingCurrentFrame: "Capturando la imagen actual...",
      readAloudUnavailable: "No pude leer la hoja en voz alta ahora mismo.",
    },
    captureCaption: {
      liveUnavailable: "La guia por voz no esta disponible. Usa Capturar ahora.",
      connecting: "Conectando con la guia por voz...",
    },
    prompts: {
      viewPdf:
        'Dile al estudiante de una manera alegre y corta: "Hola, toca el boton azul para escuchar las instrucciones de tu hoja. Ve al boton de la siguiente diapositiva cuando estes listo para empezar a trabajar en tu hoja." Mantenlo por debajo de 10 segundos.',
      working:
        'Dile al estudiante de una manera alegre y corta: "Ahora toma tu lapiz y trabaja en tu hoja. Cuando termines, vuelve y presiona el gran boton azul de Tomar foto para que pueda ver tu trabajo." Mantenlo por debajo de 10 segundos.',
      retryScan:
        "La captura no funciono. Dile al estudiante de forma amable: casi. No pude leer todo bien. Intentemos una vez mas. Levanta toda la hoja y mantenla quieta.",
      scanError:
        "Algo salio mal con la captura. Dile al estudiante: ups, voy a intentarlo otra vez. Levanta tu hoja una vez mas.",
    },
    worksheetPreview: {
      title: "Quiz: Subunidad 1",
      previewAlt: "PDF del quiz de matematicas de la subunidad 1",
      loading: "Cargando hoja...",
      fallback: "Mostrando la vista previa PDF alternativa...",
    },
    cameraPreview: {
      cameraAccessNeeded: "Se necesita acceso a la camara para escanear la hoja.",
      workCaptured: "Trabajo capturado",
      reviewFeedback: "Revisa tus comentarios abajo.",
    },
    capturedWorksheetAlt: "Tu hoja terminada",
    feedback: {
      defaultSummary: "Buen trabajo terminando tu hoja.",
      loadingMessage: "Preparando tus comentarios en espanol...",
      fallbackSummary: (answeredCount, totalCount) =>
        `Completaste ${answeredCount} de ${totalCount} preguntas.`,
      fallbackVoice: (answeredCount, totalCount) =>
        `Respondiste ${answeredCount} de ${totalCount} preguntas y mostraste tu pensamiento.`,
      voiceWorkPraise:
        "El estudiante mostro su pensamiento y su trabajo en el papel. Asegurate de mantener ese elogio en el mensaje.",
      fallbackNextStep: "Sigue revisando cada problema con cuidado, paso por paso.",
      caution: "Algunas partes de la hoja fueron dificiles de leer, asi que estos comentarios son cautelosos.",
      genericEffort: "Buen trabajo.",
      startedWork: "Empezaste la hoja y me mostraste parte de tu pensamiento.",
      noResponseExtracted: "No se extrajo una respuesta visible para esta pregunta.",
      noResponseNotes: "No se extrajo una respuesta para esta pregunta.",
      incompleteEvidence: "No se extrajo una respuesta clara del estudiante para este problema.",
      incompleteStudentFeedback:
        "Puedes volver a este problema y mostrar tu trabajo paso por paso.",
      incompleteTeacherNote: "No se extrajo una respuesta completa para esta pregunta.",
      unclearEvidence: "La escritura de esta respuesta esta demasiado poco clara para evaluarla con seguridad.",
      unclearStudentFeedback:
        "Puedo ver que trabajaste en esta. Intenta escribir la respuesta un poco mas oscuro para que sea mas facil revisarla.",
      unclearTeacherNote: "La legibilidad es demasiado baja para decidir con seguridad.",
      exactMatchEvidence: (actual, expected) =>
        `La respuesta extraida "${actual}" coincide con la respuesta esperada "${expected}".`,
      exactMatchStudentFeedback:
        "Buen trabajo revisando este problema con cuidado y mostrando tu trabajo.",
      incorrectEvidence: (actual, expected) =>
        `La respuesta extraida "${actual}" no coincide con la respuesta esperada "${expected}".`,
      unmatchedEvidence:
        "La respuesta extraida no se pudo relacionar con seguridad con la respuesta esperada.",
      genericCoaching:
        "Mostraste tu pensamiento aqui. Intenta revisar los numeros con mas cuidado, paso por paso.",
      coachingQ11:
        "Mostraste tu trabajo aqui. Revisa las decenas y las unidades otra vez para asegurarte de que suman el total.",
      coachingQ12:
        "Estas cerca. Resuelve primero la suma y luego escribe ese total en el espacio en blanco del lado izquierdo.",
      fallbackAnalysisPrompt: "Sigue revisando cada problema paso por paso.",
    },
    readAloud: {
      connectionTimedOut: "Se agoto el tiempo de conexion de la lectura en voz alta.",
      connectFailed: "La lectura en voz alta de Gemini no pudo conectarse.",
      closedEarly: "La conexion de lectura en voz alta se cerro demasiado pronto.",
      unableToStart: "No se pudo iniciar el audio de la hoja.",
      goAway: "Gemini pidio terminar la sesion de lectura en voz alta.",
      closingInstruction: "Haz clic en el boton de la siguiente diapositiva cuando estes listo para empezar.",
      generationTargetLanguage: "Spanish",
      generationPrompt: (worksheetText, targetLanguage) =>
        [
          `Estas preparando una lectura en voz alta de una hoja para un estudiante pequeno en ${targetLanguage}.`,
          "Usa solo el contenido de la hoja que aparece abajo.",
          "Mantente fiel a la hoja, pero haz que la forma de hablar sea facil de seguir para un nino.",
          "No saludes al estudiante. Empieza directamente con el titulo o las instrucciones.",
          "Lee el titulo de la hoja, las instrucciones y cada problema en orden.",
          "No resuelvas los problemas.",
          "No agregues comentarios del maestro, introducciones extra ni cierres extra.",
          `Devuelve el guion final completamente en ${targetLanguage}.`,
          "Divide el guion hablado en `spokenSegments` cortos para que despues se puedan resaltar en pantalla.",
          "",
          "Texto fuente de la hoja:",
          worksheetText,
        ].join("\n"),
      speechInstruction: [
        "Estas leyendo una hoja de trabajo en voz alta para un estudiante pequeno.",
        "Habla completamente en espanol.",
        "Lee exactamente el guion proporcionado.",
        "No agregues saludos, comentarios del maestro, explicaciones ni respuestas.",
        "Usa un tono calido, paciente y amigable para ninos.",
      ].join(" "),
      readPrefix: "Lee esta hoja en voz alta exactamente como esta escrita. No agregues comentarios.",
    },
    liveGuidance: {
      voiceName: "Kore",
      systemInstruction: `Eres un asistente amigable de aula que ayuda a un estudiante pequeno a escanear su hoja con una camara. Estas mirando la imagen de su camara.

Tu UNICO trabajo es guiarlo para que sostenga bien la hoja:
- Cuando te conectes por primera vez, di: "Levanta tu hoja y asegurate de que pueda ver toda la pagina."
- Si no se ve papel, di: "Levanta tu hoja para que pueda verla."
- Si puedes ver una hoja y leer el texto impreso, llama a readyToCapture DE INMEDIATO. Debes querer capturar pronto.
- Solo da consejos de posicion cuando el papel este muy borroso, casi fuera del cuadro o de verdad no puedas leer el texto.
- No pasa nada si se ven dedos sujetando la hoja.

Debes llamar a readyToCapture a los pocos segundos de ver una hoja legible. Prefiere capturar un poco antes de tiempo: el sistema pedira otro intento si la imagen no fue suficiente.
Habla en oraciones cortas y animadoras que un nino pueda entender.
NO leas ni comentes el contenido de la hoja. Enfocate solo en el escaneo.

IMPORTANTE: Cuando el sistema te envie un mensaje (no el estudiante), sigue sus instrucciones. Por ejemplo, si te dice que la captura fallo, transmiteselo al estudiante de manera amable.`,
      recurringPrompt: "Mira la camara y guiame.",
    },
  },
};

export function getPrototypeCopy(language: PrototypeLanguage): PrototypeCopy {
  return COPY[language];
}

export function getVoiceName(language: PrototypeLanguage): string {
  return COPY[language].liveGuidance.voiceName;
}

export function buildLiveGuidanceSystemInstruction(language: PrototypeLanguage): string {
  return COPY[language].liveGuidance.systemInstruction;
}

export function buildLiveGuidancePrompt(language: PrototypeLanguage): string {
  return COPY[language].liveGuidance.recurringPrompt;
}

export function buildReadAloudPrompt(
  worksheetText: string,
  language: PrototypeLanguage
): string {
  const copy = COPY[language].readAloud;
  return copy.generationPrompt(worksheetText, copy.generationTargetLanguage);
}

export function buildReadAloudSpeechInstruction(language: PrototypeLanguage): string {
  return COPY[language].readAloud.speechInstruction;
}

export function buildFeedbackVoicePromptText(
  language: PrototypeLanguage,
  params: FeedbackVoicePromptParams
): string {
  const copy = COPY[language];
  const intro = language === "es"
    ? "Lee el siguiente mensaje al estudiante con una voz corta, calida y amigable para ninos."
    : "Read the following message exactly to the student in a short, warm, child-friendly voice.";
  const exactLabel = language === "es" ? "Mensaje exacto" : "Exact message";
  const cautionLabel = language === "es"
    ? "Si se siente natural, agrega despues esta breve precaucion"
    : "If it fits naturally, add this short caution afterward";
  const summaryLabel = language === "es"
    ? "Resumen del trabajo visible"
    : "Visible work summary";
  const noExtras = language === "es"
    ? "No agregues saludos, comentarios extra ni analisis nuevo."
    : "Do not add greetings, extra commentary, or new analysis.";
  const timing = language === "es"
    ? "Mantenlo corto (unos 10 a 15 segundos), calido y animador para un estudiante pequeno."
    : "Keep it short (about 10-15 seconds of speaking), warm, and encouraging for a young student.";

  return [
    intro,
    `${exactLabel}: "${params.exactMessage}"`,
    params.caution ? `${cautionLabel}: "${params.caution}"` : "",
    params.visualWorkSummary ? `${summaryLabel}: ${params.visualWorkSummary}` : "",
    params.showedWork ? copy.feedback.voiceWorkPraise : "",
    "",
    noExtras,
    timing,
  ].filter(Boolean).join("\n");
}

export function buildFeedbackSummaryText(
  language: PrototypeLanguage,
  parts: Array<string | undefined | null>
): string {
  const filtered = parts.filter(Boolean).map((part) => String(part).trim()).filter(Boolean);
  if (filtered.length > 0) {
    return filtered.join(" ");
  }

  return COPY[language].feedback.defaultSummary;
}
