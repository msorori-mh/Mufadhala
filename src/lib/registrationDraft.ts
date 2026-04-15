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

export async function saveDraft(draft: RegistrationDraft) {
  const json = JSON.stringify(draft);
  if (isNativePlatform()) {
    await Preferences.set({ key: DRAFT_KEY, value: json });
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
  } catch {}
  return null;
}

export async function clearDraft() {
  if (isNativePlatform()) {
    await Preferences.remove({ key: DRAFT_KEY });
  } else {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }
}
