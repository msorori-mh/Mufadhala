import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    // 1. Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // 2. Parse & validate body
    const body = await req.json();
    const { answers } = body;

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ error: "answers must be a non-null object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Service-role client for trusted operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 4. Get student record
    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .select("id, major_id")
      .eq("user_id", userId)
      .single();

    if (studentErr || !student || !student.major_id) {
      return new Response(
        JSON.stringify({ error: "Student or major not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4b. Skip free-limit check for staff (admin/moderator)
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isStaff = (roles || []).some((r: any) => r.role === "admin" || r.role === "moderator");

    // 4c. Enforce free attempt limit for non-paid users (trial counts as non-paid)
    if (!isStaff) {
      const nowIso = new Date().toISOString();
      const { data: paidSubs } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .limit(1);

      const isPaid = (paidSubs || []).length > 0;

      if (!isPaid) {
        const { count } = await supabaseAdmin
          .from("exam_attempts")
          .select("id", { count: "exact", head: true })
          .eq("student_id", student.id)
          .not("completed_at", "is", null);

        if ((count ?? 0) >= 1) {
          return new Response(
            JSON.stringify({
              error: "free_limit_reached",
              message: "وصلت للحد المجاني للمحاكي. اشترك للمتابعة.",
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 5. Get the question IDs from answers
    const questionIds = Object.keys(answers);
    if (questionIds.length === 0 || questionIds.length > 45) {
      return new Response(
        JSON.stringify({ error: "Invalid number of answers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Validate answers are single characters a-d
    const validOptions = ["a", "b", "c", "d"];
    for (const [qId, ans] of Object.entries(answers)) {
      if (typeof ans !== "string" || !validOptions.includes(ans)) {
        return new Response(
          JSON.stringify({ error: `Invalid answer for question ${qId}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 7. Fetch correct answers from DB (only questions belonging to student's major)
    const { data: questions, error: qErr } = await supabaseAdmin
      .from("questions")
      .select("id, correct_option, lesson_id")
      .in("id", questionIds);

    if (qErr || !questions) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch questions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify all questions belong to lessons in the student's major
    const lessonIds = [...new Set(questions.map((q) => q.lesson_id))];
    const { data: lessons } = await supabaseAdmin
      .from("lessons")
      .select("id")
      .in("id", lessonIds)
      .eq("major_id", student.major_id);

    const validLessonIds = new Set((lessons || []).map((l) => l.id));
    const validQuestions = questions.filter((q) => validLessonIds.has(q.lesson_id));

    if (validQuestions.length !== questionIds.length) {
      return new Response(
        JSON.stringify({ error: "Some questions do not belong to your major" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Calculate score server-side
    let score = 0;
    for (const q of validQuestions) {
      if (answers[q.id] === q.correct_option) {
        score++;
      }
    }

    // 9. Insert attempt using service role (bypasses RLS)
    const { data: attempt, error: insertErr } = await supabaseAdmin
      .from("exam_attempts")
      .insert({
        student_id: student.id,
        major_id: student.major_id,
        score,
        total: validQuestions.length,
        answers,
        completed_at: new Date().toISOString(),
      })
      .select("id, score, total, completed_at")
      .single();

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: "Failed to save exam attempt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, score, total: validQuestions.length, attempt_id: attempt.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
