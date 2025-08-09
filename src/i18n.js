// Simple i18n utility for the extension (en/es)
// Usage:
//  - Add data-i18n="key.path" to elements to translate textContent
//  - Optionally add data-i18n-attr="placeholder|title|aria-label" to translate attributes
//  - Call initI18n() on each page to apply translations

import { getLanguage } from "./storage.js";

const locales = {
  en: {
    app: {
      brand: "Policy TL;DR",
      title: "Privacy Policy Summary",
      subtitle: "I'll read the boring bits so you don't have to",
      brandAlt: "Brand raccoon",
    },
    tabs: {
      summary: "Summary",
      history: "History",
      settings: "Settings",
    },
    buttons: {
      summarize: "Summarize Policy",
      resummarize: "Re-summarize",
      clearAll: "Clear All",
      view: "View",
      addLink: "Add Link",
      apiKeyLabel: "API Key:",
      languageLabel: "Preferred Language:",
      languageHelp: "Language for AI responses and summaries",
      aiSettings: "AI Model Settings",
      providerLabel: "AI Provider:",
      providerHelp: "Select the AI service provider",
      modelLabel: "Model:",
      modelHelp: "Choose a supported model for the selected provider",
      temperatureLabel: "Temperature:",
      temperatureHelp: "Controls randomness (0=deterministic, 2=very random)",
      maxTokensLabel: "Max Tokens:",
      maxTokensHelp: "Maximum tokens for AI responses (affects cost and response length)",
      openSettings: "Open settings",
      saveSettings: "Save Settings",
        ignore: "Don't ask again",
        remind: "Remind me later",
        summarizing: "Summarizing...",
        ok: "OK",
        cancel: "Cancel",
      },
    language: {
      autodetect: "Auto-detect",
      en: "English",
      es: "Spanish",
      fr: "French",
      pt: "Portuguese",
      de: "German",
      it: "Italian",
    },
    summary: {
      placeholderTitle: "No summary available",
      placeholderSubtitle: "Click \"Summarize Policy\" and relax",
      privacyScore: "Privacy Score",
      analyzing: "Skimming the fine print...",
      collectingPolicy: "Fetching the fine print...",
      sendingRequest: "Asking the AI to read it...",
      waitingModel: "Waiting for the AI to finish...",
      scoreNotAvailable: "Score not available",
      scoreExplanationNotAvailable: "Score explanation not available",
    },
    history: {
      emptyTitle: "No history yet",
      emptySubtitle: "Summaries will appear here — so you don’t have to read later",
      scoreBadge: "Score: {score}/10",
    },
    alerts: {
      apiKeyRequired: "API key is required",
      settingsSaved: "Settings saved successfully",
      cacheCleared: "All summaries cleared",
      summaryDeleted: "Summary deleted",
      noPolicy: "No privacy policy detected on this page",
      summaryGenerated: "Summary generated successfully",
      failedGenerate: "Failed to generate summary",
      errorOccurred: "An error occurred while summarizing",
      temperatureRange: "Temperature must be between 0 and 2",
      maxTokensRange: "Max tokens must be between 100 and 4000",
    },
    error: {
      title: "Error occurred",
      checkConnection: "Please check your connection and try again",
      failedSummaryTitle: "Failed to summarize policy",
      failedSummarySubtitle: "Please try again or check your API key",
    },
    confirm: {
      clearAll: "Are you sure you want to clear all summaries?",
    },
    options: {
      tagline: "Too Long; Didn’t Read — I’ll read it for you",
      languageTitle: "Language Settings",
    },
    inputs: {
      manualUrlPlaceholder: "https://example.com/policy",
      apiKeyPlaceholder: "Enter your API key",
    },
  },
  es: {
    app: {
      brand: "Policy TL;DR",
      title: "Resumen de Política de Privacidad",
      subtitle: "Me leo la letra pequeña para que tú no tengas que hacerlo",
      brandAlt: "Mapache de la marca",
    },
    tabs: {
      summary: "Resumen",
      history: "Historial",
      settings: "Configuración",
    },
    buttons: {
      summarize: "Resumir Política",
      resummarize: "Volver a resumir",
      clearAll: "Borrar todo",
      view: "Ver",
      addLink: "Agregar enlace",
      apiKeyLabel: "Clave API:",
      languageLabel: "Idioma preferido:",
      languageHelp: "Idioma para respuestas y resúmenes de la IA",
      aiSettings: "Configuración del modelo de IA",
      providerLabel: "Proveedor de IA:",
      providerHelp: "Selecciona el proveedor de IA",
      modelLabel: "Modelo:",
      modelHelp: "Elige un modelo soportado para el proveedor seleccionado",
      temperatureLabel: "Temperatura:",
      temperatureHelp: "Controla la aleatoriedad (0=determinista, 2=muy aleatorio)",
      maxTokensLabel: "Tokens máximos:",
      maxTokensHelp: "Tokens máximos por respuesta (afecta coste y longitud)",
      openSettings: "Abrir configuración",
      saveSettings: "Guardar configuración",
        ignore: "No volver a preguntar",
        remind: "Recordar más tarde",
        summarizing: "Resumiendo...",
        ok: "Aceptar",
        cancel: "Cancelar",
      },
    language: {
      autodetect: "Detección automática",
      en: "Inglés",
      es: "Español",
      fr: "Francés",
      pt: "Portugués",
      de: "Alemán",
      it: "Italiano",
    },
    summary: {
      placeholderTitle: "No hay resumen disponible",
      placeholderSubtitle: "Haz clic en \"Resumir Política\" y sigue a lo tuyo",
      privacyScore: "Puntuación de Privacidad",
      analyzing: "Ojeando la letra pequeña...",
      collectingPolicy: "Recogiendo la letra pequeña...",
      sendingRequest: "Pidiéndole a la IA que lo lea...",
      waitingModel: "Esperando a que la IA termine...",
      scoreNotAvailable: "Puntuación no disponible",
      scoreExplanationNotAvailable: "Explicación de la puntuación no disponible",
    },
    history: {
      emptyTitle: "Aún no hay historial",
      emptySubtitle: "Los resúmenes aparecerán aquí — así no tienes que leer luego",
      scoreBadge: "Puntuación: {score}/10",
    },
    alerts: {
      apiKeyRequired: "Se requiere la clave API",
      settingsSaved: "Configuración guardada con éxito",
      cacheCleared: "Se han borrado todos los resúmenes",
      summaryDeleted: "Resumen eliminado",
      noPolicy: "No se detectó una política de privacidad en esta página",
      summaryGenerated: "Resumen generado con éxito",
      failedGenerate: "No se pudo generar el resumen",
      errorOccurred: "Ocurrió un error al resumir",
      temperatureRange: "La temperatura debe estar entre 0 y 2",
      maxTokensRange: "Los tokens máximos deben estar entre 100 y 4000",
    },
    error: {
      title: "Ocurrió un error",
      checkConnection: "Por favor revisa tu conexión e inténtalo de nuevo",
      failedSummaryTitle: "Fallo al resumir la política",
      failedSummarySubtitle: "Intenta de nuevo o comprueba tu clave API",
    },
    confirm: {
      clearAll: "¿Seguro que quieres borrar todos los resúmenes?",
    },
    options: {
      tagline: "Too Long; Didn’t Read — lo leo por ti",
      languageTitle: "Configuración de idioma",
    },
    inputs: {
      manualUrlPlaceholder: "https://ejemplo.com/politica",
      apiKeyPlaceholder: "Introduce tu clave API",
    },
  },
  fr: {
    app: {
      brand: "Policy TL;DR",
      title: "Résumé de la politique de confidentialité",
      subtitle: "Je lis les trucs barbants à votre place",
      brandAlt: "Raton laveur de la marque",
    },
    tabs: {
      summary: "Résumé",
      history: "Historique",
      settings: "Paramètres",
    },
    buttons: {
      summarize: "Résumer la politique",
      resummarize: "Résumer à nouveau",
      clearAll: "Tout effacer",
      view: "Voir",
      addLink: "Ajouter un lien",
      apiKeyLabel: "Clé API :",
      languageLabel: "Langue préférée :",
      languageHelp: "Langue des réponses et résumés de l'IA",
      aiSettings: "Paramètres du modèle d'IA",
      providerLabel: "Fournisseur d'IA :",
      providerHelp: "Sélectionnez le fournisseur d'IA",
      modelLabel: "Modèle :",
      modelHelp: "Choisissez un modèle pris en charge pour le fournisseur sélectionné",
      temperatureLabel: "Température :",
      temperatureHelp: "Contrôle l'aléatoire (0=déterministe, 2=très aléatoire)",
      maxTokensLabel: "Jetons max :",
      maxTokensHelp: "Jetons maximum par réponse (coût et longueur)",
      openSettings: "Ouvrir les paramètres",
      saveSettings: "Enregistrer les paramètres",
        ignore: "Ne plus demander",
        remind: "Me le rappeler plus tard",
        summarizing: "Résumé en cours...",
        ok: "OK",
        cancel: "Annuler",
      },
    language: {
      autodetect: "Détection automatique",
      en: "Anglais",
      es: "Espagnol",
      fr: "Français",
      pt: "Portugais",
      de: "Allemand",
      it: "Italien",
    },
    summary: {
      placeholderTitle: "Aucun résumé disponible",
      placeholderSubtitle: "Cliquez sur \"Résumer la politique\" et détendez‑vous",
      privacyScore: "Score de confidentialité",
      analyzing: "On survole les petites lignes...",
      collectingPolicy: "Récupération des petites lignes...",
      sendingRequest: "On demande à l’IA de s’en charger...",
      waitingModel: "On attend que l’IA finisse...",
      scoreNotAvailable: "Score non disponible",
      scoreExplanationNotAvailable: "Explication du score non disponible",
    },
    history: {
      emptyTitle: "Pas encore d'historique",
      emptySubtitle: "Les résumés apparaîtront ici — pour éviter de lire plus tard",
      scoreBadge: "Score : {score}/10",
    },
    alerts: {
      apiKeyRequired: "La clé API est requise",
      settingsSaved: "Paramètres enregistrés avec succès",
      cacheCleared: "Tous les résumés ont été effacés",
      summaryDeleted: "Résumé supprimé",
      noPolicy: "Aucune politique de confidentialité détectée sur cette page",
      summaryGenerated: "Résumé généré avec succès",
      failedGenerate: "Échec de la génération du résumé",
      errorOccurred: "Une erreur s'est produite lors du résumé",
      temperatureRange: "La température doit être comprise entre 0 et 2",
      maxTokensRange: "Le nombre maximal de jetons doit être compris entre 100 et 4000",
    },
    error: {
      title: "Une erreur s'est produite",
      checkConnection: "Veuillez vérifier votre connexion et réessayer",
      failedSummaryTitle: "Échec du résumé de la politique",
      failedSummarySubtitle: "Réessayez ou vérifiez votre clé API",
    },
    confirm: {
      clearAll: "Voulez-vous vraiment effacer tous les résumés ?",
    },
    options: {
      tagline: "Too Long; Didn’t Read — je le lis pour vous",
      languageTitle: "Paramètres de langue",
    },
    inputs: {
      manualUrlPlaceholder: "https://exemple.com/politique",
      apiKeyPlaceholder: "Entrez votre clé API",
    },
  },
  pt: {
    app: {
      brand: "Policy TL;DR",
      title: "Resumo da Política de Privacidade",
      subtitle: "Eu leio a parte chata por você",
      brandAlt: "Guaxinim da marca",
    },
    tabs: {
      summary: "Resumo",
      history: "Histórico",
      settings: "Configurações",
    },
    buttons: {
      summarize: "Resumir política",
      resummarize: "Resumir novamente",
      clearAll: "Limpar tudo",
      view: "Ver",
      addLink: "Adicionar link",
      apiKeyLabel: "Chave da API:",
      languageLabel: "Idioma preferido:",
      languageHelp: "Idioma para respostas e resumos da IA",
      aiSettings: "Configurações do modelo de IA",
      providerLabel: "Provedor de IA:",
      providerHelp: "Selecione o provedor de IA",
      modelLabel: "Modelo:",
      modelHelp: "Escolha um modelo compatível para o provedor selecionado",
      temperatureLabel: "Temperatura:",
      temperatureHelp: "Controla a aleatoriedade (0=determinístico, 2=muito aleatório)",
      maxTokensLabel: "Máx. de tokens:",
      maxTokensHelp: "Máximo de tokens por resposta (custo e tamanho)",
      openSettings: "Abrir configurações",
      saveSettings: "Salvar configurações",
        ignore: "Não perguntar novamente",
        remind: "Lembrar mais tarde",
        summarizing: "Resumindo...",
        ok: "OK",
        cancel: "Cancelar",
      },
    language: {
      autodetect: "Detecção automática",
      en: "Inglês",
      es: "Espanhol",
      fr: "Francês",
      pt: "Português",
      de: "Alemão",
      it: "Italiano",
    },
    summary: {
      placeholderTitle: "Nenhum resumo disponível",
      placeholderSubtitle: "Clique em \"Resumir política\" e relaxa",
      privacyScore: "Pontuação de privacidade",
      analyzing: "Dando uma olhada nas letras miúdas...",
      collectingPolicy: "Buscando as letras miúdas...",
      sendingRequest: "Pedindo pra IA lidar com isso...",
      waitingModel: "Esperando a IA terminar...",
      scoreNotAvailable: "Pontuação indisponível",
      scoreExplanationNotAvailable: "Explicação da pontuação indisponível",
    },
    history: {
      emptyTitle: "Ainda não há histórico",
      emptySubtitle: "Os resumos aparecerão aqui — pra você não ler depois",
      scoreBadge: "Pontuação: {score}/10",
    },
    alerts: {
      apiKeyRequired: "A chave da API é obrigatória",
      settingsSaved: "Configurações salvas com sucesso",
      cacheCleared: "Todos os resumos foram apagados",
      summaryDeleted: "Resumo excluído",
      noPolicy: "Nenhuma política de privacidade detectada nesta página",
      summaryGenerated: "Resumo gerado com sucesso",
      failedGenerate: "Falha ao gerar o resumo",
      errorOccurred: "Ocorreu um erro ao resumir",
      temperatureRange: "A temperatura deve estar entre 0 e 2",
      maxTokensRange: "O máximo de tokens deve estar entre 100 e 4000",
    },
    error: {
      title: "Ocorreu um erro",
      checkConnection: "Verifique sua conexão e tente novamente",
      failedSummaryTitle: "Falha ao resumir a política",
      failedSummarySubtitle: "Tente novamente ou verifique sua chave da API",
    },
    confirm: {
      clearAll: "Tem certeza de que deseja apagar todos os resumos?",
    },
    options: {
      tagline: "Too Long; Didn’t Read — eu leio por você",
      languageTitle: "Configurações de idioma",
    },
    inputs: {
      manualUrlPlaceholder: "https://exemplo.com/politica",
      apiKeyPlaceholder: "Digite sua chave API",
    },
  },
  de: {
    app: {
      brand: "Policy TL;DR",
      title: "Zusammenfassung der Datenschutzrichtlinie",
      subtitle: "Ich lese den langweiligen Kram für Sie",
      brandAlt: "Marken-Waschbär",
    },
    tabs: {
      summary: "Zusammenfassung",
      history: "Verlauf",
      settings: "Einstellungen",
    },
    buttons: {
      summarize: "Richtlinie zusammenfassen",
      resummarize: "Erneut zusammenfassen",
      clearAll: "Alles löschen",
      view: "Ansehen",
      addLink: "Link hinzufügen",
      apiKeyLabel: "API-Schlüssel:",
      languageLabel: "Bevorzugte Sprache:",
      languageHelp: "Sprache für KI-Antworten und Zusammenfassungen",
      aiSettings: "KI-Modell Einstellungen",
      providerLabel: "KI-Anbieter:",
      providerHelp: "Wählen Sie den KI-Dienstanbieter",
      modelLabel: "Modell:",
      modelHelp: "Wählen Sie ein unterstütztes Modell für den ausgewählten Anbieter",
      temperatureLabel: "Temperatur:",
      temperatureHelp: "Steuert die Zufälligkeit (0=deterministisch, 2=sehr zufällig)",
      maxTokensLabel: "Max. Tokens:",
      maxTokensHelp: "Maximale Tokens für KI-Antworten (beeinflusst Kosten und Länge)",
      openSettings: "Einstellungen öffnen",
      saveSettings: "Einstellungen speichern",
        ignore: "Nicht erneut fragen",
        remind: "Später erinnern",
        summarizing: "Wird zusammengefasst...",
        ok: "OK",
        cancel: "Abbrechen",
      },
    language: {
      autodetect: "Automatisch erkennen",
      en: "Englisch",
      es: "Spanisch",
      fr: "Französisch",
      pt: "Portugiesisch",
      de: "Deutsch",
      it: "Italienisch",
    },
    summary: {
      placeholderTitle: "Keine Zusammenfassung verfügbar",
      placeholderSubtitle: "Klicken Sie auf \"Richtlinie zusammenfassen\" und lehnen Sie sich zurück",
      privacyScore: "Datenschutz-Score",
      analyzing: "Überfliege das Kleingedruckte...",
      collectingPolicy: "Hole das Kleingedruckte...",
      sendingRequest: "Bitte die KI, das zu lesen...",
      waitingModel: "Warte, bis die KI fertig ist...",
      scoreNotAvailable: "Punktzahl nicht verfügbar",
      scoreExplanationNotAvailable: "Erklärung der Punktzahl nicht verfügbar",
    },
    history: {
      emptyTitle: "Noch kein Verlauf",
      emptySubtitle: "Zusammenfassungen erscheinen hier — damit Sie später nicht lesen müssen",
      scoreBadge: "Punktzahl: {score}/10",
    },
    alerts: {
      apiKeyRequired: "API-Schlüssel ist erforderlich",
      settingsSaved: "Einstellungen erfolgreich gespeichert",
      cacheCleared: "Alle Zusammenfassungen gelöscht",
      summaryDeleted: "Zusammenfassung gelöscht",
      noPolicy: "Keine Datenschutzrichtlinie auf dieser Seite gefunden",
      summaryGenerated: "Zusammenfassung erfolgreich erstellt",
      failedGenerate: "Zusammenfassung konnte nicht erstellt werden",
      errorOccurred: "Beim Zusammenfassen ist ein Fehler aufgetreten",
      temperatureRange: "Die Temperatur muss zwischen 0 und 2 liegen",
      maxTokensRange: "Die maximale Tokenzahl muss zwischen 100 und 4000 liegen",
    },
    error: {
      title: "Ein Fehler ist aufgetreten",
      checkConnection: "Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut",
      failedSummaryTitle: "Zusammenfassung der Richtlinie fehlgeschlagen",
      failedSummarySubtitle: "Bitte versuchen Sie es erneut oder überprüfen Sie Ihren API-Schlüssel",
    },
    confirm: {
      clearAll: "Möchten Sie wirklich alle Zusammenfassungen löschen?",
    },
    options: {
      tagline: "Too Long; Didn’t Read — ich lese es für Sie",
      languageTitle: "Spracheinstellungen",
    },
    inputs: {
      manualUrlPlaceholder: "https://beispiel.de/richtlinie",
      apiKeyPlaceholder: "Geben Sie Ihren API-Schlüssel ein",
    },
  },
  it: {
    app: {
      brand: "Policy TL;DR",
      title: "Riepilogo dell'Informativa sulla Privacy",
      subtitle: "Io leggo le parti noiose al posto tuo",
      brandAlt: "Procione del marchio",
    },
    tabs: {
      summary: "Riepilogo",
      history: "Cronologia",
      settings: "Impostazioni",
    },
    buttons: {
      summarize: "Riassumi politica",
      resummarize: "Riassumi di nuovo",
      clearAll: "Cancella tutto",
      view: "Visualizza",
      addLink: "Aggiungi link",
      apiKeyLabel: "Chiave API:",
      languageLabel: "Lingua preferita:",
      languageHelp: "Lingua per risposte e riepiloghi dell'IA",
      aiSettings: "Impostazioni del modello IA",
      providerLabel: "Fornitore IA:",
      providerHelp: "Seleziona il fornitore del servizio IA",
      modelLabel: "Modello:",
      modelHelp: "Scegli un modello supportato per il fornitore selezionato",
      temperatureLabel: "Temperatura:",
      temperatureHelp: "Controlla la casualità (0=deterministico, 2=molto casuale)",
      maxTokensLabel: "Token max:",
      maxTokensHelp: "Token massimi per le risposte IA (costo e lunghezza)",
      openSettings: "Apri impostazioni",
      saveSettings: "Salva impostazioni",
        ignore: "Non chiedere di nuovo",
        remind: "Ricordamelo più tardi",
        summarizing: "Riassumendo...",
        ok: "OK",
        cancel: "Annulla",
      },
    language: {
      autodetect: "Rilevamento automatico",
      en: "Inglese",
      es: "Spagnolo",
      fr: "Francese",
      pt: "Portoghese",
      de: "Tedesco",
      it: "Italiano",
    },
    summary: {
      placeholderTitle: "Nessun riepilogo disponibile",
      placeholderSubtitle: "Clicca \"Riassumi politica\" e rilassati",
      privacyScore: "Punteggio di privacy",
      analyzing: "Dando un’occhiata al testo in piccolo...",
      collectingPolicy: "Recuperando il testo in piccolo...",
      sendingRequest: "Chiedendo all’IA di leggerlo...",
      waitingModel: "Aspettando che l’IA finisca...",
      scoreNotAvailable: "Punteggio non disponibile",
      scoreExplanationNotAvailable: "Spiegazione del punteggio non disponibile",
    },
    history: {
      emptyTitle: "Ancora nessuna cronologia",
      emptySubtitle: "I riepiloghi appariranno qui — così non devi leggere dopo",
      scoreBadge: "Punteggio: {score}/10",
    },
    alerts: {
      apiKeyRequired: "Chiave API richiesta",
      settingsSaved: "Impostazioni salvate con successo",
      cacheCleared: "Tutti i riepiloghi cancellati",
      summaryDeleted: "Riepilogo eliminato",
      noPolicy: "Nessuna informativa sulla privacy trovata in questa pagina",
      summaryGenerated: "Riepilogo generato con successo",
      failedGenerate: "Impossibile generare il riepilogo",
      errorOccurred: "Si è verificato un errore durante il riepilogo",
      temperatureRange: "La temperatura deve essere tra 0 e 2",
      maxTokensRange: "Il numero massimo di token deve essere tra 100 e 4000",
    },
    error: {
      title: "Si è verificato un errore",
      checkConnection: "Controlla la connessione e riprova",
      failedSummaryTitle: "Impossibile riassumere la politica",
      failedSummarySubtitle: "Riprova o verifica la tua chiave API",
    },
    confirm: {
      clearAll: "Sei sicuro di voler cancellare tutti i riepiloghi?",
    },
    options: {
      tagline: "Too Long; Didn’t Read — lo leggo io per te",
      languageTitle: "Impostazioni della lingua",
    },
    inputs: {
      manualUrlPlaceholder: "https://esempio.com/policy",
      apiKeyPlaceholder: "Inserisci la tua chiave API",
    },
  },
};

let currentLang = "en";

function resolveKey(path, lang) {
  const parts = path.split(".");
  let obj = locales[lang] || locales.en;
  for (const p of parts) {
    obj = obj?.[p];
    if (obj == null) return path; // fallback to key
  }
  return obj;
}

export function t(key, params = {}, lang = currentLang) {
  let value = resolveKey(key, lang);
  if (typeof value !== "string") return String(value);
  return value.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : ""));
}

export async function initI18n() {
  const stored = await getLanguage();
  const auto = !stored;
  const nav = (navigator.language || "en").toLowerCase();
  currentLang = stored
    || (nav.startsWith("es") ? "es"
      : nav.startsWith("fr") ? "fr"
      : nav.startsWith("pt") ? "pt"
      : nav.startsWith("de") ? "de"
      : nav.startsWith("it") ? "it"
      : "en");
  applyTranslations();
  return { lang: currentLang, auto };
}

export function getCurrentLanguage() {
  return currentLang;
}

export function applyTranslations(root = document) {
  const elements = root.querySelectorAll("[data-i18n]");
  elements.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const attr = el.getAttribute("data-i18n-attr");
    const text = t(key);
    if (attr) {
      el.setAttribute(attr, text);
    } else {
      el.textContent = text;
    }
  });
}

export default { initI18n, applyTranslations, t, getCurrentLanguage };

