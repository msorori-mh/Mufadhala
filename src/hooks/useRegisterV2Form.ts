import { useCallback, useEffect, useRef, useState } from "react";
import { clearDraft, emptyDraft, loadDraft, saveDraft } from "@/lib/registrationDraft";

export interface RegisterV2FormState {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  governorate: string;
  universityId: string;
  collegeId: string;
  majorId: string;
  highSchoolGpa: string;
}

export const emptyRegisterV2Form: RegisterV2FormState = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  governorate: "",
  universityId: "",
  collegeId: "",
  majorId: "",
  highSchoolGpa: "",
};

let runtimeRegisterV2Form: RegisterV2FormState = emptyRegisterV2Form;

const mapDraftToForm = (draft: typeof emptyDraft): RegisterV2FormState => ({
  firstName: draft.firstName ?? "",
  lastName: draft.fourthName ?? "",
  phoneNumber: draft.phoneNumber ?? "",
  governorate: draft.governorate ?? "",
  universityId: draft.universityId ?? "",
  collegeId: draft.collegeId ?? "",
  majorId: draft.majorId ?? "",
  highSchoolGpa: draft.highSchoolGpa ?? "",
});

const mapFormToDraft = (form: RegisterV2FormState) => ({
  ...emptyDraft,
  firstName: form.firstName,
  fourthName: form.lastName,
  phoneNumber: form.phoneNumber,
  governorate: form.governorate,
  universityId: form.universityId,
  collegeId: form.collegeId,
  majorId: form.majorId,
  highSchoolGpa: form.highSchoolGpa,
});

export const useRegisterV2Form = () => {
  const [form, setForm] = useState<RegisterV2FormState>(() => runtimeRegisterV2Form);
  const draftHydrated = useRef(false);
  const hasUserInteracted = useRef(false);

  useEffect(() => {
    runtimeRegisterV2Form = form;
  }, [form]);

  useEffect(() => {
    let cancelled = false;

    loadDraft().then((draft) => {
      if (cancelled) return;

      if (draft) {
        const draftForm = mapDraftToForm(draft);

        setForm((prev) => {
          const merged = { ...prev };

          (Object.keys(draftForm) as (keyof RegisterV2FormState)[]).forEach((key) => {
            if (!merged[key] && draftForm[key]) {
              merged[key] = draftForm[key];
            }
          });

          runtimeRegisterV2Form = merged;
          return merged;
        });
      }

      draftHydrated.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated.current && !hasUserInteracted.current) return;
    void saveDraft(mapFormToDraft(form));
  }, [form]);

  const patchForm = useCallback((updates: Partial<RegisterV2FormState>) => {
    hasUserInteracted.current = true;
    setForm((prev) => {
      const next = { ...prev, ...updates };
      runtimeRegisterV2Form = next;
      return next;
    });
  }, []);

  const updateField = useCallback(
    <K extends keyof RegisterV2FormState>(key: K, value: RegisterV2FormState[K]) => {
      patchForm({ [key]: value } as Partial<RegisterV2FormState>);
    },
    [patchForm],
  );

  const clearStoredForm = useCallback(async () => {
    runtimeRegisterV2Form = emptyRegisterV2Form;
    setForm(emptyRegisterV2Form);
    await clearDraft();
  }, []);

  return {
    form,
    updateField,
    patchForm,
    clearStoredForm,
  };
};
