import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from './capacitor';

const DRAFT_KEY = 'registration_draft';

export interface RegistrationDraft {
  firstName: string;
  fourthName: string;
  phoneNumber: string;
  governorate: string;
  universityId: string;
  collegeId: string;
  majorId: string;
  highSchoolGpa: string;
}

export const emptyDraft: RegistrationDraft = {
  firstName: '',
  fourthName: '',
  phoneNumber: '',
  governorate: '',
  universityId: '',
  collegeId: '',
  majorId: '',
  highSchoolGpa: '',
};

// Debounced save — prevent native IPC storm on every keystroke
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function saveDraft(draft: RegistrationDraft) {
  // Cancel any pending save
  if (saveTimer) clearTimeout(saveTimer);

  const json = JSON.stringify(draft);

  if (isNativePlatform()) {
    // Debounce native writes (Capacitor Preferences IPC is expensive)
    return new Promise<void>((resolve) => {
      saveTimer = setTimeout(async () => {
        try {
          await Preferences.set({ key: DRAFT_KEY, value: json });
        } catch (e) {
          console.warn('[DRAFT:save] native write failed:', e);
        }
        resolve();
      }, 500);
    });
  } else {
    try { localStorage.setItem(DRAFT_KEY, json); } catch {}
  }
}

export async function loadDraft(): Promise<RegistrationDraft | null> {
  try {
    let json: string | null = null;
    if (isNativePlatform()) {
      const { value } = await Preferences.get({ key: DRAFT_KEY });
      json = value;
    } else {
      json = localStorage.getItem(DRAFT_KEY);
    }
    if (json) {
      const parsed = JSON.parse(json);
      return { ...emptyDraft, ...parsed };
    }
  } catch (e) {
    console.warn('[DRAFT:load] failed:', e);
  }
  return null;
}

export async function clearDraft() {
  // Cancel any pending save first
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (isNativePlatform()) {
    try {
      await Preferences.remove({ key: DRAFT_KEY });
    } catch (e) {
      console.warn('[DRAFT:clear] native remove failed:', e);
    }
  } else {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }
}
