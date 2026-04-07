import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory IP rate limiting (resets on cold start, but provides server-side protection)
const DAILY_LIMIT = 20;
const ipUsage = new Map<string, { count: number; date: string }>();

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Server-side rate limiting by IP
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

    const systemPrompt = `أنت "مساعد قَبُول"، مساعد ذكي لمنصة قَبُول (Qubool) للتحضير لاختبارات القبول الجامعي في اليمن.

مهامك:
1. **حل وشرح الواجبات**: عندما يرسل الطالب سؤالاً أو واجباً، لا تكتفِ بإعطاء الإجابة النهائية فقط، بل:
   - اشرح المفهوم الأساسي وراء السؤال
   - وضّح خطوات الحل بالتفصيل خطوة بخطوة
   - اذكر القوانين أو القواعد المستخدمة في كل خطوة
   - أعطِ الإجابة النهائية بوضوح
   - قدّم نصيحة أو ملاحظة تساعد الطالب على حل أسئلة مشابهة مستقبلاً
2. **المساعدة التعليمية**: شرح المفاهيم الأكاديمية، المساعدة في فهم الدروس، تقديم نصائح للدراسة والتحضير للاختبارات.
3. **الدعم الفني**: الإجابة على أسئلة حول الاشتراكات، استخدام التطبيق، والميزات المتاحة.

إرشادات:
- أجب باللغة العربية دائماً
- كن مختصراً ومفيداً
- عند شرح حل سؤال، استخدم تنسيق واضح مع ترقيم الخطوات
- إذا كان السؤال يحتمل أكثر من طريقة حل، اذكر الطريقة الأسهل أولاً ثم أشر للطرق البديلة
- شجّع الطالب على المحاولة بنفسه أولاً إذا بدا أنه يريد الإجابة فقط دون فهم
- كن ودوداً ومشجعاً`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
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
