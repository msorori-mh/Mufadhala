import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_DAILY_LIMIT = 2;
const SUBSCRIBED_DAILY_LIMIT = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, count = 5, difficulty = "medium" } = await req.json();

    if (!subject || typeof subject !== "string") {
      return new Response(
        JSON.stringify({ error: "subject is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth: extract user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify JWT and get user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Check subscription status
    const { data: hasActiveSub } = await supabase.rpc("has_active_subscription", { _user_id: userId });
    const dailyLimit = hasActiveSub ? SUBSCRIBED_DAILY_LIMIT : FREE_DAILY_LIMIT;

    // Count today's usage
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: usageCount, error: countError } = await supabase
      .from("ai_generation_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("generated_at", todayStart.toISOString());

    if (countError) {
      console.error("Usage count error:", countError);
    }

    const currentUsage = usageCount ?? 0;

    if (currentUsage >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: "daily_limit_reached",
          message: hasActiveSub
            ? "وصلت للحد اليومي لتوليد الأسئلة. حاول مرة أخرى غداً."
            : "وصلت للحد المجاني لتوليد الأسئلة",
          remaining: 0,
          limit: dailyLimit,
          hasSubscription: !!hasActiveSub,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Proceed with generation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const difficultyMap: Record<string, string> = {
      easy: "سهلة ومباشرة، لتثبيت المفاهيم الأساسية",
      medium: "متوسطة الصعوبة، تتطلب فهماً جيداً للمادة",
      hard: "صعبة وتحتاج تفكيراً عميقاً وربط مفاهيم",
    };

    const subjectLabels: Record<string, string> = {
      biology: "أحياء",
      chemistry: "كيمياء",
      physics: "فيزياء",
      math: "رياضيات",
      english: "إنجليزي",
      computer: "الحاسوب / علوم الحاسب (مفاهيم برمجية أساسية، خوارزميات، منطق رقمي بمستوى اختبار قبول)",
      iq: "ذكاء",
      general: "ثقافة عامة",
    };

    const subjectName = subjectLabels[subject] || subject;
    const difficultyDesc = difficultyMap[difficulty] || difficultyMap["medium"];

    const systemPrompt = `أنت خبير في إعداد أسئلة اختبارات القبول الجامعي في اليمن.
أنشئ أسئلة اختيار من متعدد (4 خيارات: a, b, c, d) في مادة "${subjectName}".

القواعد:
- الأسئلة يجب أن تكون ${difficultyDesc}
- كل سؤال يجب أن يحتوي على: نص السؤال، 4 خيارات، الإجابة الصحيحة، وشرح مختصر
- الأسئلة يجب أن تكون باللغة العربية
- تجنب الأسئلة المكررة أو البسيطة جداً
- اجعل الأسئلة مشابهة لنمط اختبارات المفاضلة الحقيقية`;

    const userPrompt = `أنشئ ${count} أسئلة اختيار من متعدد في مادة "${subjectName}" بمستوى صعوبة "${difficulty}".`;

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
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_questions",
                description: "Generate practice questions for exam preparation",
                parameters: {
                  type: "object",
                  properties: {
                    questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question_text: { type: "string", description: "نص السؤال" },
                          option_a: { type: "string" },
                          option_b: { type: "string" },
                          option_c: { type: "string" },
                          option_d: { type: "string" },
                          correct_option: { type: "string", enum: ["a", "b", "c", "d"] },
                          explanation: { type: "string", description: "شرح الإجابة الصحيحة" },
                        },
                        required: ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["questions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_questions" } },
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
          JSON.stringify({ error: "يرجى إضافة رصيد لاستخدام مولّد الأسئلة." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "حدث خطأ في توليد الأسئلة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "لم يتم توليد أسئلة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record usage (service_role bypasses RLS)
    await supabase.from("ai_generation_usage").insert({
      user_id: userId,
      subject,
      difficulty,
    });

    const questions = JSON.parse(toolCall.function.arguments);

    // Add remaining count to response
    const remaining = Math.max(0, dailyLimit - currentUsage - 1);

    return new Response(JSON.stringify({ ...questions, remaining, limit: dailyLimit }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
