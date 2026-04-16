---
name: Freemium Access Strategy
description: Clear free limits - all lessons free, first past exam model per university free, one simulator attempt free
type: feature
---
## Freemium Model (Implemented)

### 1. Lessons & Questions → ALL FREE
- No restrictions on lessons or lesson questions

### 2. Past Exam Models
- First model per university (earliest year) → FREE
- All other models → LOCKED, redirect to /subscription
- Determined by sorting published models by year ASC, first one is free
- Logic in PastExams.tsx (listing) and PastExamPractice.tsx (practice page)

### 3. Simulator (Exam Engine)
- First completed attempt → FREE
- After 1+ completed attempts (non-subscriber) → blocked with FreeLimitMessage
- `freeAttemptUsed` flag in useTrueExamEngine checks completed_at on pastAttempts
- Never interrupts during exam, only blocks on intro phase

### 4. Upgrade Prompt
- FreeLimitMessage component shows: "وصلت للحد المجاني / لو تريد ترفع مستواك أكثر — اشترك الآن"
- Clean centered layout, no aggressive popups
- Button navigates to /subscription

### 5. Old paywall system (usePaywallTrigger, PaywallSheet, EngagementModal) still exists but superseded by this strategy
