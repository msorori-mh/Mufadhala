import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string" || phone.length < 9) {
      return new Response(
        JSON.stringify({ error: "رقم هاتف غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullPhone = phone.startsWith("+") ? phone : `+967${phone}`;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: check if a code was sent in the last 60 seconds
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentCodes } = await supabaseAdmin
      .from("otp_codes")
      .select("created_at")
      .eq("phone", fullPhone)
      .gte("created_at", sixtySecondsAgo)
      .limit(1);

    if (recentCodes && recentCodes.length > 0) {
      const createdAt = new Date(recentCodes[0].created_at).getTime();
      const remaining = Math.ceil((createdAt + 60000 - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: `يرجى الانتظار ${remaining} ثانية قبل إعادة الإرسال`, retryAfter: remaining }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Daily limit: max 5 codes per phone per day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: dailyCount } = await supabaseAdmin
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", fullPhone)
      .gte("created_at", startOfDay.toISOString());

    if (dailyCount !== null && dailyCount >= 5) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد اليومي لإرسال رموز التحقق. حاول غداً." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete old codes for this phone
    await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("phone", fullPhone);

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("otp_codes")
      .insert({ phone: fullPhone, code, expires_at: expiresAt });

    if (insertError) {
      console.error("DB insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "فشل في حفظ رمز التحقق" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send SMS via Twilio
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    if (!accountSid || !authToken || !fromPhone) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ error: "خطأ في إعداد خدمة الرسائل" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: fullPhone,
        From: fromPhone,
        Body: `رمز التحقق الخاص بك في مُفَاضَلَة: ${code}`,
      }),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio error:", JSON.stringify(twilioData));
      return new Response(
        JSON.stringify({ error: "فشل في إرسال الرسالة النصية" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-otp error:", err);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
