import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();

    if (!phone || typeof phone !== "string" || !/^7[0-9]{8}$/.test(phone)) {
      return jsonResponse({ error: "رقم الجوال غير صحيح" }, 400);
    }
    if (!code || typeof code !== "string" || code.length !== 6) {
      return jsonResponse({ error: "رمز التحقق غير صالح" }, 400);
    }

    const fullPhone = `+967${phone}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Verify OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("id")
      .eq("phone", fullPhone)
      .eq("code", code)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return jsonResponse({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, 400);
    }

    // Mark OTP as verified
    await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);

    // 2. Find student by phone
    const { data: student } = await supabase
      .from("students")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (!student) {
      return jsonResponse({ error: "لا يوجد حساب مسجل بهذا الرقم. يرجى التسجيل أولاً." }, 404);
    }

    // 3. Set temp password and sign in
    const dummyEmail = `${phone}@mufadhala.app`;
    const tempPassword = `muf_${phone}_${Date.now()}`;

    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      student.user_id,
      { password: tempPassword },
    );

    if (updateErr) {
      console.error("updateUserById error:", updateErr);
      return jsonResponse({ error: "فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى." }, 500);
    }

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email: dummyEmail, password: tempPassword });

    if (signInError || !signInData.session) {
      console.error("Sign-in error:", signInError);
      return jsonResponse({ error: "فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى." }, 500);
    }

    // Clean up old OTPs
    await supabase.from("otp_codes").delete().eq("phone", fullPhone);

    return jsonResponse({
      success: true,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    });
  } catch (err) {
    console.error("login-student error:", err);
    return jsonResponse({ error: "حدث خطأ غير متوقع" }, 500);
  }
});
