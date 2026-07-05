import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gdjpxacbqeepxdiklrqq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkanB4YWNicWVlcHhkaWtscnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMTU3MTQsImV4cCI6MjA5ODY5MTcxNH0.BO5lY1XZp2LdOLu1ItaLEqGYa3KgQ9gFYlhVU_y5TGc";

export const ADMIN_EMAIL = "uzairahmadtunio786@gmail.com";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  full_name: string | null;
  university: string | null;
  city: string | null;
  whatsapp_num: string | null;
  avatar_url: string | null;
  is_admin: boolean | null;
  instagram_handle: string | null;
  is_verified_student: boolean | null;
  peer_rating: number | null;
  peer_reviews: number | null;
  gamification_level: string | null;
  created_at: string;
};

export type BookListing = {
  id: string;
  seller_id: string;
  title: string;
  author: string | null;
  edition: string | null;
  category: string | null;
  condition: string | null;
  resource_type: string | null;
  education_level: string | null;
  board: string | null;
  institute_name: string | null;
  specific_location: string | null;
  original_market_price: number | null;
  selling_price: number | null;
  price: number;
  is_donation: boolean;
  description: string | null;
  images: string[] | null;
  status: "Available" | "Reserved" | "Sold";
  is_flagged?: boolean;
  flag_reason?: string | null;
  created_at: string;
};

export type BookRequest = {
  id: string;
  user_id: string;
  book_title: string;
  category: string | null;
  status: "pending" | "fulfilled";
  created_at: string;
  updated_at: string;
};

export type ChatRoom = {
  id: string;
  buyer_id: string;
  seller_id: string;
  book_id: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  message_text: string;
  is_offer?: boolean | null;
  offer_amount?: number | null;
  offer_status?: "pending" | "accepted" | "rejected" | "countered" | null;
  created_at: string;
};

export const CATEGORIES = [
  "Programming & SE",
  "Pre-Calculus/Math",
  "Applied Physics",
  "Entry Test Preparation",
  "Free/Donations",
] as const;

export const CONDITIONS = ["Mint", "Good", "Notes Written", "Damaged"] as const;

export const EDUCATION_LEVELS = ["School", "University"] as const;

export const BOARDS = [
  "BISE Larkana",
  "Karachi Board",
  "Federal Board",
  "Cambridge O/A Levels",
  "Other Board",
] as const;

export const INSTITUTES = [
  "LUMS",
  "NUST",
  "FAST NUCES",
  "IBA Karachi",
  "University of Karachi",
  "NED University",
  "GIKI",
  "COMSATS",
  "Other (Type your Institute)",
] as const;

export const RESOURCE_TYPES = ["Textbook", "Hand-written Notes", "Solved Past Papers"] as const;

export const UNIVERSITIES = [
  "All Universities",
  "The University of Larkana",
  "Shah Abdul Latif University",
  "Sindh University",
  "NUST",
  "FAST NUCES",
  "LUMS",
  "COMSATS",
  "UET Lahore",
  "GIKI",
  "IBA Karachi",
  "PIEAS",
  "Quaid-i-Azam University",
  "Punjab University",
  "University of Karachi",
  "NED University",
  "Air University",
  "Bahria University",
  "Local College / School",
] as const;

export function getGamificationLevel(listingCount: number, donationCount: number) {
  if (donationCount > 0) return "Campus Hero";
  if (listingCount >= 5) return "Book Worm";
  return "Freshman";
}
