import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const DAILY_LIMIT = 20;
const STORAGE_KEY = "qubool_chat_usage";

function getDailyUsage(): { count: number; date: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const today = new Date().toDateString();
      if (parsed.date === today) return parsed;
    }
  } catch {}
  return { count: 0, date: new Date().toDateString() };
}

function incrementUsage() {
  const usage = getDailyUsage();
  usage.count += 1;
  usage.date = new Date().toDateString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

function getRemainingMessages(): number {
  return Math.max(0, DAILY_LIMIT - getDailyUsage().count);
}

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || "حدث خطأ غير متوقع");
    return;
  }

  if (!resp.body) {
    onError("لا يمكن الاتصال بالمساعد الذكي");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

const ChatWidget = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(getRemainingMessages());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (getRemainingMessages() <= 0) {
      toast.error("لقد وصلت للحد اليومي من الرسائل (20 رسالة). حاول مرة أخرى غداً!");
      return;
    }

    incrementUsage();
    setRemaining(getRemainingMessages());

    const userMsg: Message = { role: "user", content: text };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => setLoading(false),
        onError: (msg) => {
          toast.error(msg);
          setLoading(false);
        },
      });
    } catch {
      toast.error("حدث خطأ في الاتصال");
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className="fixed bottom-20 left-4 z-50 sm:bottom-6 sm:left-auto sm:right-6">
      {/* Chat bubble button */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat window */}
      {open && (
        <div className="flex flex-col bg-card border border-border rounded-2xl shadow-2xl w-[calc(100vw-2rem)] max-w-[380px] h-[70vh] max-h-[520px] sm:w-[380px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm text-foreground">مساعد قَبُول</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 px-4">
                <Bot className="h-10 w-10 text-primary/40" />
                <p className="text-sm">مرحباً! أنا مساعد قَبُول الذكي 👋</p>
                <p className="text-xs">اسألني عن الدروس، الاختبارات، أو أي شيء يخص المنصة</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-primary/10" : "bg-accent"}`}>
                  {msg.role === "user" ? <User className="h-3.5 w-3.5 text-primary" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-xl px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            {remaining <= 0 ? (
              <p className="text-xs text-center text-destructive py-2">
                لقد وصلت للحد اليومي (20 رسالة). حاول مرة أخرى غداً!
              </p>
            ) : (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="اكتب سؤالك هنا..."
                    disabled={loading}
                    className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground disabled:opacity-50"
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 rounded-xl" disabled={loading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                  {remaining} رسالة متبقية اليوم
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

ChatWidget.displayName = "ChatWidget";

export default ChatWidget;
