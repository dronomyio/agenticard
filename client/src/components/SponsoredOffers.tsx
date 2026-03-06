/**
 * SponsoredOffers — ZeroClick contextual ad component
 *
 * Renders sponsored offers returned by the ZeroClick AI-native ad network.
 * Offers are contextually matched to the card's content via the ZeroClick API.
 *
 * Revenue model:
 *   - Impressions are tracked server-side when offers are fetched
 *   - Clicks generate additional revenue via ZeroClick's click tracking URL
 *   - Free tier enhancements are subsidized by this ad revenue
 */

import { ExternalLink, Sparkles, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ZeroClickOffer {
  id: string;
  title: string;
  subtitle?: string;
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

interface SponsoredOffersProps {
  offers: ZeroClickOffer[];
  query?: string;
  className?: string;
  compact?: boolean;
}

export default function SponsoredOffers({ offers, query, className, compact = false }: SponsoredOffersProps) {
  if (!offers || offers.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="font-medium text-amber-400/80">Sponsored Resources</span>
        </div>
        <div className="flex-1 h-px bg-border/50" />
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 border-amber-400/20 text-amber-400/60 bg-amber-400/5"
        >
          ZeroClick
        </Badge>
      </div>

      {query && (
        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <Tag className="w-2.5 h-2.5" />
          Matched to: <span className="italic truncate max-w-[200px]">{query}</span>
        </p>
      )}

      {/* Offer cards */}
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
        {offers.map((offer) => (
          <a
            key={offer.id}
            href={offer.clickUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={cn(
              "group block rounded-xl border border-border/50 bg-card/50 hover:bg-card",
              "hover:border-amber-400/30 transition-all duration-200",
              "overflow-hidden"
            )}
          >
            <div className="flex gap-3 p-3">
              {/* Brand image or fallback */}
              {offer.imageUrl ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                  <img
                    src={offer.imageUrl}
                    alt={offer.brand.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg shrink-0 bg-gradient-to-br from-amber-400/20 to-orange-400/20 border border-amber-400/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-400">
                    {offer.brand.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-amber-400 transition-colors">
                      {offer.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {offer.brand.name}
                    </p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-amber-400/60 shrink-0 mt-0.5 transition-colors" />
                </div>

                {!compact && offer.content && (
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {offer.content}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5">
                    {offer.cta}
                  </span>
                  {offer.price && (
                    <span className="text-[10px] text-muted-foreground">
                      {offer.price.currency} {offer.price.amount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <p className="text-[9px] text-muted-foreground/40 text-center">
        Sponsored content · Powered by ZeroClick AI-native advertising
      </p>
    </div>
  );
}
