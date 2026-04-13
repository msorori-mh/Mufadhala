import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { receipt_path, payment_request_id } = await req.json();
    if (!receipt_path || !payment_request_id) {
      return new Response(JSON.stringify({ error: "receipt_path and payment_request_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 3 uploads per user per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await adminClient
      .from("payment_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString());

    if ((count ?? 0) > 3) {
      return new Response(JSON.stringify({ error: "rate_limited", message: "تجاوزت الحد الأقصى لعدد الطلبات اليومية (3)" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download receipt image
    const { data: fileData, error: dlErr } = await adminClient.storage
      .from("receipts")
      .download(receipt_path);
    if (dlErr || !fileData) throw new Error("Failed to download receipt");

    const imgBuf = await fileData.arrayBuffer();
    const receiptHash = await sha256Hex(imgBuf);

    // Phase 1: Check exact image duplicate by hash
    let fraudStatus = "clean";
    let duplicateCount = 0;

    const { data: hashMatches } = await adminClient
      .from("payment_requests")
      .select("id, user_id, fraud_status, duplicate_count")
      .eq("receipt_hash", receiptHash)
      .neq("id", payment_request_id);

    if (hashMatches && hashMatches.length > 0) {
      fraudStatus = "suspicious";
      duplicateCount = hashMatches.length;

      // Increment duplicate_count on existing records
      for (const match of hashMatches) {
        await adminClient
          .from("payment_requests")
          .update({
            duplicate_count: (match.duplicate_count || 0) + 1,
            fraud_status: "suspicious",
          })
          .eq("id", match.id);
      }
    }

    // Phase 2: OCR extraction via existing analyze-receipt
    let extractedAmount: number | null = null;
    let extractedReference: string | null = null;
    let extractedDate: string | null = null;

    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
        const mimeType = "image/jpeg";

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{
              role: "user",
              content: [
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
                {
                  type: "text",
                  text: `حلل صورة إيصال/سند الدفع واستخرج:
1. المبلغ (رقم فقط)
2. رقم العملية أو المرجع
3. التاريخ

أجب بصيغة JSON فقط:
{"amount": "...", "reference": "...", "date": "..."}
إذا لم تستطع قراءة حقل اكتب null.`,
                },
              ],
            }],
          }),
        });

        if (aiRes.ok) {
          const aiResult = await aiRes.json();
          const raw = aiResult.choices?.[0]?.message?.content || "";
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.amount) {
              const num = parseFloat(String(parsed.amount).replace(/[^\d.]/g, ""));
              if (!isNaN(num)) extractedAmount = num;
            }
            extractedReference = parsed.reference || null;
            extractedDate = parsed.date || null;
          }
        }
      }
    } catch (e) {
      console.error("OCR extraction failed (non-critical):", e);
    }

    // Phase 3: Smart duplicate detection (if not already suspicious)
    if (fraudStatus === "clean" && extractedReference) {
      const { data: refMatches } = await adminClient
        .from("payment_requests")
        .select("id")
        .eq("extracted_reference", extractedReference)
        .neq("id", payment_request_id);

      if (refMatches && refMatches.length > 0) {
        fraudStatus = "suspicious";
        duplicateCount = refMatches.length;
      }
    }

    if (fraudStatus === "clean" && extractedAmount) {
      // Same amount on same day = review
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const { data: amountMatches } = await adminClient
        .from("payment_requests")
        .select("id")
        .eq("extracted_amount", extractedAmount)
        .neq("id", payment_request_id)
        .gte("created_at", dayStart.toISOString());

      if (amountMatches && amountMatches.length > 0) {
        fraudStatus = "review";
      }
    }

    // Update the payment request with fraud data
    const { error: updateErr } = await adminClient
      .from("payment_requests")
      .update({
        receipt_hash: receiptHash,
        extracted_amount: extractedAmount,
        extracted_reference: extractedReference,
        extracted_date: extractedDate,
        fraud_status: fraudStatus,
        duplicate_count: duplicateCount,
      })
      .eq("id", payment_request_id);

    if (updateErr) {
      console.error("Failed to update fraud data:", updateErr);
    }

    return new Response(JSON.stringify({
      fraud_status: fraudStatus,
      duplicate_count: duplicateCount,
      extracted_amount: extractedAmount,
      extracted_reference: extractedReference,
      extracted_date: extractedDate,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-receipt-fraud error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
