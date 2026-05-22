export type RootStackParamList = {
  Onboarding: undefined;
  Treatments: undefined;
  Doctors: { treatment: string };
  DoctorProfile: { doctorId: string | number };
};

export const ROUTES = {
  Onboarding: "Onboarding",
  Treatments: "Treatments",
  Doctors: "Doctors",
  DoctorProfile: "DoctorProfile",
} as const;
