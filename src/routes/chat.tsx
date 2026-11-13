import { createFileRoute } from "@tanstack/react-router";
import { SendHorizontal, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  user_id: string;
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

  useEffect(() => {
    let alive = true;
    supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) toast.error("မက်ဆေ့ချ်များ ယူ၍မရပါ");
        if (alive && data) setMessages([...data].reverse());
        if (alive) setLoaded(true);
      });

    const channel = supabase
      .channel(`chat-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev.slice(-199), m],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          setMessages((prev) => prev.filter((x) => x.id !== id));
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, []);

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
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ body, user_id: userId })
      .select()
      .single();
    setSending(false);
    if (error) {
      toast.error("ပို့၍မရပါ။ ပြန်ကြိုးစားပါ။");
      return;
    }
    setText("");
    if (data) setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
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
        title="ချက်တင်"
        subtitle="2D3D Live အသုံးပြုသူများနှင့် စကားပြောပါ"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2.5 py-1 text-[11px] text-live">
            <Users className="h-3 w-3" /> {online} online
          </span>
        }
      />

      <div className="flex-1 space-y-3 pb-4">
        {loaded && messages.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            မက်ဆေ့ချ် မရှိသေးပါ။ ပထမဆုံး စကားပြောလိုက်ပါ။
          </p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === userId;
          return (
            <div key={m.id} className={cn("group flex gap-2", mine && "flex-row-reverse")}>
              <Avatar name={m.author_name} url={m.avatar_url} />
              <div className={cn("max-w-[75%]", mine && "text-right")}>
                <p className="mb-0.5 text-[11px] text-muted-foreground">
                  {m.author_name} · {timeOf(m.created_at)}
                </p>
                <div className="flex items-center gap-1.5">
                  {mine && <DeleteBtn onClick={() => remove(m.id)} />}
                  <p
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-left text-sm",
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

      <div className="sticky bottom-[4.5rem] -mx-4 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        {!ready ? (
          <div className="h-10" />
        ) : userId ? (
          <form onSubmit={send} className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder={`${profile?.display_name ?? ""} အနေဖြင့် စာရေးပါ...`}
              className="h-11 flex-1 rounded-full border border-input bg-card px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
              aria-label="မက်ဆေ့ချ်"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
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
