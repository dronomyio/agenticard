/**
 * ZeroClick AI-native advertising integration
 * https://developer.zeroclick.ai/docs
 *
 * ZeroClick serves contextually relevant sponsored offers based on
 * real-time user intent signals. In AgentCard, the card's content
 * (title, description, tags, category) is used as the intent query,
 * making every sponsored offer highly relevant to the card topic.
 *
 * Revenue model:
 *   - Free tier: enhancement is free, ZeroClick ad impression earns revenue
 *   - Paid tier: user pays NVM credits, no ad injected
 */

import { ENV } from "./_core/env";

export interface ZeroClickOffer {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  cta: string;
  clickUrl: string;
  imageUrl?: string;
  brand: {
    name: string;
    url?: string;
  };
  price?: {
    amount: string;
    currency: string;
  };
}

export interface ZeroClickResult {
  offers: ZeroClickOffer[];
  query: string;
  fetched: boolean;
  error?: string;
}

/**
 * Build a contextual query from card metadata.
 * The richer the card, the better the offer matching.
 */
export function buildCardQuery(card: {
  title: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
}): string {
  const parts: string[] = [];

  if (card.title) parts.push(card.title);
  if (card.category) parts.push(card.category);
  if (card.tags && card.tags.length > 0) parts.push(card.tags.slice(0, 3).join(" "));
  if (card.description) {
    // Take first 100 chars of description for context
    const excerpt = card.description.slice(0, 100).replace(/\s+/g, " ").trim();
    if (excerpt) parts.push(excerpt);
  }

  return parts.join(" — ");
}

/**
 * Fetch sponsored offers from ZeroClick for a given card context.
 * Called server-side only — API key never exposed to browser.
 */
export async function fetchZeroClickOffers(
  query: string,
  options: {
    limit?: number;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<ZeroClickResult> {
  const apiKey = ENV.zeroClickApiKey;

  if (!apiKey) {
    return {
      offers: [],
      query,
      fetched: false,
      error: "ZEROCLICK_API_KEY not configured",
    };
  }

  try {
    // Use "client" method - works with public API keys (no IP required)
    // For server-side keys, switch to method: "server" and pass ipAddress
    const body: Record<string, unknown> = {
      method: "client",
      query,
      limit: options.limit ?? 2,
    };

    const response = await fetch("https://zeroclick.dev/api/v2/offers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-zc-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ZeroClick] API error:", response.status, errText);
      return {
        offers: [],
        query,
        fetched: false,
        error: `ZeroClick API returned ${response.status}`,
      };
    }

    const data = await response.json() as ZeroClickOffer[];
    const offers = Array.isArray(data) ? data : [];

    console.log(`[ZeroClick] Fetched ${offers.length} offers for query: "${query.slice(0, 60)}..."`);

    return {
      offers,
      query,
      fetched: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ZeroClick] Fetch failed:", message);
    return {
      offers: [],
      query,
      fetched: false,
      error: message,
    };
  }
}

/**
 * Track impressions for displayed offers.
 * Must be called after offers are rendered to the user.
 * Note: Per ZeroClick docs, impression tracking should originate
 * from the end user's device. We proxy it server-side here for
 * simplicity; for production, move impression tracking to the frontend.
 */
export async function trackZeroClickImpressions(offerIds: string[]): Promise<void> {
  if (!offerIds.length) return;

  try {
    await fetch("https://zeroclick.dev/api/v2/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: offerIds }),
    });
    console.log(`[ZeroClick] Tracked ${offerIds.length} impressions`);
  } catch (err) {
    console.error("[ZeroClick] Impression tracking failed:", err);
  }
}
