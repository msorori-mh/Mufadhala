import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Camera, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Message = {
  role: "user" | "assistant";
  content: string | ContentPart[];
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const DEFAULT_DAILY_LIMIT = 30;
const FREE_DAILY_LIMIT = 5;
const STORAGE_KEY = "mufadhala_chat_usage";
const MAX_IMAGE_SIZE = 1024; // max dimension for resizing

let cachedDailyLimit: number | null = null;
let cachedWelcomeText: string | null = null;

async function fetchChatSettings(): Promise<{ limit: number; welcome: string }> {
  if (cachedDailyLimit !== null && cachedWelcomeText !== null) {
    return { limit: cachedDailyLimit, welcome: cachedWelcomeText };
  }
  try {
    const [limitRes, welcomeRes] = await Promise.all([
      supabase.rpc("get_cache", { _key: "chat_daily_limit" }),
      supabase.rpc("get_cache", { _key: "chat_welcome_text" }),
    ]);
    if (limitRes.data != null) {
      cachedDailyLimit = typeof limitRes.data === "number" ? limitRes.data : Number(limitRes.data);
      if (isNaN(cachedDailyLimit!)) cachedDailyLimit = DEFAULT_DAILY_LIMIT;
    } else {
      cachedDailyLimit = DEFAULT_DAILY_LIMIT;
    }
    if (welcomeRes.data != null && typeof welcomeRes.data === "string") {
      cachedWelcomeText = welcomeRes.data;
    } else {
      cachedWelcomeText = "مرحباً! أنا مساعد مُفَاضَلَة الذكي 👋";
    }
  } catch {
    cachedDailyLimit = DEFAULT_DAILY_LIMIT;
    cachedWelcomeText = "مرحباً! أنا مساعد مُفَاضَلَة الذكي 👋";
  }
  return { limit: cachedDailyLimit!, welcome: cachedWelcomeText! };
}

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

function getRemainingMessages(limit: number): number {
  return Math.max(0, limit - getDailyUsage().count);
}

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_SIZE) / width);
            width = MAX_IMAGE_SIZE;
          } else {
            width = Math.round((width * MAX_IMAGE_SIZE) / height);
            height = MAX_IMAGE_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getTextContent(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function getImages(content: string | ContentPart[]): string[] {
  if (typeof content === "string") return [];
  return content
    .filter((p): p is { type: "image_url"; image_url: { url: string } } => p.type === "image_url")
    .map((p) => p.image_url.url);
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
  const [dailyLimit, setDailyLimit] = useState(DEFAULT_DAILY_LIMIT);
  const [remaining, setRemaining] = useState(getRemainingMessages(DEFAULT_DAILY_LIMIT));
  const [welcomeText, setWelcomeText] = useState("مرحباً! أنا مساعد مُفَاضَلَة الذكي 👋");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChatSettings().then(({ limit, welcome }) => {
      setDailyLimit(limit);
      setRemaining(getRemainingMessages(limit));
      setWelcomeText(welcome);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً (الحد الأقصى 10 ميجابايت)");
      return;
    }

    try {
      const dataUrl = await resizeImage(file);
      setPendingImages((prev) => [...prev, dataUrl]);
    } catch {
      toast.error("حدث خطأ في معالجة الصورة");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const send = async () => {
    const text = input.trim();
    const images = [...pendingImages];
    if ((!text && images.length === 0) || loading) return;

    if (getRemainingMessages(dailyLimit) <= 0) {
      toast.error(`لقد وصلت للحد اليومي من الرسائل (${dailyLimit} رسالة). حاول مرة أخرى غداً!`);
      return;
    }

    incrementUsage();
    setRemaining(getRemainingMessages(dailyLimit));

    // Build multimodal content if images exist
    let userContent: string | ContentPart[];
    if (images.length > 0) {
      const parts: ContentPart[] = [];
      images.forEach((img) => {
        parts.push({ type: "image_url", image_url: { url: img } });
      });
      if (text) {
        parts.push({ type: "text", text });
      } else {
        parts.push({ type: "text", text: "ما هو حل هذا السؤال؟" });
      }
      userContent = parts;
    } else {
      userContent = text;
    }

    const userMsg: Message = { role: "user", content: userContent };
    setInput("");
    setPendingImages([]);
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
    <div ref={ref} className="fixed bottom-24 right-4 z-50 sm:bottom-8 sm:right-8">
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {open && (
        <div className="flex flex-col bg-card border border-border rounded-2xl shadow-2xl w-[calc(100vw-2rem)] max-w-[380px] h-[70vh] max-h-[520px] sm:w-[380px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm text-foreground">مساعد مُفَاضَلَة</span>
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
                <p className="text-sm">{welcomeText}</p>
                <p className="text-xs">اسألني عن الدروس، الاختبارات، أو صوّر سؤالك وأرسله لي 📸</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const text = getTextContent(msg.content);
              const images = getImages(msg.content);
              return (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-primary/10" : "bg-accent"}`}>
                    {msg.role === "user" ? <User className="h-3.5 w-3.5 text-primary" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {images.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {images.map((src, j) => (
                          <img key={j} src={src} alt="صورة مرفقة" className="rounded-lg max-h-32 max-w-full object-cover" />
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    ) : (
                      text && <span>{text}</span>
                    )}
                  </div>
                </div>
              );
            })}
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
                لقد وصلت للحد اليومي ({dailyLimit} رسالة). حاول مرة أخرى غداً!
              </p>
            ) : (
              <>
                {/* Pending images preview */}
                {pendingImages.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {pendingImages.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt="صورة" className="h-14 w-14 rounded-lg object-cover border border-border" />
                        <button
                          onClick={() => removePendingImage(i)}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                  className="flex gap-2 items-end"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={loading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={pendingImages.length > 0 ? "أضف تعليق أو أرسل مباشرة..." : "اكتب سؤالك هنا..."}
                    disabled={loading}
                    className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground disabled:opacity-50"
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 rounded-xl shrink-0" disabled={loading || (!input.trim() && pendingImages.length === 0)}>
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
