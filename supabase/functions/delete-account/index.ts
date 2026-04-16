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
    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ─── Mode 1: Admin deleting another user (requires auth) ───
    if (body.target_user_id && authHeader?.startsWith("Bearer ")) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !callingUser) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: callingUser.id,
        _role: "admin",
      });

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Only admins can delete other users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent admin self-delete via admin panel
      if (body.target_user_id === callingUser.id) {
        return new Response(
          JSON.stringify({ error: "لا يمكن للمدير حذف حسابه الخاص من لوحة الإدارة" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return await deleteUserById(supabaseAdmin, body.target_user_id, callingUser.id, body.reason || "حذف بواسطة المدير", true);
    }

    // ─── Mode 2: Self-delete via phone + OTP verification ───
    const { phone, code } = body;

    if (!phone || !code || code.length !== 6) {
      return new Response(
        JSON.stringify({ error: "يرجى إدخال رقم الهاتف ورمز التحقق" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullPhone = phone.startsWith("+") ? phone : `+967${phone}`;

    // Verify OTP
    const { data: otpRecord, error: otpError } = await supabaseAdmin
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
      return new Response(
        JSON.stringify({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as used
    await supabaseAdmin.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);

    // Find student by phone
    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id, user_id, first_name, second_name, third_name, fourth_name")
      .eq("phone", fullPhone)
      .maybeSingle();

    if (studentError || !student) {
      return new Response(
        JSON.stringify({ error: "لم يتم العثور على حساب مرتبط بهذا الرقم" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent admin/moderator self-delete via this flow
    const { data: isStaff } = await supabaseAdmin.rpc("has_role", {
      _user_id: student.user_id,
      _role: "admin",
    });
    if (isStaff) {
      return new Response(
        JSON.stringify({ error: "لا يمكن حذف حساب المدير من هذه الصفحة" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up all OTPs for this phone
    await supabaseAdmin.from("otp_codes").delete().eq("phone", fullPhone);

    return await deleteUserById(supabaseAdmin, student.user_id, student.user_id, body.reason || "حذف ذاتي بواسطة المستخدم عبر OTP", false);

  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function deleteUserById(
  supabaseAdmin: any,
  targetUserId: string,
  callingUserId: string,
  reason: string,
  isAdminAction: boolean
) {
  // Get target user's student info for logging
  const { data: targetStudent } = await supabaseAdmin
    .from("students")
    .select("id, first_name, second_name, third_name, fourth_name")
    .eq("user_id", targetUserId)
    .maybeSingle();

  const studentId = targetStudent?.id;
  const deletedUserName = targetStudent
    ? [targetStudent.first_name, targetStudent.second_name, targetStudent.third_name, targetStudent.fourth_name].filter(Boolean).join(" ")
    : "مستخدم غير معروف";

  let deletedByName = "حذف ذاتي";
  if (isAdminAction) {
    const { data: adminStudent } = await supabaseAdmin
      .from("students")
      .select("first_name, second_name, third_name, fourth_name")
      .eq("user_id", callingUserId)
      .maybeSingle();
    deletedByName = adminStudent
      ? [adminStudent.first_name, adminStudent.second_name, adminStudent.third_name, adminStudent.fourth_name].filter(Boolean).join(" ")
      : "مدير";
  }

  // Delete user data from all tables
  if (studentId) {
    await supabaseAdmin.from("lesson_reviews").delete().eq("student_id", studentId);
    await supabaseAdmin.from("lesson_progress").delete().eq("student_id", studentId);
    await supabaseAdmin.from("exam_attempts").delete().eq("student_id", studentId);
  }

  await supabaseAdmin.from("notifications").delete().eq("user_id", targetUserId);
  await supabaseAdmin.from("payment_requests").delete().eq("user_id", targetUserId);
  await supabaseAdmin.from("subscriptions").delete().eq("user_id", targetUserId);
  await supabaseAdmin.from("moderator_permissions").delete().eq("user_id", targetUserId);
  await supabaseAdmin.from("moderator_scopes").delete().eq("user_id", targetUserId);
  await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId);

  if (studentId) {
    await supabaseAdmin.from("students").delete().eq("id", studentId);
  }

  // Log the deletion
  await supabaseAdmin.from("deletion_logs").insert({
    deleted_user_id: targetUserId,
    deleted_user_name: deletedUserName,
    deleted_by: callingUserId,
    deleted_by_name: isAdminAction ? deletedByName : "حذف ذاتي",
    reason,
  });

  // Delete the auth user
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (deleteError && deleteError.status !== 404) {
    console.error("Error deleting auth user:", deleteError);
    return new Response(
      JSON.stringify({ error: "Failed to delete account" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
