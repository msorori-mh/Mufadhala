import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Wait for the trigger-created student row (up to ~3s) */
async function waitForStudentRow(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  maxMs = 3000,
): Promise<boolean> {
  const start = Date.now();
  const interval = 400;
  while (Date.now() - start < maxMs) {
    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      phone,
      first_name,
      fourth_name,
      governorate,
      university_id,
      college_id,
      major_id,
      high_school_gpa,
    } = await req.json();

    // --- Validate required fields ---
    if (!phone || !first_name || !fourth_name || !governorate || !university_id || !college_id) {
      return jsonResponse({ error: "جميع الحقول مطلوبة" }, 400);
    }
    if (!/^7[0-9]{8}$/.test(phone)) {
      return jsonResponse({ error: "رقم الجوال غير صحيح" }, 400);
    }
    if (!isValidUuid(university_id) || !isValidUuid(college_id)) {
      return jsonResponse({ error: "قيم الجامعة أو الكلية غير صالحة" }, 400);
    }
    if (major_id && !isValidUuid(major_id)) {
      return jsonResponse({ error: "قيمة التخصص غير صالحة" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const dummyEmail = `${phone}@mufadhala.app`;

    // ──────────────────────────────────────────────
    // 1. Check if student already exists by phone
    // ──────────────────────────────────────────────
    const { data: existingStudent } = await supabase
      .from("students")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    let session: { access_token: string; refresh_token: string };

    if (existingStudent) {
      // ── RETURNING USER ──
      const userId = existingStudent.user_id;
      console.log(`Returning user: ${userId}`);

      const tempPassword = `muf_${phone}_${Date.now()}`;
      const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });
      if (updateErr) {
        console.error("updateUserById error:", updateErr);
        return jsonResponse({ error: "فشل في تحديث بيانات الحساب. يرجى المحاولة مرة أخرى." }, 500);
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email: dummyEmail, password: tempPassword });

      if (signInError || !signInData.session) {
        console.error("Sign-in error:", signInError);
        return jsonResponse({ error: "فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى." }, 500);
      }

      session = {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      };
    } else {
      // ── NEW USER ──
      // Pass all data as metadata → trigger (handle_new_user) creates the student row
      console.log(`New registration for phone ${phone}`);

      const tempPassword = `muf_${phone}_${Date.now()}`;
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: dummyEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: first_name.trim(),
            fourth_name: fourth_name.trim(),
            phone,
            governorate,
            university_id,
            college_id,
            major_id: major_id || null,
            high_school_gpa: high_school_gpa ?? null,
          },
        });

      if (createError) {
        // Orphaned auth account (exists in auth but not in students)
        if (createError.message?.includes("already been registered")) {
          console.log("Auth user exists without student record — recovering");

          // Sign in directly (email is deterministic from phone)
          const recoverPassword = `muf_${phone}_${Date.now()}`;

          // We need the user ID — use getUserById alternative:
          // Since email is deterministic, try sign-in after password reset via admin
          // First, find user by listing with the specific email
          const { data: userData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
          // listUsers doesn't filter — use a targeted approach via the dummy email
          // Actually, just reset password and sign in; if it fails, report error
          
          // Try to get user by iterating (bounded to avoid full scan)
          let orphanedUserId: string | null = null;
          for (let page = 1; page <= 5; page++) {
            const { data: pageData } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
            if (!pageData?.users?.length) break;
            const found = pageData.users.find((u) => u.email === dummyEmail);
            if (found) { orphanedUserId = found.id; break; }
            if (pageData.users.length < 100) break;
          }

          if (!orphanedUserId) {
            return jsonResponse({ error: "حدث خطأ في البيانات. يرجى التواصل مع الدعم." }, 500);
          }

          await supabase.auth.admin.updateUserById(orphanedUserId, { password: recoverPassword });

          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({ email: dummyEmail, password: recoverPassword });

          if (signInError || !signInData.session) {
            return jsonResponse({ error: "فشل في استعادة الحساب. يرجى المحاولة مرة أخرى." }, 500);
          }

          // Wait for trigger to create student row
          await waitForStudentRow(supabase, orphanedUserId);

          return jsonResponse({
            success: true,
            session: {
              access_token: signInData.session.access_token,
              refresh_token: signInData.session.refresh_token,
            },
          });
        }

        console.error("Create user error:", createError);
        return jsonResponse({ error: "فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى." }, 500);
      }

      const userId = newUser.user!.id;

      // Sign in
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email: dummyEmail, password: tempPassword });

      if (signInError || !signInData.session) {
        console.error("Sign-in after create error:", signInError);
        return jsonResponse({ error: "تم إنشاء الحساب لكن فشل تسجيل الدخول. يرجى المحاولة مرة أخرى." }, 500);
      }

      session = {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      };

      // Wait for trigger to create the student row — no writes, just verify
      const exists = await waitForStudentRow(supabase, userId);
      if (!exists) {
        console.warn(`Student row not created by trigger within timeout for user ${userId}`);
        // Non-fatal: the trigger may still fire, and the student can use the profile page
      }
    }

    return jsonResponse({ success: true, session });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." }, 500);
  }
});
