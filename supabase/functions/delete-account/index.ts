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

    // Check if a target_user_id was provided (admin deleting another user)
    let targetUserId = callingUserId;
    let body: any = {};
    try { body = await req.json(); } catch { /* no body = self-delete */ }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (body.target_user_id && body.target_user_id !== callingUserId) {
      // Verify the caller is an admin
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
    }

    // Get student record ID
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const studentId = student?.id;

    // Delete user data from all tables (order matters for dependencies)
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

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
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
