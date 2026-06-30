// ─── English translations for Kurio Studio ───────────────────────────────────

const en = {
  // ── Global / Shared ──────────────────────────────────────────────────────
  beta: "Beta",
  publicBeta: "Public Beta",
  startConverting: "Start converting",
  feedback: "Feedback",
  comingSoon: "Coming soon",
  openTool: "Open tool",
  install: "Install",
  reload: "Reload",
  close: "Close",

  // ── Navbar ───────────────────────────────────────────────────────────────
  navTools: "Tools",
  navWorkspace: "Workspace",
  navAIHelper: "AI Helper",
  navCloseMenu: "Close navigation menu",
  navOpenMenu: "Open navigation menu",

  // ── PWA Install Toast ────────────────────────────────────────────────────
  pwaInstallTitle: "Install Kurio Studio?",
  pwaInstallDesc: "Add to home screen for offline access.",
  pwaInstallBtn: "Install",

  // ── Beta Banner ──────────────────────────────────────────────────────────
  betaBannerText: "Kurio Studio is in public beta. Most tools process files safely in your browser, and AI features are currently rate limited.",
  betaBannerHide: "Hide beta message",

  // ── Hero Section ─────────────────────────────────────────────────────────
  heroHeadline: "Your lightweight studio for everyday creative file tasks.",
  heroSubtitle: "Convert, compress, resize, format, and preview creative assets without jumping between random tools or slowing down your workflow.",
  heroCTAPrimary: "Start converting",
  heroCTASecondary: "Try AI Helper",
  heroTrustLine: "Public beta\u00A0•\u00A0Browser-based file processing\u00A0•\u00A0Limited AI helper access",

  // ── Quick Drop Zone ──────────────────────────────────────────────────────
  quickDropTitle: "Quick File Detector",
  quickDropSubtitle: "Drop or browse any file — Kurio detects the format and suggests matching tools automatically.",
  quickDropDrag: "Drop any file here",
  quickDropDragSub: "Kurio will detect the file type and recommend the right tool from your local suite.",
  quickDropBrowse: "Browse Files",
  quickDropAnalyzing: "Analyzing file structure",
  quickDropAnalyzingDesc: "Kurio is checking your file and matching it to the most relevant local tool.",
  quickDropRecognized: "Recognized",
  quickDropRecommendedActions: "Recommended Actions",
  quickDropPickWorkflow: "Pick the exact workflow for this file.",
  quickDropBrowseDir: "Browse full directory",
  quickDropAnalyzeAnother: "Analyze another file",
  quickDropTryAnother: "Try another file",
  quickDropErrorSize: "File is too large",
  quickDropErrorSizeDesc: "The uploaded item exceeds our current max file size parameter (50 MB). Please pick a smaller file.",
  quickDropTryAgain: "Try again",

  // ── Tools Directory ──────────────────────────────────────────────────────
  toolsDirTitle: "Asset Creator Workbench",
  toolsDirSubtitle: "Search by task, format, or workflow and open the right browser-based tool in seconds.",
  toolsDirAll: "All Utilities",
  toolsDirSearch: "Search by task or format...",
  toolsDirEmpty: "No tools matched your search",
  toolsDirEmptyHint: "Try another format, category, or task name.",
  toolCardComingSoonDesc: "This tool is disabled during public beta while we finish reliability testing.",
  toolCardInputs: "Inputs",
  toolCardOutputs: "Outputs",

  // ── Tool Page Shell ──────────────────────────────────────────────────────
  toolShellBack: "Back to all tools",
  toolShellNotFound: "Tool specification not found",
  toolShellAllTools: "All tools directory",
  toolShellAccepted: "Accepted format",
  toolShellExport: "Export format",
  toolShellFeedback: "Send beta feedback",
  toolShellBetaNote: "This tool is being tested across real files and browsers. Please report broken files, failed conversions, or confusing output.",
  toolShellBetaNoteLabel: "Public beta note:",
  toolShellRelated: "Related suite utilities",

  // ── Upload Drop Zone ─────────────────────────────────────────────────────
  uploadChooseFile: "Choose file",
  uploadErrorIncompatible: "Incompatible asset",
  uploadErrorUnsupported: "Unsupported file format",
  uploadErrorFormatDesc: "Invalid file format. Supported types:",
  uploadErrorFormatSuggest: "Export or convert the source file to one of the supported formats, then upload it again.",
  uploadErrorLarge: "File is too large",
  uploadErrorSizeDesc: "File exceeds the maximum limit.",
  uploadErrorSizeSuggest: "Use a smaller file, split the document, or reduce image dimensions before uploading.",

  // ── Output Panel ─────────────────────────────────────────────────────────
  outputTitle: "Export Queue",
  outputBefore: "Before resize",
  outputAfter: "After compile",
  outputSavings: "Savings scale",
  outputShrink: "shrink",
  outputReducedBy: "Reduced by",
  outputAssembling: "Assembling exports...",

  // ── Workspace Page ───────────────────────────────────────────────────────
  workspaceTitle: "Workspace History",
  workspaceSubtitle: "Track, review, and re-open recent file operations processed in Kurio Studio.",
  workspaceExport: "Export JSON",
  workspaceClearAll: "Clear History",
  workspaceClearConfirm: "Clear all local workspace history? This only removes records stored in this browser.",
  workspaceYesWipe: "Clear history",
  workspaceCancel: "Cancel",
  workspaceSearch: "Search file, tool, or output...",
  workspaceAll: "All",
  workspaceCompleted: "Completed",
  workspaceProcessing: "Processing",
  workspaceFailed: "Failed",
  workspaceReady: "Ready",
  workspaceError: "Error",
  workspaceEmpty: "Workspace history is empty",
  workspaceEmptyHint: "Process a file with any tool or drop a file on the home page to start a local history.",
  workspaceNoMatch: "No matching history items",
  workspaceNoMatchHint: "Try another keyword or status filter.",
  workspaceOpenTool: "Open again",
  workspaceSize: "Size",
  workspaceDate: "Date",
  workspaceRecords: "Records",
  workspacePinned: "Pinned",
  workspaceLocalTitle: "Local browser history",
  workspaceLocalDesc: "This list is saved in localStorage for quick access. Clearing it does not delete files from your device.",
  workspaceShowAllTools: "Show all tools",

  // ── Workspace Toasts ─────────────────────────────────────────────────────
  toastItemRemoved: "Item removed from workspace",
  toastPinned: "Pinned to workspace",
  toastUnpinned: "Unpinned from workspace",
  toastHistoryCleared: "Workspace history cleared",

  // ── Command Menu ─────────────────────────────────────────────────────────
  cmdPlaceholder: "Search tools, workspace, or features...",
  cmdEmpty: "No tools or features found.",
  cmdNavigation: "Navigation",
  cmdHome: "Home Dashboard",
  cmdWorkspace: "My Workspace History",
  cmdAIHelper: "AI Creative Helper",
  cmdLocalTools: "Local Tools",
  cmdSupport: "Support",
  cmdFeedback: "Send Beta Feedback",

  // ── Error Boundary ───────────────────────────────────────────────────────
  errorTitle: "Oops, something went wrong",
  errorDesc: "We encountered an unexpected error while rendering this tool. Heavy operations might crash if the file is too large or corrupted.",
  errorReload: "Reload Page",
  errorHome: "Return Home",

  // ── Footer ───────────────────────────────────────────────────────────────
  footerDesc: "Create, convert, and prepare assets faster. Kurio Studio delivers high-performance browser-based tools and AI-assisted workflows in one streamlined workspace. Built for creators, designers, and developers.",
  footerWorkspace: "Workspace",
  footerAssetConverters: "Asset Converters",
  footerMyHistory: "My History",
  footerCreativeAssistant: "Creative Assistant",
  footerPrivacyBeta: "Privacy & Beta Info",
  footerContact: "Contact",
  footerTrustPrivacy: "Trust & Privacy",
  footerTrustDesc: "Most file tools run directly in your browser. AI helper access is rate limited during public beta.",
  footerPrivacyPolicy: "Privacy Policy",
  footerTerms: "Terms of Use",
  footerCopyright: "Kurio Studio. All rights reserved.",

  // ── Settings Page ────────────────────────────────────────────────────────
  settingsTitle: "Privacy & Beta Info",
  settingsSubtitle: "Kurio Studio is currently in public beta. This page explains how file processing, AI helper requests, and beta limits work.",
  settingsLocalTitle: "Local file tools",
  settingsLocalP1: "Most Kurio Studio file tools run directly in your browser. This includes core tools such as PDF conversion, image compression, resizing, JSON formatting, and Lottie preview.",
  settingsLocalP2: "For local tools, uploaded files are processed in the browser tab and are not stored on the Kurio Studio server.",
  settingsUploadTitle: "Upload limits",
  settingsUploadP1: "During beta, a single uploaded file can be up to",
  settingsUploadLimit: "50 MB",
  settingsUploadP2: "Large files can still depend on your browser memory and device performance, especially PDFs with many pages or high-resolution images.",
  settingsAITitle: "AI Helper usage",
  settingsAIP1: "The AI Helper uses a backend proxy to contact Gemini. The browser does not receive the Gemini API key.",
  settingsAIP2: "AI requests send the prompt text and related text metadata needed for the assistant response. Local file binaries are not sent to Gemini by the current core tool flows.",
  settingsRateTitle: "Beta rate limits",
  settingsRateP1: "AI usage is rate limited during beta so the public test stays stable and fair for everyone.",
  settingsRateP2: "If an AI request is temporarily blocked, wait for the quota window to reset and continue using the local file tools.",
  settingsReportTitle: "What to report during beta",
  settingsReportDesc: "Please report broken files, confusing output, failed conversions, browser-specific issues, or AI helper responses that do not match the selected tool.",

  // ── Home Page: Category Grid ─────────────────────────────────────────────
  catGridTitle: "Engineered categories",
  catGridSubtitle: "Explore our isolated modular workspace suites designed to tackle your repetitive asset tasks.",
  catGridModule: "module available",
  catGridModules: "modules available",
  catGridView: "View modules",

  // ── Home Page: How It Works ──────────────────────────────────────────────
  hiwTitle: "Streamlined processing flow",
  hiwSubtitle: "Upload your assets, choose the settings you need, and export a polished result safely inside one workspace.",
  hiwStep1Title: "Drop or choose asset",
  hiwStep1Desc: "Select your image, PDF, or JSON vector animations. File headers will be analyzed in real-time.",
  hiwStep2Title: "Configure settings",
  hiwStep2Desc: "Set compressor scaling factors, quality coefficients, or run code formatters locally.",
  hiwStep3Title: "Consolidated exports",
  hiwStep3Desc: "Verify inputs in a split preview container, and download individual assets or single ZIP archives.",

  // ── Home Page: Featured Tools ────────────────────────────────────────────
  featToolsTitle: "Featured creator utilities",
  featToolsSubtitle: "Fully functional client-optimized tools ready to run inside your workspace now.",
  featToolsBrowse: "Browse all tools",
  featToolsInput: "Input mime",
  featToolsOutput: "Output type",
  featToolsOpen: "Open tool",
  featToolsComing: "Coming soon",

  // ── Home Page: AI Helper ─────────────────────────────────────────────────
  aiHelperBadge: "Gemini Creative Assistant",
  aiHelperTitle: "Smart routing for complex asset tasks",
  aiHelperSubtitle: "Unsure which specific converter fits your workflow? Tell our Creative Assistant what you intend to create in plain speech.",
  aiHelperNote: "Note: Gemini acts as your advisory architect. The heavy conversion mathematics run on sandboxed web compiler nodes, avoiding server-side delays and data exposures.",
  aiHelperTest: "Or test live prompts:",
  aiHelperPrompt1: "I need separate PNG images from this PDF document",
  aiHelperPrompt2: "I want to compress a bunch of JPG files and shrink their size",
  aiHelperPrompt3: "How do I preview a Lottie JSON file and validate it?",
  aiHelperQuestion: "What do you want to do with your asset?",
  aiHelperPlaceholder: "e.g. I need to convert a PDF into individual slides then resize them for an Instagram post...",
  aiHelperCalc: "Calculates recommended workflow steps",
  aiHelperConsult: "Consult Assistant",
  aiHelperRouting: "Routing workflow...",
  aiHelperReport: "Advisor report",
  aiHelperPipeline: "Workflow module pipeline",
  aiHelperSteps: "Execution steps",
  aiHelperFallbackMsg: "Could not classify workflow automatically. Let's check the complete toolbox.",
  aiHelperFallbackStep1: "Browse index of tools",
  aiHelperFallbackStep2: "Pick individual process modules",
  aiHelperErrorMsg: "Workflow suggestion: PDF to PNG Converter. Followed by Image Resizer.",
  aiHelperErrorStep1: "Upload PDF in the converter",
  aiHelperErrorStep2: "Choose an export scale",
  aiHelperErrorStep3: "Download the finished ZIP",
} as const;

export type TranslationKeys = typeof en;
export default en;
