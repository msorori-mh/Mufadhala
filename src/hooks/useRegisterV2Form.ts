import { useCallback, useEffect, useState } from "react";

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

/**
 * Module-level runtime snapshot — survives component remounts
 * but NOT page reloads. No async, no localStorage, no side effects.
 */
let runtimeRegisterV2Form: RegisterV2FormState = emptyRegisterV2Form;

export const useRegisterV2Form = () => {
  const [form, setForm] = useState<RegisterV2FormState>(() => runtimeRegisterV2Form);

  // Keep module-level snapshot in sync
  useEffect(() => {
    runtimeRegisterV2Form = form;
  }, [form]);

  const patchForm = useCallback((updates: Partial<RegisterV2FormState>) => {
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

  const clearStoredForm = useCallback(() => {
    runtimeRegisterV2Form = emptyRegisterV2Form;
    setForm(emptyRegisterV2Form);
  }, []);

  return {
    form,
    updateField,
    patchForm,
    clearStoredForm,
  };
};
