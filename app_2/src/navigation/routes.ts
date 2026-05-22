export type RootStackParamList = {
  DoctorAuth: undefined;
  DoctorServices: { initialTab?: "perfil" | "servicios" } | undefined;
  DoctorAccount: undefined;
  PatientSearch: undefined;
  ChangePassword: undefined;
};

export const ROUTES = {
  DoctorAuth: "DoctorAuth",
  DoctorServices: "DoctorServices",
  DoctorAccount: "DoctorAccount",
  PatientSearch: "PatientSearch",
  ChangePassword: "ChangePassword",
} as const;
