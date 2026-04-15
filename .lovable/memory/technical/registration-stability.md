---
name: Registration Input Stability
status: RESOLVED ✅
description: Uncontrolled text inputs fix for Android WebView field clearing bug - CONFIRMED WORKING
type: feature
---
## Status: RESOLVED ✅ (2025-04-15)

## Root Cause
Android WebView + `interactive-widget=resizes-content` causes viewport resize on keyboard show/hide.
Combined with React controlled inputs, this triggers re-renders that clear text field values.

## Fix (Uncontrolled Inputs — now in Register.tsx)
Text inputs (firstName, lastName, phone, GPA) use `defaultValue` + `useRef` instead of React `value` state.
The DOM owns these values — immune to React re-render, remount, or WebView events.
Select inputs remain controlled (cascading fetch logic requires reactive state).

## Cleanup Done
- RegisterV2.tsx renamed to Register.tsx (official)
- Old Register.tsx (controlled + draft persistence) deleted
- useRegisterV2Form.ts deleted (unused)
- registrationDraft.ts deleted (draft persistence removed)
- /register-v2 route redirects to /register

## Key Rules
- Do NOT convert text inputs back to controlled (`value={...}`)
- Do NOT add draft persistence (localStorage, Capacitor Preferences)
- Do NOT add form-level state objects for text field values