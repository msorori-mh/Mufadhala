---
name: Registration Input Stability
description: Uncontrolled text inputs fix for Android WebView field clearing bug
type: feature
---
## Root Cause
Android WebView + `interactive-widget=resizes-content` causes viewport resize on keyboard show/hide.
Combined with React controlled inputs, this triggers spurious change events or re-renders that clear text field values.

## Fix (v6.0 — Uncontrolled Inputs)
Text inputs (firstName, lastName, phone, GPA) use `defaultValue` + `useRef` instead of React `value` state.
The DOM owns these values — immune to React re-render, remount, or WebView events.

Select inputs remain controlled (cascading fetch logic requires reactive state).

## Key Rules
- Do NOT convert text inputs back to controlled (`value={...}`)
- Do NOT add draft persistence (localStorage, Capacitor Preferences)
- Do NOT add form-level state objects for text field values