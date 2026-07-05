import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getUserChatRooms } from "@/lib/chat-utils";
import { ChatWindow } from "@/components/chat-window";
import { BookOpen, Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import { supabase, type BookListing, type ChatRoom } from "@/lib/supabase";

type UserChatRoom = ChatRoom & {
  book: BookListing;
  otherUser: { id: string; full_name: string | null } | null;
};

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const navigate = useNavigate();
  const { user, profile: currentProfile } = useAuth();
  const [rooms, setRooms] = useState<UserChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [rooms]);

  const fetchRooms = async () => {
    setLoading(true);
    const userRooms = await getUserChatRooms(user!.id);
    setRooms(userRooms);
    if (userRooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(userRooms[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      navigate({ to: "/" });
      return;
    }

    void fetchRooms();
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`chat_rooms:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_rooms",
          filter: `buyer_id=eq.${user.id}`,
        },
        () => {
          void fetchRooms();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_rooms",
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          void fetchRooms();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (selectedRoomId && rooms.length > 0 && !rooms.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0]?.id ?? null);
    }

    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const selectedRoom = sortedRooms.find((r) => r.id === selectedRoomId) ?? null;

  if (!user) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md py-24 text-center">
          <h2 className="text-2xl font-semibold">Please sign in</h2>
          <p className="mt-2 text-muted-foreground">You need to be logged in to access messages.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Messages</h1>
            <p className="text-sm text-muted-foreground">Your peer-to-peer conversations</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedRooms.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent mx-auto mb-4">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No messages yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start a conversation by clicking "Chat with Seller" on any book listing.
            </p>
            <Button
              className="mt-4 bg-accent hover:bg-accent/90"
              onClick={() => navigate({ to: "/browse" })}
            >
              Browse Books
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Chat Rooms List */}
            <div className="lg:col-span-1 border rounded-lg overflow-y-auto bg-background">
              <div className="p-4 border-b sticky top-0 bg-secondary/50">
                <h3 className="font-semibold text-foreground">Conversations</h3>
              </div>
              <div className="space-y-1 p-2">
                {sortedRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedRoomId === room.id
                        ? "bg-accent/20 border-l-4 border-l-accent"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        {room.book?.images?.[0] ? (
                          <img
                            src={room.book.images[0]}
                            alt={room.book.title}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">
                          {room.otherUser?.full_name ?? "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {room.book?.title ?? "Unknown Book"}
                        </p>
                        {room.book?.price && (
                          <p className="text-xs font-semibold text-accent mt-1">
                            Rs {Number(room.book.price).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-2">
              {selectedRoom ? (
                <ChatWindow
                  room={selectedRoom}
                  currentUserId={user.id}
                  currentUserName={currentProfile?.full_name ?? "You"}
                  currentUserProfile={currentProfile}
                />
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Select a conversation to start</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
