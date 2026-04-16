---
name: Past Exam Models
description: نماذج الأعوام السابقة - وضعان للتدريب والامتحان الصارم لمحاكاة ظروف الاختبار الحقيقي
type: feature
---
- Completely isolated from lessons/lesson-questions system
- Uses `past_exam_models` table + `past_exam_model_questions` with direct q_* columns
- Direct question storage: q_text, q_option_a-d, q_correct, q_explanation
- Student flow: /past-exams (select university → year → model) → /past-exams/:modelId (mode selector)
- **Two modes** (selected by student before starting):
  1. **Training mode**: one question at a time, instant reveal + explanation, no timer
  2. **Strict exam mode**: countdown timer (uses `duration_minutes`), no reveals, full review at end
- Strict mode requires `duration_minutes > 0` (otherwise option is disabled with admin notice)
- Strict mode features: question grid navigation, prev/next buttons, beforeunload guard, auto-submit at 0, toast warnings at 5 min and 1 min remaining, MM:SS timer pulses red in last 2 min
- Strict mode result screen: score %, correct/wrong/blank counts, elapsed time, full per-question review with user answer + correct answer + explanation
- Payment: is_paid models locked for non-subscribers, redirects to /subscription
- Admin: /admin/past-exams - CRUD models + inline question editor
- Admin permission: dedicated `past_exams` (separate from `content`)
- File structure: `src/pages/PastExamPractice.tsx` orchestrator + `src/pages/past-exam/{ModeSelector,TrainingMode,StrictMode,types}.tsx`
- Results NOT yet persisted to DB (planned: `past_exam_attempts` table)
