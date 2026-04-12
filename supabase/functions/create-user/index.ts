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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: callingUser.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can create users" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, first_name, last_name, role, permissions, scope } = body;

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: "email, password, and role are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the user with email confirmed
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: first_name || "",
        fourth_name: last_name || "",
      },
    });

    if (createError) {
      console.error("Create user error:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUserData.user.id;

    // The handle_new_user trigger will auto-create student + student role.
    // We need to update the role to admin/moderator if needed.
    if (role === "admin" || role === "moderator") {
      // Remove auto-assigned "student" role
      await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId).eq("role", "student");
      
      // Add the correct role
      await supabaseAdmin.from("user_roles").insert({ user_id: newUserId, role });
    }

    // Add moderator permissions if role is moderator
    if (role === "moderator" && permissions && Array.isArray(permissions)) {
      const permRows = permissions.map((p: string) => ({ user_id: newUserId, permission: p }));
      if (permRows.length > 0) {
        await supabaseAdmin.from("moderator_permissions").insert(permRows);
      }
    }

    // Add moderator scope if provided
    if (role === "moderator" && scope) {
      await supabaseAdmin.from("moderator_scopes").insert({
        user_id: newUserId,
        scope_type: scope.scope_type || "global",
        scope_id: scope.scope_id || null,
        is_global: scope.scope_type === "global",
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
