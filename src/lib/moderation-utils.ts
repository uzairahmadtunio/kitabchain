/**
 * Moderation utilities for automated spam and content auditing
 * Flags potentially problematic content without blocking submissions
 */

export interface ModerationResult {
  isFlagged: boolean;
  reason: string | null;
  severity: "low" | "medium" | "high" | null;
  details: string[];
}

/**
 * Patterns for detecting explicit contact details in text
 */
const CONTACT_PATTERNS = {
  // Phone numbers (Pakistan format and international)
  phone: /(\+?92|0)?[\s-]?3\d{2}[\s-]?\d{3}[\s-]?\d{4}|(\d{3}[-.]?\d{3}[-.]?\d{4})/gi,
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  // WhatsApp explicit mentions
  whatsapp: /whatsapp|whatsup|wa\.me|contact.*whatsapp|dm.*whatsapp/gi,
  // Instagram handles
  instagram: /@[a-zA-Z0-9_.]+|instagram\s+handle|insta\s+handle/gi,
};

/**
 * Common non-academic or spam-like patterns
 */
const SPAM_PATTERNS = {
  // Explicit commercial promotions
  commercialSpam: /free\s+(money|cash|prize|gift|bitcoin|crypto)|earn\s+(money|cash|bitcoin)|click\s+here|buy\s+now|limited\s+time|act\s+now/gi,
  // Explicit adult or abusive content indicators (kept minimal for academic context)
  abusive: /pornography|xxx|adult\s+content|explicit/gi,
  // Cryptocurrency/MLM schemes
  mlm: /crypto|bitcoin|forex|pyramid|mlm|network\s+marketing|easy\s+money/gi,
};

/**
 * Non-academic keywords that might indicate off-topic listings
 */
const NON_ACADEMIC_KEYWORDS = [
  "fake",
  "counterfeit",
  "illegal",
  "drugs",
  "weapons",
  "gambling",
  "prostitut",
  "escort",
  "forex",
  "crypto",
  "pump.*dump",
];

/**
 * Normalize text for comparison
 */
const normalizeText = (text: string): string => {
  return text.toLowerCase().trim();
};

/**
 * Check if text contains suspicious contact patterns
 */
const checkContactPatterns = (text: string): string[] => {
  const detected: string[] = [];

  if (CONTACT_PATTERNS.phone.test(text)) {
    detected.push("Phone number detected");
  }

  // Reset regex state
  CONTACT_PATTERNS.phone.lastIndex = 0;

  if (CONTACT_PATTERNS.email.test(text)) {
    detected.push("Email address detected");
  }

  if (CONTACT_PATTERNS.whatsapp.test(text)) {
    detected.push("WhatsApp contact solicitation");
  }

  if (CONTACT_PATTERNS.instagram.test(text)) {
    detected.push("Instagram handle detected");
  }

  return detected;
};

/**
 * Check if text contains spam patterns
 */
const checkSpamPatterns = (text: string): string[] => {
  const detected: string[] = [];

  if (SPAM_PATTERNS.commercialSpam.test(text)) {
    detected.push("Commercial spam keywords");
  }

  // Reset regex state
  SPAM_PATTERNS.commercialSpam.lastIndex = 0;

  if (SPAM_PATTERNS.abusive.test(text)) {
    detected.push("Potentially abusive content");
  }

  // Reset regex state
  SPAM_PATTERNS.abusive.lastIndex = 0;

  if (SPAM_PATTERNS.mlm.test(text)) {
    detected.push("MLM or scheme-related keywords");
  }

  // Reset regex state
  SPAM_PATTERNS.mlm.lastIndex = 0;

  return detected;
};

/**
 * Check if text contains non-academic keywords
 */
const checkNonAcademicKeywords = (text: string): string[] => {
  const normalized = normalizeText(text);
  const detected: string[] = [];

  for (const keyword of NON_ACADEMIC_KEYWORDS) {
    const regex = new RegExp(keyword, "gi");
    if (regex.test(normalized)) {
      detected.push(`Non-academic keyword: "${keyword}"`);
    }
  }

  return detected;
};

/**
 * Main moderation check function
 * Analyzes title and description against spam, abuse, and contact patterns
 */
export const checkListingContent = (title: string, description: string = ""): ModerationResult => {
  const details: string[] = [];
  let severity: "low" | "medium" | "high" | null = null;

  // Check title
  const titleContactIssues = checkContactPatterns(title);
  const titleSpamIssues = checkSpamPatterns(title);
  const titleNonAcademicIssues = checkNonAcademicKeywords(title);

  details.push(...titleContactIssues, ...titleSpamIssues, ...titleNonAcademicIssues);

  // Check description
  if (description) {
    const descContactIssues = checkContactPatterns(description);
    const descSpamIssues = checkSpamPatterns(description);
    const descNonAcademicIssues = checkNonAcademicKeywords(description);

    details.push(...descContactIssues, ...descSpamIssues, ...descNonAcademicIssues);
  }

  // Determine if flagged and severity level
  if (details.length > 0) {
    const hasContactInfo = details.some((d) =>
      ["Phone number", "Email address", "WhatsApp", "Instagram"].some((keyword) => d.includes(keyword)),
    );
    const hasAbusiveContent = details.some((d) => d.includes("abusive"));
    const hasNonAcademic = details.some((d) => d.includes("Non-academic"));

    if (hasAbusiveContent || hasContactInfo) {
      severity = "high";
    } else if (hasNonAcademic || details.length > 2) {
      severity = "medium";
    } else {
      severity = "low";
    }
  }

  return {
    isFlagged: details.length > 0,
    reason: details.length > 0 ? "Automated content audit required" : null,
    severity,
    details,
  };
};

/**
 * Utility to get user-friendly message based on moderation result
 */
export const getModerationMessage = (result: ModerationResult): string => {
  if (!result.isFlagged) {
    return "";
  }

  switch (result.severity) {
    case "high":
      return "Your listing contains content that requires immediate admin review. It will be visible after approval.";
    case "medium":
      return "Your listing is being reviewed by our moderation team. It should be live shortly.";
    case "low":
      return "Your listing is undergoing a routine content check.";
    default:
      return "Your listing is under review.";
  }
};
