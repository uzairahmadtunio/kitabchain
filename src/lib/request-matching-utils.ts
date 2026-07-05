import { supabase } from "./supabase";
import type { BookListing, BookRequest } from "./supabase";

export interface BookMatch {
  requestId: string;
  requestUserId: string;
  requestTitle: string;
  requestCategory: string | null;
  matchType: "title" | "category" | "hybrid";
  matchScore: number;
  listingId: string;
  listingTitle: string;
  listingCategory: string | null;
}

/**
 * Normalizes text for matching: lowercase, trim whitespace, remove common articles
 */
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/\s+/g, " ");
};

/**
 * Calculates similarity between two strings using Levenshtein-like heuristic
 * Returns a score between 0 and 1
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Check if one contains the other (good match)
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  // Calculate word-level overlap
  const words1 = new Set(s1.split(" "));
  const words2 = new Set(s2.split(" "));
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  const jaccardIndex = intersection.size / union.size;
  return jaccardIndex;
};

/**
 * Find all pending book requests that match a newly posted listing
 * Uses title and category matching with scoring
 */
export const findMatchingRequests = async (listing: BookListing): Promise<BookMatch[]> => {
  if (!listing.title) return [];

  try {
    // Fetch all pending requests
    const { data: pendingRequests, error: fetchError } = await supabase
      .from("book_requests")
      .select("*")
      .eq("status", "pending");

    if (fetchError) {
      console.error("Error fetching pending requests:", fetchError);
      return [];
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      return [];
    }

    const matches: BookMatch[] = [];

    // Check each request against the listing
    for (const request of pendingRequests as BookRequest[]) {
      let matchType: "title" | "category" | "hybrid" | null = null;
      let matchScore = 0;

      // Title matching
      const titleSimilarity = calculateSimilarity(listing.title, request.book_title);
      const titleMatch = titleSimilarity >= 0.6; // Threshold for title match

      // Category matching
      const categoryMatch =
        request.category &&
        listing.category &&
        request.category.toLowerCase() === listing.category.toLowerCase();

      // Determine match type and score
      if (titleMatch && categoryMatch) {
        matchType = "hybrid";
        matchScore = titleSimilarity * 0.7 + 1.0 * 0.3; // Weighted score
      } else if (titleMatch) {
        matchType = "title";
        matchScore = titleSimilarity;
      } else if (categoryMatch) {
        matchType = "category";
        matchScore = 0.7;
      }

      // Only include matches above threshold
      if (matchType && matchScore >= 0.6) {
        matches.push({
          requestId: request.id,
          requestUserId: request.user_id,
          requestTitle: request.book_title,
          requestCategory: request.category,
          matchType,
          matchScore,
          listingId: listing.id,
          listingTitle: listing.title,
          listingCategory: listing.category,
        });
      }
    }

    // Sort by match score descending
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    console.error("Error in findMatchingRequests:", error);
    return [];
  }
};

/**
 * Flag a request as fulfilled after a potential match
 * This can be called when a user initiates contact or completes a transaction
 */
export const fulfillRequest = async (requestId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("book_requests")
      .update({ status: "fulfilled", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      console.error("Error fulfilling request:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error in fulfillRequest:", error);
    return false;
  }
};

/**
 * Get all pending requests for a specific user
 */
export const getUserPendingRequests = async (userId: string): Promise<BookRequest[]> => {
  try {
    const { data, error } = await supabase
      .from("book_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user requests:", error);
      return [];
    }
    return (data || []) as BookRequest[];
  } catch (error) {
    console.error("Error in getUserPendingRequests:", error);
    return [];
  }
};

/**
 * Create a new book request for a user
 */
export const createBookRequest = async (
  userId: string,
  bookTitle: string,
  category?: string,
): Promise<BookRequest | null> => {
  try {
    const { data, error } = await supabase
      .from("book_requests")
      .insert([
        {
          user_id: userId,
          book_title: bookTitle,
          category,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating book request:", error);
      return null;
    }
    return data as BookRequest;
  } catch (error) {
    console.error("Error in createBookRequest:", error);
    return null;
  }
};

/**
 * Delete a book request
 */
export const deleteBookRequest = async (requestId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("book_requests").delete().eq("id", requestId);

    if (error) {
      console.error("Error deleting book request:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error in deleteBookRequest:", error);
    return false;
  }
};
