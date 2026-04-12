import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let DAILY_LIMIT = 30;
let AI_MODEL = "google/gemini-3-flash-preview";
let CUSTOM_SYSTEM_PROMPT = "";
let limitFetchedAt = 0;
const LIMIT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ipUsage = new Map<string, { count: number; date: string }>();

async function fetchChatSettings(): Promise<void> {
  if (Date.now() - limitFetchedAt < LIMIT_CACHE_TTL) return;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const [limitRes, modelRes, promptRes] = await Promise.all([
      sb.rpc("get_cache", { _key: "chat_daily_limit" }),
      sb.rpc("get_cache", { _key: "chat_ai_model" }),
      sb.rpc("get_cache", { _key: "chat_system_prompt" }),
    ]);
    if (limitRes.data != null) {
      const val = typeof limitRes.data === "number" ? limitRes.data : Number(limitRes.data);
      if (!isNaN(val)) DAILY_LIMIT = val;
    }
    if (modelRes.data != null && typeof modelRes.data === "string") {
      AI_MODEL = modelRes.data;
    }
    if (promptRes.data != null && typeof promptRes.data === "string") {
      CUSTOM_SYSTEM_PROMPT = promptRes.data;
    }
    limitFetchedAt = Date.now();
  } catch (e) {
    console.error("Failed to fetch chat settings:", e);
  }
}

function checkIpLimit(ip: string): boolean {
  const today = new Date().toDateString();
  const usage = ipUsage.get(ip);
  if (!usage || usage.date !== today) {
    ipUsage.set(ip, { count: 1, date: today });
    return true;
  }
  if (usage.count >= DAILY_LIMIT) return false;
  usage.count++;
  return true;
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") || "unknown";
}

// Cache guide text to avoid repeated DB queries
let guidesCache: { text: string; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getGuidesContext(): Promise<string> {
  if (guidesCache && Date.now() - guidesCache.fetchedAt < CACHE_TTL) {
    return guidesCache.text;
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const { data } = await sb
      .from("universities")
      .select("name_ar, guide_text")
      .not("guide_text", "is", null)
      .eq("is_active", true);

    if (data && data.length > 0) {
      const text = data
        .map((u: any) => `## ${u.name_ar}\n${u.guide_text}`)
        .join("\n\n");
      guidesCache = { text, fetchedAt: Date.now() };
      return text;
    }
  } catch (e) {
    console.error("Failed to fetch guides:", e);
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await fetchChatSettings();
    const clientIp = getClientIp(req);
    if (!checkIpLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: "لقد وصلت للحد اليومي من الرسائل. حاول مرة أخرى غداً!" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch university guides context
    const guidesContext = await getGuidesContext();

    const DEFAULT_SYSTEM_PROMPT = `أنت "مساعد مُفَاضَلَة"، مساعد ذكي لمنصة مُفَاضَلَة (Mufadhala) للتحضير لاختبارات القبول الجامعي في اليمن.

مهامك:
1. **حل وشرح الواجبات**: عندما يرسل الطالب سؤالاً أو واجباً، لا تكتفِ بإعطاء الإجابة النهائية فقط، بل:
   - اشرح المفهوم الأساسي وراء السؤال
   - وضّح خطوات الحل بالتفصيل خطوة بخطوة
   - اذكر القوانين أو القواعد المستخدمة في كل خطوة
   - أعطِ الإجابة النهائية بوضوح
   - قدّم نصيحة أو ملاحظة تساعد الطالب على حل أسئلة مشابهة مستقبلاً
2. **المساعدة التعليمية**: شرح المفاهيم الأكاديمية، المساعدة في فهم الدروس، تقديم نصائح للدراسة والتحضير للاختبارات.
3. **الدعم الفني**: الإجابة على أسئلة حول الاشتراكات، استخدام التطبيق، والميزات المتاحة.
4. **معلومات التنسيق والتسجيل**: عند سؤال الطالب عن مواعيد التنسيق أو شروط التسجيل أو متطلبات القبول في جامعة معينة، استخدم المعلومات من أدلة الجامعات المتاحة أدناه.

إرشادات:
- أجب باللغة العربية دائماً
- كن مختصراً ومفيداً
- عند شرح حل سؤال، استخدم تنسيق واضح مع ترقيم الخطوات
- إذا كان السؤال يحتمل أكثر من طريقة حل، اذكر الطريقة الأسهل أولاً ثم أشر للطرق البديلة
- شجّع الطالب على المحاولة بنفسه أولاً إذا بدا أنه يريد الإجابة فقط دون فهم
- كن ودوداً ومشجعاً
- عند بداية المحادثة أو الترحيب، استخدم "أهلاً عزيزي الطالب/الطالبة" بدلاً من "يا بطل" أو "يا بطلة" أو أي عبارات مشابهة
- لا تستخدم كلمة "بطل" أو "بطلة" في أي سياق للمخاطبة
- لا تُكرر أو تُعيد صياغة سؤال/رسالة الطالب في بداية ردك. ابدأ مباشرة بالإجابة أو الشرح دون إعادة ذكر ما قاله الطالب`;

    let systemPrompt = CUSTOM_SYSTEM_PROMPT.trim() || DEFAULT_SYSTEM_PROMPT;

    if (guidesContext) {
      systemPrompt += `\n\n--- أدلة التنسيق والتسجيل في الجامعات ---\n${guidesContext}`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد لاستخدام المساعد الذكي." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "حدث خطأ في الاتصال بالمساعد الذكي" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: "حدث خطأ في الاتصال بالمساعد الذكي" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
