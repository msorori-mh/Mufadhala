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
    const { phone, code } = await req.json();

    if (!phone || !code || code.length !== 6) {
      return new Response(
        JSON.stringify({ error: "بيانات غير صالحة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullPhone = phone.startsWith("+") ? phone : `+967${phone}`;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("phone", fullPhone)
      .eq("code", code)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await supabaseAdmin
      .from("otp_codes")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    // Check if user exists with this phone
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.phone === fullPhone
    );

    let session;

    if (existingUser) {
      // Generate magic link / session for existing user
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: existingUser.email || `${fullPhone.replace("+", "")}@phone.mufadhala.app`,
      });

      if (error || !data) {
        console.error("Generate link error:", error);
        return new Response(
          JSON.stringify({ error: "فشل في تسجيل الدخول" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use the token to verify and get session
      const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
        token_hash: data.properties?.hashed_token,
        type: "magiclink",
      });

      if (verifyError || !verifyData.session) {
        console.error("Verify error:", verifyError);
        return new Response(
          JSON.stringify({ error: "فشل في تسجيل الدخول" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      session = verifyData.session;
    } else {
      // Create new user with phone
      const fakeEmail = `${fullPhone.replace("+", "")}@phone.mufadhala.app`;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: fakeEmail,
        phone: fullPhone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone: fullPhone },
      });

      if (createError || !newUser.user) {
        console.error("Create user error:", createError);
        return new Response(
          JSON.stringify({ error: "فشل في إنشاء الحساب" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate session for new user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: fakeEmail,
      });

      if (linkError || !linkData) {
        console.error("Generate link error:", linkError);
        return new Response(
          JSON.stringify({ error: "فشل في تسجيل الدخول" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
        token_hash: linkData.properties?.hashed_token,
        type: "magiclink",
      });

      if (verifyError || !verifyData.session) {
        console.error("Verify error:", verifyError);
        return new Response(
          JSON.stringify({ error: "فشل في تسجيل الدخول" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      session = verifyData.session;
    }

    // Clean up used OTP codes
    await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("phone", fullPhone);

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        },
      }),
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
