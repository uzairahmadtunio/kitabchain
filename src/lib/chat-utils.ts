import { supabase, type ChatRoom, type ChatMessage, type BookListing } from "./supabase";

/**
 * Get or create a chat room for a buyer-seller-book combination
 */
export async function getOrCreateChatRoom(
  buyerId: string,
  sellerId: string,
  bookId: string
): Promise<ChatRoom | null> {
  try {
    // Validate all IDs are present
    if (!buyerId || !sellerId || !bookId) {
      console.error("❌ Missing required IDs for chat room creation", {
        buyerId: buyerId || "MISSING",
        sellerId: sellerId || "MISSING",
        bookId: bookId || "MISSING",
      });
      return null;
    }

    // Prevent same user from creating chat with themselves
    if (buyerId === sellerId) {
      return null;
    }

    // First, try to find existing room
    const { data: existing, error: fetchError } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Error fetching existing room:", fetchError);
      throw fetchError;
    }

    if (existing) {
      return existing as ChatRoom;
    }

    // Create new room if it doesn't exist
    const { data: newRoom, error: createError } = await supabase
      .from("chat_rooms")
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        book_id: bookId,
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ Error creating chat room:", createError);
      throw createError;
    }

    return newRoom as ChatRoom;
  } catch (error) {
    console.error("❌ Error getting/creating chat room:", error);
    return null;
  }
}

/**
 * Get all chat rooms for a user (as buyer or seller)
 */
export async function getUserChatRooms(userId: string): Promise<(ChatRoom & { book: BookListing; otherUser: { id: string; full_name: string | null } | null })[]> {
  try {
    const { data: rooms, error } = await supabase
      .from("chat_rooms")
      .select("*, book:book_id(id, title, images, price, condition)")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const roomList = (rooms || []) as Array<ChatRoom & { book: BookListing }>;
    const participantIds = Array.from(
      new Set(roomList.flatMap((room) => [room.buyer_id, room.seller_id]))
    );

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", participantIds);

    if (profileError) {
      console.error("Error fetching profiles for chat rooms:", profileError);
      return roomList.map((room) => ({
        ...room,
        otherUser: null,
      }));
    }

    const profileMap = new Map(
      (profiles || []).map((profile) => [profile.id, profile])
    );

    return roomList.map((room) => {
      const otherUserId = room.buyer_id === userId ? room.seller_id : room.buyer_id;
      return {
        ...room,
        otherUser: profileMap.get(otherUserId) ?? null,
      };
    });
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    return [];
  }
}

/**
 * Get messages for a specific chat room
 */
export async function getChatMessages(roomId: string): Promise<ChatMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (messages || []) as ChatMessage[];
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return [];
  }
}

/**
 * Send a message in a chat room
 */
export async function sendChatMessage(
  roomId: string,
  senderId: string,
  messageText: string,
  options?: {
    is_offer?: boolean;
    offer_amount?: number | null;
    offer_status?: ChatMessage["offer_status"];
  }
): Promise<ChatMessage | null> {
  try {
    const payload: {
      room_id: string;
      sender_id: string;
      message_text: string;
      is_offer?: boolean;
      offer_amount?: number | null;
      offer_status?: ChatMessage["offer_status"];
    } = {
      room_id: roomId,
      sender_id: senderId,
      message_text: messageText,
    };

    if (options?.is_offer !== undefined) {
      payload.is_offer = options.is_offer;
    }

    if (options?.offer_amount !== undefined) {
      payload.offer_amount = options.offer_amount;
    }

    if (options?.offer_status !== undefined) {
      payload.offer_status = options.offer_status;
    }

    const { data: message, error } = await supabase
      .from("chat_messages")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // Update room's updated_at timestamp so the inbox can sort by latest activity.
    await supabase
      .from("chat_rooms")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", roomId);

    return message as ChatMessage;
  } catch (error) {
    console.error("Error sending message:", error);
    return null;
  }
}

export async function updateChatMessageOfferStatus(
  messageId: string,
  offerStatus: NonNullable<ChatMessage["offer_status"]>
): Promise<ChatMessage | null> {
  try {
    const { data: message, error } = await supabase
      .from("chat_messages")
      .update({ offer_status: offerStatus })
      .eq("id", messageId)
      .select()
      .single();

    if (error) throw error;
    return message as ChatMessage;
  } catch (error) {
    console.error("Error updating offer status:", error);
    return null;
  }
}

export async function proposeCounterOffer(
  roomId: string,
  senderId: string,
  originalMessageId: string,
  counterAmount: number
): Promise<{ originalMessage: ChatMessage | null; newMessage: ChatMessage | null }> {
  try {
    const { data: updatedOriginal, error: updateError } = await supabase
      .from("chat_messages")
      .update({ offer_status: "countered" })
      .eq("id", originalMessageId)
      .select()
      .single();

    if (updateError) throw updateError;

    const { data: newMessage, error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: senderId,
        message_text: "Counter-Offer proposed by Seller",
        is_offer: true,
        offer_amount: counterAmount,
        offer_status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await supabase
      .from("chat_rooms")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", roomId);

    return {
      originalMessage: updatedOriginal as ChatMessage | null,
      newMessage: newMessage as ChatMessage | null,
    };
  } catch (error) {
    console.error("Error proposing counter-offer:", error);
    return { originalMessage: null, newMessage: null };
  }
}

/**
 * Subscribe to real-time messages in a chat room
 */
export function subscribeToRoomMessages(
  roomId: string,
  onMessage: (message: ChatMessage) => void,
  onError?: (error: any) => void
) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) {
          onMessage(payload.new as ChatMessage);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
