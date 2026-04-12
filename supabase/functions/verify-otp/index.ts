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
    const { phone, code, metadata } = await req.json();

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
      // Generate session for existing user
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

      // If metadata provided (from registration), update the student record
      if (metadata && existingUser.id) {
        const updateData: Record<string, unknown> = {};
        if (metadata.first_name) updateData.first_name = metadata.first_name;
        if (metadata.fourth_name) updateData.fourth_name = metadata.fourth_name;
        if (metadata.governorate) updateData.governorate = metadata.governorate;
        if (metadata.university_id) updateData.university_id = metadata.university_id;
        if (metadata.college_id) updateData.college_id = metadata.college_id;
        if (metadata.phone) updateData.phone = metadata.phone;

        if (Object.keys(updateData).length > 0) {
          await supabaseAdmin
            .from("students")
            .update(updateData)
            .eq("user_id", existingUser.id);
        }
      }
    } else {
      // Create new user with phone + metadata
      const fakeEmail = `${fullPhone.replace("+", "")}@phone.mufadhala.app`;
      const userMetadata: Record<string, unknown> = { phone: fullPhone };
      
      // Pass registration metadata so the handle_new_user trigger picks it up
      if (metadata) {
        if (metadata.first_name) userMetadata.first_name = metadata.first_name;
        if (metadata.fourth_name) userMetadata.fourth_name = metadata.fourth_name;
        if (metadata.governorate) userMetadata.governorate = metadata.governorate;
        if (metadata.university_id) userMetadata.university_id = metadata.university_id;
        if (metadata.college_id) userMetadata.college_id = metadata.college_id;
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: fakeEmail,
        phone: fullPhone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: userMetadata,
      });

      if (createError || !newUser.user) {
        console.error("Create user error:", createError);
        return new Response(
          JSON.stringify({ error: "فشل في إنشاء الحساب" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also update the phone in students table (trigger creates student but may not set phone)
      if (metadata?.phone || fullPhone) {
        await supabaseAdmin
          .from("students")
          .update({ phone: fullPhone.replace("+967", "") })
          .eq("user_id", newUser.user.id);
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
        isNewUser: !existingUser,
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
