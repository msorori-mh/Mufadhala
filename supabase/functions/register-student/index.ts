import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, first_name, fourth_name, governorate, university_id, college_id, high_school_gpa } =
      await req.json();

    // Validate required fields
    if (!phone || !first_name || !fourth_name || !governorate || !university_id || !college_id) {
      return new Response(
        JSON.stringify({ error: "جميع الحقول مطلوبة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (Yemeni: starts with 7, 9 digits)
    if (!/^7[0-9]{8}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "رقم الجوال غير صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if phone is already used by another student
    const { data: existingStudent } = await supabase
      .from("students")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingStudent) {
      // Phone exists — check if it belongs to a different user (not the same phone-based email)
      const dummyEmailCheck = `${phone}@mufadhala.app`;
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const matchingUser = existingUsers?.users?.find(u => u.email === dummyEmailCheck);

      if (!matchingUser || matchingUser.id !== existingStudent.user_id) {
        return new Response(
          JSON.stringify({ error: "هذا الرقم مسجل بحساب آخر" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const dummyEmail = `${phone}@mufadhala.app`;
    const dummyPassword = `muf_${phone}_${Date.now()}`;

    // Check if user already exists with this phone-based email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === dummyEmail
    );

    let userId: string;
    let session: { access_token: string; refresh_token: string } | null = null;

    if (existingUser) {
      // User exists — sign them in by generating a new link
      // Update their password so we can sign them in
      const newPassword = `muf_${phone}_${Date.now()}`;
      await supabase.auth.admin.updateUserById(existingUser.id, {
        password: newPassword,
      });

      // Sign in with new password
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: dummyEmail,
          password: newPassword,
        });

      if (signInError || !signInData.session) {
        console.error("Sign-in error:", signInError);
        return new Response(
          JSON.stringify({ error: "فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = existingUser.id;
      session = {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      };

      // Update student record with latest data
      await supabase
        .from("students")
        .update({
          first_name: first_name.trim(),
          fourth_name: fourth_name.trim(),
          phone,
          governorate,
          university_id,
          college_id,
          gpa: high_school_gpa ?? null,
        })
        .eq("user_id", userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: dummyEmail,
          password: dummyPassword,
          email_confirm: true,
          user_metadata: {
            first_name: first_name.trim(),
            fourth_name: fourth_name.trim(),
            phone,
            governorate,
            university_id,
            college_id,
            high_school_gpa: high_school_gpa ?? null,
          },
        });

      if (createError || !newUser.user) {
        console.error("Create user error:", createError);
        return new Response(
          JSON.stringify({ error: "فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;

      // Sign in the new user
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: dummyEmail,
          password: dummyPassword,
        });

      if (signInError || !signInData.session) {
        console.error("Sign-in after create error:", signInError);
        return new Response(
          JSON.stringify({ error: "تم إنشاء الحساب لكن فشل تسجيل الدخول التلقائي." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      session = {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      };

      // Update student phone and gpa (trigger already creates the student record)
      await supabase
        .from("students")
        .update({ phone, gpa: high_school_gpa ?? null })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({ success: true, session }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
