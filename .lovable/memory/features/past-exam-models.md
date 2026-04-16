---
name: Past Exam Models
description: ميزة نماذج الأعوام السابقة - تدريب على اختبارات قبول حقيقية حسب الجامعة والسنة
type: feature
---
- Tables: `past_exam_models` (title, university_id, year, track, is_paid, is_published, duration_minutes) + `past_exam_model_questions` (model_id, question_id, order_index)
- Student page: `/past-exams` — select university → year/model → solve questions one by one with instant feedback
- Admin page: `/admin/past-exams` — CRUD models, assign questions from question bank
- Access: is_paid models require active subscription via `useSubscription`
- Training mode only (no timed exam, no attempt recording)
- Dashboard nav card added with FileText icon
- Admin sidebar link under "content" permission
