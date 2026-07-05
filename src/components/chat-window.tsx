import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MapPin, DollarSign, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase, type ChatMessage as ChatMessageType, type ChatRoom } from "@/lib/supabase";
import { getChatMessages, proposeCounterOffer, sendChatMessage, subscribeToRoomMessages, updateChatMessageOfferStatus } from "@/lib/chat-utils";

interface ChatWindowProps {
  room: ChatRoom & { book: any; otherUser: any };
  currentUserId: string;
  currentUserName: string;
  currentUserProfile: any;
}

export function ChatWindow({
  room,
  currentUserId,
  currentUserName,
  currentUserProfile,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [counterOfferAmount, setCounterOfferAmount] = useState("");
  const [showOfferComposer, setShowOfferComposer] = useState(false);
  const [counterOfferMessageId, setCounterOfferMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages
  useEffect(() => {
    (async () => {
      setLoading(true);
      const initialMessages = await getChatMessages(room.id);
      setMessages(initialMessages);
      setLoading(false);
    })();
  }, [room.id]);

  // Subscribe to real-time messages
  useEffect(() => {
    const unsubscribe = subscribeToRoomMessages(
      room.id,
      (newMessage) => {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      },
      (error) => {
        console.error("Real-time subscription error:", error);
        toast.error("Failed to receive real-time messages");
      }
    );

    return () => {
      unsubscribe();
    };
  }, [room.id]);

  const appendMessage = (message: ChatMessageType) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setSending(true);
    const message = await sendChatMessage(room.id, currentUserId, inputValue);

    if (message) {
      setInputValue("");
      appendMessage(message);
    } else {
      toast.error("Failed to send message");
    }
    setSending(false);
  };

  const handleSendOffer = async () => {
    const parsedAmount = Number(offerAmount);

    if (!offerAmount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid PKR amount");
      return;
    }

    setSending(true);
    const message = await sendChatMessage(room.id, currentUserId, `Offer: PKR ${parsedAmount}`, {
      is_offer: true,
      offer_amount: parsedAmount,
      offer_status: "pending",
    });

    if (message) {
      setOfferAmount("");
      setShowOfferComposer(false);
      appendMessage(message);
    } else {
      toast.error("Failed to send offer");
    }
    setSending(false);
  };

  const handleOfferDecision = async (messageId: string, status: NonNullable<ChatMessageType["offer_status"]>) => {
    const updatedMessage = await updateChatMessageOfferStatus(messageId, status);

    if (updatedMessage) {
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? updatedMessage : msg)));
    } else {
      toast.error("Failed to update offer");
    }
  };

  const handleSendCounterOffer = async (originalMessageId: string) => {
    const parsedAmount = Number(counterOfferAmount);

    if (!counterOfferAmount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid PKR amount");
      return;
    }

    setSending(true);
    const result = await proposeCounterOffer(room.id, currentUserId, originalMessageId, parsedAmount);

    if (result.originalMessage && result.newMessage) {
      setMessages((prev) => {
        const updated = prev.map((msg) => (msg.id === originalMessageId ? result.originalMessage! : msg));
        return updated.some((item) => item.id === result.newMessage!.id) ? updated : [...updated, result.newMessage!];
      });
      setCounterOfferAmount("");
      setCounterOfferMessageId(null);
    } else {
      toast.error("Failed to send counter-offer");
    }
    setSending(false);
  };

  const handleLocationTemplate = (template: string) => {
    setInputValue(template);
  };

  const otherUserName = room.otherUser?.full_name ?? "User";
  const isSeller = currentUserId === room.seller_id;
  const isBuyer = currentUserId === room.buyer_id;

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border">
      {/* Header */}
      <div className="border-b p-4 bg-secondary/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{otherUserName}</h2>
            {room.book && (
              <p className="text-sm text-muted-foreground">
                About: <span className="font-medium">{room.book.title}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Location Templates */}
      <div className="border-b px-4 py-2 flex flex-wrap gap-2 bg-background/50">
        {[
          "Let's meet at Central Library",
          "Meet at Campus Cafeteria",
          "Let's connect at the Admin Block gate",
        ].map((template) => (
          <Button
            key={template}
            size="sm"
            variant="outline"
            onClick={() => handleLocationTemplate(template)}
            className="text-xs"
          >
            <MapPin className="w-3 h-3 mr-1" /> {template}
          </Button>
        ))}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center">
              No messages yet. Say hi and ask if the book is still available!
            </p>
          </div>
        ) : (
          sortedMessages.map((msg) => {
            const isCurrentUser = msg.sender_id === currentUserId;

            if (msg.is_offer) {
              const pending = msg.offer_status === "pending";
              const accepted = msg.offer_status === "accepted";
              const rejected = msg.offer_status === "rejected";
              const isOfferSender = msg.sender_id === currentUserId;
              const canRespond = pending && !isOfferSender;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md rounded-xl border p-3 shadow-sm ${
                      isCurrentUser
                        ? "border-amber-200 bg-amber-50 text-amber-950"
                        : "border-amber-200 bg-background text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <DollarSign className="w-4 h-4" />
                      Offer Request
                    </div>
                    <p className="mt-2 text-sm break-words">
                      {msg.message_text || `Buyer requested PKR ${Number(msg.offer_amount ?? 0).toLocaleString()}`}
                    </p>
                    {msg.offer_amount != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Amount: PKR {Number(msg.offer_amount).toLocaleString()}
                      </p>
                    )}

                    {canRespond ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void handleOfferDecision(msg.id, "accepted")}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Accept Offer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void handleOfferDecision(msg.id, "rejected")}>
                          <X className="mr-1 h-3.5 w-3.5" /> Reject Offer
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setCounterOfferMessageId(msg.id);
                            setCounterOfferAmount("");
                          }}
                        >
                          Counter Offer
                        </Button>
                      </div>
                    ) : pending ? (
                      <div className="mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                        {isSeller ? "Offer Pending... Waiting for Buyer" : "Offer Pending... Waiting for Seller"}
                      </div>
                    ) : accepted ? (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                        <div className="font-semibold">🤝 Deal Confirmed! Handshake Receipt</div>
                        <div className="mt-1">
                          Book agreed at {Number(msg.offer_amount ?? 0).toLocaleString()} PKR. Meet inside Larkana Campus safely.
                        </div>
                      </div>
                    ) : rejected ? (
                      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
                        Offer rejected.
                      </div>
                    ) : null}

                    <div className={`text-[10px] mt-2 ${
                      isCurrentUser
                        ? "text-amber-900/70"
                        : "text-muted-foreground"
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isCurrentUser
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-foreground border"
                  }`}
                >
                  <p className="text-sm break-words">{msg.message_text}</p>
                  <div className={`text-[10px] mt-1 ${
                    isCurrentUser
                      ? "text-accent-foreground/70"
                      : "text-muted-foreground"
                  }`}>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-background space-y-2">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !sending) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message…"
            disabled={sending}
            className="flex-1"
          />
          {isBuyer && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowOfferComposer((prev) => !prev)}
              className="shrink-0"
              title="Make an offer"
            >
              <DollarSign className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={handleSendMessage}
            disabled={sending || !inputValue.trim()}
            size="icon"
            className="bg-accent hover:bg-accent/90"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {showOfferComposer && isBuyer && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="Enter PKR amount"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !sending) {
                    e.preventDefault();
                    void handleSendOffer();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button onClick={() => void handleSendOffer()} disabled={sending || !offerAmount.trim()}>
                  Send Offer
                </Button>
                <Button variant="ghost" onClick={() => {
                  setShowOfferComposer(false);
                  setOfferAmount("");
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {counterOfferMessageId && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="Enter revised PKR amount"
                value={counterOfferAmount}
                onChange={(e) => setCounterOfferAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !sending) {
                    e.preventDefault();
                    void handleSendCounterOffer(counterOfferMessageId);
                  }
                }}
              />
              <div className="flex gap-2">
                <Button onClick={() => void handleSendCounterOffer(counterOfferMessageId)} disabled={sending || !counterOfferAmount.trim()}>
                  Send Counter
                </Button>
                <Button variant="ghost" onClick={() => {
                  setCounterOfferMessageId(null);
                  setCounterOfferAmount("");
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
