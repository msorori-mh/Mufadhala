---
name: Past Exam Models
description: نماذج الأعوام السابقة - وضعان للتدريب والامتحان الصارم مع حفظ النتائج وعرضها في أداء الطالب
type: feature
---
- Completely isolated from lessons/lesson-questions system
- Uses `past_exam_models` table + `past_exam_model_questions` with direct q_* columns
- **`past_exam_attempts` table** stores all student attempts (mode, score, total, blank_count, elapsed_seconds, answers, completed_at) with RLS: students view/insert own, staff view all, admin delete
- Direct question storage: q_text, q_option_a-d, q_correct, q_explanation
- Student flow: /past-exams → /past-exams/:modelId (mode selector → training OR strict)
- **Two modes** (selected by student before starting):
  1. **Training mode**: one question at a time, instant reveal + explanation, no timer — saved as `mode='training'`
  2. **Strict exam mode**: countdown timer, no reveals, full review at end — saved as `mode='strict'` with full answers JSON
- **Duration logic (v2)**: Strict mode NEVER blocks the student. Resolution priority:
  1. Student override (via timer-edit button) — always wins
  2. Admin's `duration_minutes` (if set, becomes default but is ALWAYS editable via timer-icon button next to start)
  3. Smart fallback: `totalQuestions × 1 minute` (1 min per question, min 5 min)
  - `MIN_DURATION = 5` minutes (was 30). `QUICK_DURATIONS = [10, 15, 30, 45, 60, 90]`.
  - `StrictMode.tsx` guards against zero duration with `Math.max(1, ...)` as final safety net.
  - Last-used duration saved per-model in `localStorage` and shown as "آخر مدة استخدمتها".
- Strict mode features: question grid navigation, prev/next buttons, beforeunload guard, auto-submit at 0, toast warnings at 5 min and 1 min remaining, MM:SS timer pulses red in last 2 min
- Strict mode result screen: score %, correct/wrong/blank counts, elapsed time, full per-question review
- **Performance integration**: `PastExamStatsCard` component on `/student-performance` shows avg %, best %, mode breakdown, and last 5 attempts
- Payment: `is_paid` column on `past_exam_models` is the SOLE source of truth for locking. `is_paid=true` → locked for non-subscribers (redirects to /subscription). `is_paid=false` → free for everyone. NO implicit "first model is free" rule. Admin toggles per model via Switch in `/admin/past-exams`.
- Subscription unlock latency: `useSubscription` polls every 30s (was 5min) so paid access reflects within 30s of admin approval.
- Admin: /admin/past-exams - CRUD models + inline question editor
- Admin permission: dedicated `past_exams` (separate from `content`)
- File structure: `src/pages/PastExamPractice.tsx` orchestrator + `src/pages/past-exam/{ModeSelector,TrainingMode,StrictMode,types}.tsx` + `src/lib/pastExamAttempts.ts` (save helper) + `src/components/PastExamStatsCard.tsx`
- Note: types use `(supabase as any)` cast until generated types refresh after migration
