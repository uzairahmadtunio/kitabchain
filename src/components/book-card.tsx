import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, MapPin } from "lucide-react";
import type { BookListing } from "@/lib/supabase";

export function BookCard({ book, sellerUni }: { book: BookListing; sellerUni?: string | null }) {
  const cover = book.images?.[0];
  const marketPrice = Number(book.original_market_price ?? book.selling_price ?? 0);
  const salePrice = Number(book.selling_price ?? book.price ?? 0);
  const discountPercent = marketPrice > 0 && salePrice > 0 && salePrice < marketPrice
    ? Math.round(((marketPrice - salePrice) / marketPrice) * 100)
    : 0;

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all border-border bg-card flex flex-col">
      <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            <BookOpen className="w-12 h-12 text-primary/40" />
          </div>
        )}
        {book.is_donation && (
          <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground font-bold shadow">
            FREE / DONATION
          </Badge>
        )}
        {!book.is_donation && discountPercent > 0 && (
          <Badge className="absolute bottom-2 left-2 bg-orange-600 text-white font-semibold shadow">
            🔥 {discountPercent}% Cheaper than Market Price!
          </Badge>
        )}
        {book.condition && (
          <Badge variant="secondary" className="absolute top-2 right-2 bg-background/90">
            {book.condition}
          </Badge>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="font-semibold text-primary line-clamp-2 leading-tight">{book.title}</h3>
          <p className="text-xs text-muted-foreground">{book.author ?? "Unknown author"}</p>
        </div>
        {(sellerUni || book.specific_location) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {book.specific_location ? `📍 ${book.specific_location}` : sellerUni ?? "University campus"}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="font-bold text-lg text-primary">
            {book.is_donation ? (
              <span className="text-accent">FREE</span>
            ) : (
              <>Rs {Number(book.price).toLocaleString()}</>
            )}
          </div>
          <Link to="/book/$id" params={{ id: book.id }}>
            <Button size="sm" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              View
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
