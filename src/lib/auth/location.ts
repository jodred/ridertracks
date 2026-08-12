export interface DetectedLocation {
  country: string;
  currency: string;
}

const TZ_TO_LOCATION: Record<string, DetectedLocation> = {
  "Europe/Warsaw": { country: "Poland", currency: "zł" },
  "Europe/London": { country: "United Kingdom", currency: "£" },
  "Europe/Dublin": { country: "Ireland", currency: "€" },
  "Europe/Berlin": { country: "Germany", currency: "€" },
  "Europe/Paris": { country: "France", currency: "€" },
  "Europe/Madrid": { country: "Spain", currency: "€" },
  "Europe/Rome": { country: "Italy", currency: "€" },
  "Europe/Lisbon": { country: "Portugal", currency: "€" },
  "Europe/Amsterdam": { country: "Netherlands", currency: "€" },
  "Europe/Brussels": { country: "Belgium", currency: "€" },
  "Europe/Stockholm": { country: "Sweden", currency: "kr" },
  "Europe/Oslo": { country: "Norway", currency: "kr" },
  "Europe/Copenhagen": { country: "Denmark", currency: "kr" },
  "Europe/Prague": { country: "Czechia", currency: "Kč" },
  "Europe/Zurich": { country: "Switzerland", currency: "CHF" },
  "Europe/Kyiv": { country: "Ukraine", currency: "₴" },
  "Europe/Istanbul": { country: "Türkiye", currency: "₺" },
  "Africa/Lagos": { country: "Nigeria", currency: "₦" },
  "Africa/Johannesburg": { country: "South Africa", currency: "R" },
  "America/New_York": { country: "United States", currency: "$" },
  "America/Chicago": { country: "United States", currency: "$" },
  "America/Los_Angeles": { country: "United States", currency: "$" },
  "America/Toronto": { country: "Canada", currency: "C$" },
  "Asia/Dubai": { country: "United Arab Emirates", currency: "AED" },
  "Asia/Kolkata": { country: "India", currency: "₹" },
  "Australia/Sydney": { country: "Australia", currency: "A$" },
};

export const CURRENCY_OPTIONS = ["zł", "€", "£", "$", "C$", "A$", "kr", "Kč", "CHF", "₴", "₺", "₦", "R", "AED", "₹"];

export function detectLocation(): DetectedLocation | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_TO_LOCATION[tz] ?? null;
  } catch {
    return null;
  }
}
