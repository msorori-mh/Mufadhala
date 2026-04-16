import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 60 * 60; // 1 hour

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();

    if (!phone || !code || code.length !== 6) {
      return new Response(
        JSON.stringify({ error: "بيانات غير صالحة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullPhone = phone.startsWith("+") ? phone : `+967${phone}`;
    const lockKey = `otp_lock:${fullPhone}`;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check current lockout / attempt state
    const { data: cached } = await supabaseAdmin.rpc("get_cache", { _key: lockKey });
    const state = (cached as { attempts?: number; locked_until?: string } | null) ?? null;

    if (state?.locked_until && new Date(state.locked_until) > new Date()) {
      const minutesLeft = Math.ceil(
        (new Date(state.locked_until).getTime() - Date.now()) / 60000
      );
      return new Response(
        JSON.stringify({
          error: `تم حظر المحاولات مؤقتاً بسبب إدخال رموز خاطئة. حاول مجدداً بعد ${minutesLeft} دقيقة.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from("otp_codes")
      .select("id")
      .eq("phone", fullPhone)
      .eq("code", code)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !otpRecord) {
      // Increment failed attempts
      const attempts = (state?.attempts ?? 0) + 1;
      const remaining = MAX_FAILED_ATTEMPTS - attempts;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_SECONDS * 1000).toISOString();
        await supabaseAdmin.rpc("set_cache", {
          _key: lockKey,
          _value: { attempts, locked_until: lockedUntil },
          _ttl_seconds: LOCKOUT_SECONDS,
        });
        return new Response(
          JSON.stringify({
            error: "تم حظر المحاولات لمدة ساعة بسبب إدخال 3 رموز خاطئة متتالية.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.rpc("set_cache", {
        _key: lockKey,
        _value: { attempts },
        _ttl_seconds: LOCKOUT_SECONDS,
      });

      return new Response(
        JSON.stringify({
          error: `رمز التحقق غير صحيح. تبقى لديك ${remaining} ${remaining === 1 ? "محاولة" : "محاولات"}.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success — clear lock state and finalize OTP
    await Promise.all([
      supabaseAdmin.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id),
      supabaseAdmin.from("otp_codes").delete().eq("phone", fullPhone).eq("verified", true).neq("id", otpRecord.id),
      supabaseAdmin.from("app_cache").delete().eq("key", lockKey),
    ]);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-otp error:", err);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
