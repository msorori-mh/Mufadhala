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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const callingUserId = callingUser.id;

    let targetUserId = callingUserId;
    let isAdminAction = false;
    let body: any = {};
    try { body = await req.json(); } catch { /* no body = self-delete */ }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (body.target_user_id && body.target_user_id !== callingUserId) {
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: callingUserId,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Only admins can delete other users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetUserId = body.target_user_id;
      isAdminAction = true;
    }

    // Prevent admin from deleting their own account via admin panel
    if (body.target_user_id && body.target_user_id === callingUserId) {
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: callingUserId,
        _role: "admin",
      });
      if (isAdmin) {
        return new Response(
          JSON.stringify({ error: "لا يمكن للمدير حذف حسابه الخاص من لوحة الإدارة" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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

    // Get admin name for logging
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
      reason: body.reason || (isAdminAction ? "حذف بواسطة المدير" : "حذف ذاتي بواسطة المستخدم"),
    });

    // Delete the auth user (ignore "user not found" if already deleted)
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
  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
