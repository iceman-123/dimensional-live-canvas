import { createFileRoute } from "@tanstack/react-router";
import { SendHorizontal, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { GoogleButton } from "@/components/app/GoogleButton";
import { PageHeader } from "@/components/app/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "ချက်တင် — 2D3D Live အသိုင်းအဝိုင်း" },
      { name: "description", content: "2D3D Live အသုံးပြုသူများနှင့် တိုက်ရိုက် စကားပြောခန်း" },
      { property: "og:title", content: "ချက်တင် | 2D3D Live" },
      { property: "og:description", content: "2D3D Live တိုက်ရိုက် စကားပြောခန်း" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

type Message = {
  id: string;
  is_mine: boolean;
  author_name: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
};

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Yangon",
  });

function ChatPage() {
  const { userId, isAdmin, ready, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Shared feed comes from a database function that hides account ids;
  // a data-free "doorbell" broadcast tells open screens to reload it.
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_chat_feed", { _limit: 100 });
    if (error) {
      toast.error("မက်ဆေ့ချ်များ ယူ၍မရပါ");
      return;
    }
    setMessages([...(data ?? [])].reverse());
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Chat is readable only by signed-in users (enforced by database rules).
    if (!userId) {
      setMessages([]);
      setLoaded(false);
      return;
    }
    void load();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let alive = true;
    void supabase.realtime.setAuth().then(() => {
      if (!alive) return;
      channel = supabase
        .channel("chat-room", { config: { private: true } })
        .on("broadcast", { event: "changed" }, () => void load())
        .subscribe();
    });
    return () => {
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  // Who is online (shared presence room).
  useEffect(() => {
    const key = userId ?? `guest-${Math.random().toString(36).slice(2)}`;
    const room = supabase.channel("chat-presence", { config: { presence: { key } } });
    room
      .on("presence", { event: "sync" }, () =>
        setOnline(Math.max(1, Object.keys(room.presenceState()).length)),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void room.track({ at: Date.now() });
      });
    return () => {
      void supabase.removeChannel(room);
    };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !userId || sending) return;
    if (body.length > 500) {
      toast.error("စာလုံး ၅၀၀ ထက် မကျော်ရပါ");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({ body, user_id: userId });
    setSending(false);
    if (error) {
      toast.error("ပို့၍မရပါ။ ပြန်ကြိုးစားပါ။");
      return;
    }
    setText("");
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) {
      toast.error("ဖျက်၍မရပါ");
      return;
    }
    setMessages((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <PageHeader
        className="-mx-2 px-2"
        title="ချက်တင်"
        subtitle="2D3D Live အသုံးပြုသူများနှင့် စကားပြောပါ"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2.5 py-1 text-[11px] text-live">
            <Users className="h-3 w-3" /> {online} online
          </span>
        }
      />

      <div className="flex-1 space-y-3 pb-4">
        {ready && !userId && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            မက်ဆေ့ချ်များ ဖတ်ရန် Google ဖြင့် ဝင်ပါ။
          </p>
        )}
        {loaded && messages.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            မက်ဆေ့ချ် မရှိသေးပါ။ ပထမဆုံး စကားပြောလိုက်ပါ။
          </p>
        )}
        {messages.map((m) => {
          const mine = m.is_mine;
          return (
            <div key={m.id} className={cn("group flex gap-2", mine && "flex-row-reverse")}>
              <Avatar name={m.author_name} url={m.avatar_url} />
              <div className={cn("max-w-[88%]", mine && "text-right")}>
                <p className="mb-0.5 text-[11px] text-muted-foreground">
                  {m.author_name} · {timeOf(m.created_at)}
                </p>
                <div className="flex items-center gap-1.5">
                  {mine && <DeleteBtn onClick={() => remove(m.id)} />}
                  <p
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-left text-[15px]",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/60 bg-card",
                    )}
                  >
                    {m.body}
                  </p>
                  {!mine && isAdmin && <DeleteBtn onClick={() => remove(m.id)} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-[4.5rem] -mx-2 border-t border-border/60 bg-background/95 px-2 py-3 backdrop-blur">
        {!ready ? (
          <div className="h-10" />
        ) : userId ? (
          <form onSubmit={send} className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder={`${profile?.display_name ?? ""} အနေဖြင့် စာရေးပါ...`}
              className="h-12 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:border-primary/60"
              aria-label="မက်ဆေ့ချ်"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
              aria-label="ပို့မည်"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-2 text-center">
            <p className="text-xs text-muted-foreground">စကားပြောရန် Google ဖြင့် ဝင်ပါ</p>
            <GoogleButton />
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full p-1.5 text-muted-foreground opacity-60 transition-opacity hover:text-destructive hover:opacity-100"
      aria-label="ဖျက်မည်"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url)
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crimson/40 text-xs font-bold text-primary">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
