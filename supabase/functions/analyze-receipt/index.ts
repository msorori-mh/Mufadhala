import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(name: string): string {
  return name
    .replace(/[\s\u200c\u200d]+/g, " ")
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase();
}

function namesMatch(extracted: string, expected: string): boolean {
  const a = normalize(extracted);
  const b = normalize(expected);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const aParts = a.split(" ").filter(Boolean);
  const bParts = b.split(" ").filter(Boolean);
  const common = aParts.filter((p) => bParts.includes(p));
  return common.length >= Math.min(2, Math.min(aParts.length, bParts.length));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { receipt_url, expected_account_name } = await req.json();
    if (!receipt_url) {
      return new Response(JSON.stringify({ error: "receipt_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch the image and convert to base64
    const imgRes = await fetch(receipt_url);
    if (!imgRes.ok) throw new Error("Failed to fetch receipt image");
    const imgBuf = await imgRes.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
              {
                type: "text",
                text: `حلل صورة إيصال/سند الدفع أو التحويل هذه واستخرج المعلومات التالية بدقة:
1. اسم المرسل (من قام بالتحويل/الدفع)
2. اسم المستلم (من استلم المبلغ / صاحب الحساب المحول إليه)
3. المبلغ (رقم فقط)
4. رقم العملية أو المرجع إن وجد

أجب بصيغة JSON فقط بدون أي نص إضافي:
{"sender_name": "...", "recipient_name": "...", "amount": "...", "transaction_id": "..."}

إذا لم تستطع قراءة حقل معين اكتب null.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let parsed: any = {};
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(
        JSON.stringify({ error: "parse_failed", raw: rawContent }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = {
      sender_name: parsed.sender_name || null,
      recipient_name: parsed.recipient_name || null,
      amount: parsed.amount || null,
      transaction_id: parsed.transaction_id || null,
      is_match: false,
    };

    if (result.recipient_name && expected_account_name) {
      result.is_match = namesMatch(result.recipient_name, expected_account_name);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-receipt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
