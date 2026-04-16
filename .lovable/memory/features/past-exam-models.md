---
name: Past Exam Models
description: نماذج الأعوام السابقة - isolated training mode for real past university admission exams
type: feature
---
- Completely isolated from lessons/lesson-questions system
- Uses `past_exam_models` table (existing) + `past_exam_model_questions` with direct q_* columns
- Direct question storage: q_text, q_option_a-d, q_correct, q_explanation (no FK to questions table)
- Student flow: /past-exams (select university → year → model) → /past-exams/:modelId (training mode)
- Training mode: one question at a time, check answer, see explanation, no timer
- Payment: is_paid models locked for non-subscribers, redirects to /subscription
- Admin: /admin/past-exams - CRUD models + inline question editor
- Admin permission: "content" moderator permission
