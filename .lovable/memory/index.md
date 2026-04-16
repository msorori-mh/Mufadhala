# Project Memory

## Core
Project: Mufadhala (مُفَاضَلَة). Primary target: Android APK (`com.mufadhala.app`).
Visuals: Primary #1A237E, Secondary #2E7D32. Cairo font self-hosted.
Architecture: Content mapped by Admission Tracks (Medical, Eng, Admin) -> Subjects -> Lessons.
State: Use React Query polling (30s) for notifications & subs. Avoid real-time channels.
Access: `useStudentAccess` is the single source of truth for permissions.
Security: Exclude admins from student reports. Use Edge Functions for sensitive DB operations.
UX constraint: No referrals or social features. Emphasize individual progress & urgency.
Mobile UI: Use `PageShell` wrapper, `.pb-bottom-nav` padding, and `interactive-widget=resizes-content`.
Auth: Deterministic init required (`isAuthReady`, `isRolesReady`) before routing.
Pricing: MUST use university's pricing_zone, NEVER governorate. Use `getPlanPriceByZone()`.

## Memories
- [Exam Simulator](mem://features/exam-simulator) — True exam mode (50 Qs, 50 mins, no immediate feedback), isolated engine
- [Database Schema](mem://database/schema) — Admission tracks mapping, 9 unique lessons, CHECK constraints
- [Auto Confirm Auth](mem://auth/auto-confirm) — auto_confirm_email enabled for instant access
- [Student Analytics](mem://features/student-analytics) — Performance categorised by correctly answered rate (>=70% strength, <50% weakness)
- [Lesson Reviews](mem://features/lesson-reviews) — Max 1 review per student per lesson, 1-5 stars rating
- [Mobile UX Shell](mem://style/mobile-ux) — `PageShell` layout with dynamic bottom nav padding
- [PDF Export Logic](mem://technical/pdf-export-logic) — Custom HTML print-window for RTL compatibility instead of libraries
- [Data Integrity](mem://security/data-integrity) — Edge functions for sensitive ops, RLS, 1hr signed URLs for presentations
- [Notifications Strategy](mem://features/notifications) — 30s polling via React Query for unread count
- [Project Overview](mem://project/overview) — Mufadhala platform overview and mobile focus
- [Leaderboard Logic](mem://features/leaderboard) — Materialized view `mv_leaderboard` with exam completion triggers
- [Admin UI/UX](mem://features/admin-ui-ux) — Student links hidden from admins, auto-redirect logic
- [Moderator Access Control](mem://features/moderator-access-control) — PermissionGate combining academic scope and functional roles
- [Offline Mode](mem://features/offline-mode) — IndexedDB storage for lessons, requires initial net for App Shell
- [College Guide](mem://features/college-guide) — Visual GPA eligibility indicators for specific colleges
- [Phone Registration UX](mem://auth/phone-registration-ux) — Leave first name empty when registering via phone
- [Native Session Persistence](mem://auth/native-session-persistence) — Capacitor Preferences for access/refresh token storage
- [Yemeni Payment Methods UI](mem://features/yemeni-payment-methods) — Custom boxed cards for accounts, price zones A/B logic
- [Visual Identity](mem://style/visual-identity) — Dark blue #1A237E primary, Green #2E7D32 secondary
- [Lesson Presentations](mem://features/lesson-presentations) — Google Docs Viewer for PPTX files stored in bucket
- [Landing Page Text](mem://features/marketing-landing-page) — Specific hero text and Mufadil AI highlight constraints
- [Android Publishing](mem://technical/android-publishing) — com.mufadhala.app appId, Mufadhala keystore usage
- [Server Caching](mem://technical/server-side-caching) — `app_cache` table with TTL for dashboard/leaderboard
- [Payment Accounts Registry](mem://features/payment-methods-registry) — List of 5 active Yemeni bank/network accounts for manual sub
- [Android Native Behavior](mem://technical/android-native-behavior) — Double-tap back to exit, Android 13+ permissions logic
- [APK Performance Optimization](mem://technical/apk-performance-overhaul) — Eager load core pages, self-host Cairo font, remove framer-motion
- [Profile Phone Verification](mem://features/profile-phone-verification) — Profile phone is read-only, needs OTP flow to change
- [APK Build Workflow](mem://technical/apk-build-workflow-v2) — Local build injects server.url for live preview/deployment
- [University Registry Data](mem://data/university-college-registry) — Registry of 10 supported Yemeni universities and 37 colleges
- [Settings Hub](mem://features/settings-hub) — 'Check for updates' cache wipe feature in native app
- [Staff Data Isolation](mem://security/staff-data-isolation) — Admins/Moderators excluded from student reports and lists
- [Registration Stability Rules](mem://technical/registration-stability) — Field Overwrite Protection v5.0, disables draft restore in Native
- [Metadata Validation](mem://security/metadata-validation) — UUID regex in handle_new_user edge function/trigger
- [Unified Registration Flow](mem://features/unified-registration-ui) — Linear, single-path registration flow with no skip buttons
- [Mobile App Loader](mem://features/mobile-loader) — 8-second timeout loader with Arabic retry button in index.html
- [Student Profile Concept](mem://features/student-profile-v2) — Profile fields exactly mirror registration, single unified path
- [OTP Verification Flow](mem://security/otp-verification) — verify-otp edge function scoped strictly for phone updates
- [Clean Domain Architecture](mem://architecture/clean-domain-layer) — Constants and dynamic pricing in src/domain/
- [Data Load Resilience](mem://technical/data-load-resilience) — Incremental auto-retry on student data fetch to handle DB triggers
- [Student Access Resolver](mem://architecture/student-access-resolver) — `useStudentAccess` hook is the single source of truth for content visibility
- [Admission Tracks Logic](mem://architecture/admission-tracks) — Medical, Engineering, Admin Sciences subject requirements mapping
- [Payment Fraud Detection](mem://features/payment-fraud-detection) — SHA-256 duplicate checking, Gemini OCR, max 3 receipts/day
- [AI Generator UI](mem://features/ai-system) — Mufadil AI generator uses grid-cols-2 layout for questions
- [Password Reset Flow](mem://auth/password-reset-recovery) — Catch `type=recovery` in main.tsx before app init to prevent race conditions
- [Lesson Questions UI](mem://features/lesson-questions-ui) — 'Think first' flow, True/False shown as 2 options
- [Welcome Screen Details](mem://features/activation-welcome-screen) — Post-registration welcome screen redirects to dashboard
- [Free Sub Activation](mem://technical/free-subscription-activation) — `activate-free-plan` edge function uses service_role for security
- [Subscription Sync Polling](mem://features/subscription-status-sync) — 30s React Query polling for subscription status updates
- [Journey Recommendations](mem://features/student-journey-recommendations) — 5 logical states tracking mechanism based on lesson progress
- [Capacitor Prod Config](mem://technical/capacitor-production-config) — Remove 'server' block in capacitor.config.ts for release builds
- [Student Psychology constraints](mem://project/student-psychology) — Avoid referral/social features; rely on individual leaderboard competition
- [Unified Import Engine](mem://technical/unified-import-engine) — Excel import via `lesson_code` primary key matching
- [Monetization Paywall Strategy](mem://monetization/strategy-and-paywall) — Freemium paywall after 2 lessons/3 questions, max 3 per session
- [Routing Auth Guards](mem://architecture/routing-auth-guards) — Global auth guards must not block /admin-login
- [Registration Preferences](mem://auth/registration-ui-preferences) — No placeholder text in name fields during sign up
- [Student Dashboard Layout](mem://features/student-dashboard) — Card order: AI Generator 3rd, Subscription & Activation 4th
- [Auth Initialization](mem://architecture/auth-initialization) — Wait for `isAuthReady` and `isRolesReady` before routing
- [Push Notifications Strategy](mem://features/push-notifications) — FCM strategy with capacitor/push-notifications and edge function
- [Form Hydration Rules](mem://technical/form-hydration-stability) — Use functional setForm updates and TRIM() in DB triggers
- [App Debug Tools](mem://technical/debug-tools) — DebugPanel in settings, webContentsDebuggingEnabled for Chrome inspect
- [Android Versioning](mem://technical/android-versioning) — Semantic + integer versioning in config and VERSIONS.md
- [University-Based Pricing](mem://security/pricing-university-based) — Pricing derived from university.pricing_zone, NOT governorate
- [Past Exam Models](mem://features/past-exam-models) — Practice real past admission exams by university/year, training mode
