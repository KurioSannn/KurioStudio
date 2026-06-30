export interface FriendlyToolError {
  title: string;
  message: string;
  suggestion: string;
}

export function getFriendlyToolError(error: unknown, fallback = "The file could not be processed."): FriendlyToolError {
  const rawMessage = error instanceof Error ? error.message : String(error || fallback);
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("encrypted") ||
    normalized.includes("password") ||
    normalized.includes("parse encrypted")
  ) {
    return {
      title: "Password-protected PDF",
      message: "This PDF is encrypted, so the browser cannot read its pages.",
      suggestion: "Unlock the PDF or export an unprotected copy, then upload it again.",
    };
  }

  if (
    normalized.includes("too large") ||
    normalized.includes("exceeds") ||
    normalized.includes("maximum") ||
    normalized.includes("quota")
  ) {
    return {
      title: "File is too large",
      message: "The file is above the current browser processing limit.",
      suggestion: "Try a smaller file, split the document, or lower image resolution before uploading.",
    };
  }

  if (
    normalized.includes("memory") ||
    normalized.includes("canvas") ||
    normalized.includes("blob") ||
    normalized.includes("allocation")
  ) {
    return {
      title: "Browser memory limit reached",
      message: "The browser could not allocate enough memory to render this output.",
      suggestion: "Close other tabs, use a lower scale or smaller dimensions, then process the file again.",
    };
  }

  if (
    normalized.includes("decode") ||
    normalized.includes("corrupt") ||
    normalized.includes("invalid") ||
    normalized.includes("parse") ||
    normalized.includes("read")
  ) {
    return {
      title: "File could not be read",
      message: "The selected file may be corrupt, incomplete, or saved in an unsupported variant.",
      suggestion: "Open and re-export the file from its source app, then upload the fresh copy.",
    };
  }

  if (
    normalized.includes("network") ||
    normalized.includes("cdn") ||
    normalized.includes("dependency") ||
    normalized.includes("internet")
  ) {
    return {
      title: "Processing engine unavailable",
      message: "A required browser-side processing engine could not be loaded.",
      suggestion: "Check the connection, refresh the page, and try again.",
    };
  }

  return {
    title: "Processing failed",
    message: rawMessage || fallback,
    suggestion: "Try another file or reduce the output settings before running the tool again.",
  };
}
