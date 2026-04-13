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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const dummyEmail = `${phone}@mufadhala.app`;

    // ──────────────────────────────────────────────
    // 1. Check if a student record already exists for this phone
    // ──────────────────────────────────────────────
    const { data: existingStudent } = await supabase
      .from("students")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    let userId: string;
    let session: { access_token: string; refresh_token: string };

    if (existingStudent) {
      // ── RETURNING USER: use student.user_id directly ──
      userId = existingStudent.user_id;
      console.log(`Returning user found via students table: ${userId}`);

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
        console.error("Sign-in error for returning user:", signInError);
        return jsonResponse({ error: "فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى." }, 500);
      }

      session = {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      };

      // Update student data
      const { error: updErr } = await supabase
        .from("students")
        .update({
          first_name: first_name.trim(),
          fourth_name: fourth_name.trim(),
          governorate,
          university_id,
          college_id,
          major_id,
          gpa: high_school_gpa ?? null,
        })
        .eq("user_id", userId);

      if (updErr) console.error("Student update error (non-fatal):", updErr);

    } else {
      // ── NEW USER ──
      console.log(`No existing student for phone ${phone}, creating new user`);

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
            major_id,
            high_school_gpa: high_school_gpa ?? null,
          },
        });

      if (createError) {
        // If user already exists in auth but NOT in students table (orphaned auth account)
        if (createError.message?.includes("already been registered")) {
          console.log("Auth user exists but no student record — attempting recovery");

          // Look up the auth user by email
          const { data: listData } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1,
          });

          // Use getUserByEmail-style lookup via admin API
          // Since listUsers with filter isn't reliable, try signing in after password reset
          // We need to find the user ID. Try creating with a slightly different approach:
          // Actually, the admin API doesn't have getUserByEmail, so we query by the known email pattern.
          // The safest approach: list users and filter, but only for this specific conflict case.
          let orphanedUserId: string | null = null;

          // Try paginated search — but since this is a conflict recovery, 
          // we know the email exists, so let's use a targeted approach
          let page = 1;
          const perPage = 100;
          while (!orphanedUserId) {
            const { data: pageData, error: listErr } = await supabase.auth.admin.listUsers({
              page,
              perPage,
            });
            if (listErr || !pageData?.users?.length) break;
            const found = pageData.users.find((u) => u.email === dummyEmail);
            if (found) {
              orphanedUserId = found.id;
              break;
            }
            if (pageData.users.length < perPage) break;
            page++;
          }

          if (!orphanedUserId) {
            console.error("Could not find orphaned auth user for email:", dummyEmail);
            return jsonResponse({ error: "حدث خطأ في البيانات. يرجى التواصل مع الدعم." }, 500);
          }

          userId = orphanedUserId;
          const recoverPassword = `muf_${phone}_${Date.now()}`;
          await supabase.auth.admin.updateUserById(userId, { password: recoverPassword });

          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({ email: dummyEmail, password: recoverPassword });

          if (signInError || !signInData.session) {
            console.error("Recovery sign-in error:", signInError);
            return jsonResponse({ error: "فشل في استعادة الحساب. يرجى المحاولة مرة أخرى." }, 500);
          }

          session = {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
          };

          // Update student record (trigger should have created it)
          await supabase
            .from("students")
            .update({
              phone,
              first_name: first_name.trim(),
              fourth_name: fourth_name.trim(),
              governorate,
              university_id,
              college_id,
              major_id,
              gpa: high_school_gpa ?? null,
            })
            .eq("user_id", userId);

          return jsonResponse({ success: true, session });
        }

        console.error("Create user error:", createError);
        return jsonResponse({ error: "فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى." }, 500);
      }

      userId = newUser.user!.id;

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

      // Update student with ALL registration fields (trigger creates the student row)
      await supabase
        .from("students")
        .update({
          first_name: first_name.trim(),
          fourth_name: fourth_name.trim(),
          phone,
          governorate,
          university_id,
          college_id,
          major_id: major_id || null,
          gpa: high_school_gpa ?? null,
        })
        .eq("user_id", userId);
    }

    return jsonResponse({ success: true, session });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." }, 500);
  }
});
