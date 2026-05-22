import {
  CommonActions,
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, DeviceEventEmitter, Image, Text, View } from "react-native";

import { getSupabaseClient, getSupabaseConfigStatus } from "../lib/supabase";
import { DoctorAuthScreen } from "../screens/DoctorAuthScreen";
import { DoctorServicesScreen } from "../screens/DoctorServicesScreen";
import { DoctorAccountScreen } from "../screens/DoctorAccountScreen";
import { PatientSearchScreen } from "../screens/PatientSearchScreen";
import { ChangePasswordScreen } from "../screens/ChangePasswordScreen";
import { ROUTES, type RootStackParamList } from "./routes";

const Stack = createNativeStackNavigator<RootStackParamList>();

type GateState =
  | { status: "loading" }
  | { status: "needs_config" }
  | { status: "unauth" }
  | { status: "needs_profile" }
  | { status: "ready" };

export function AppNavigator() {
  const [gate, setGate] = useState<GateState>({ status: "loading" });
  const navigationRef = useMemo(
    () => createNavigationContainerRef<RootStackParamList>(),
    []
  );

  const initialRouteName = useMemo(() => {
    if (gate.status === "unauth") return ROUTES.DoctorAuth;
    if (gate.status === "needs_profile") return ROUTES.DoctorServices;
    if (gate.status === "ready") return ROUTES.DoctorAccount;
    return ROUTES.DoctorAuth;
  }, [gate.status]);

  useEffect(() => {
    if (!navigationRef.isReady()) return;

    if (gate.status === "unauth") {
      navigationRef.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: ROUTES.DoctorAuth }] })
      );
      return;
    }

    if (gate.status === "needs_profile") {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: ROUTES.DoctorServices, params: { initialTab: "perfil" } }],
        })
      );
      return;
    }

    if (gate.status === "ready") {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: ROUTES.DoctorAccount }],
        })
      );
    }
  }, [gate.status, navigationRef]);

  useEffect(() => {
    let cancelled = false;
    const supabaseClient = getSupabaseClient();
    const config = getSupabaseConfigStatus();

    if (!supabaseClient) {
      setGate({ status: config.configured ? "loading" : "needs_config" });
      return;
    }
    const supabase = supabaseClient;

    async function refresh() {
      const sessionRes = await supabase.auth.getSession();
      if (cancelled) return;

      const session = sessionRes.data.session;
      if (!session?.user) {
        setGate({ status: "unauth" });
        return;
      }

      const profileRes = await supabase
        .from("perfiles_medicos")
        .select("id,nombre,cedula,estado_provincia,fotos")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileRes.error || !profileRes.data) {
        setGate({ status: "needs_profile" });
        return;
      }

      const profile = profileRes.data as {
        nombre?: string | null;
        cedula?: string | null;
        estado_provincia?: string | null;
        fotos?: unknown;
      };

      const hasProfile =
        Boolean(profile?.nombre?.trim()) &&
        Boolean(profile?.cedula?.trim()) &&
        Boolean(profile?.estado_provincia?.trim());

      setGate({ status: hasProfile ? "ready" : "needs_profile" });
    }

    refresh();
    const profileSub = DeviceEventEmitter.addListener("profile_updated", () => {
      refresh();
    });
    const sub = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      cancelled = true;
      profileSub.remove();
      sub.data.subscription.unsubscribe();
    };
  }, []);

  if (gate.status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-main px-6">
        <View className="w-full max-w-md rounded-3xl bg-soft p-6 items-center">
          <Image
            source={require("../../assets/logos/logo_without_text.png")}
            resizeMode="contain"
            className="h-20 w-52"
          />
          <View className="mt-5 items-center">
            <ActivityIndicator />
            <Text className="mt-3 font-semibold text-primary-dark">
              Cargando…
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (gate.status === "needs_config") {
    return (
      <View className="flex-1 items-center justify-center bg-main px-6">
        <View className="w-full max-w-md rounded-3xl bg-soft p-6">
          <Text className="text-lg font-semibold text-primary-dark">
            Falta configurar Supabase
          </Text>
          <Text className="mt-2 text-base text-primary-dark">
            Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        key={gate.status}
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        <Stack.Screen name={ROUTES.DoctorAuth} component={DoctorAuthScreen} />

        {gate.status !== "unauth" ? (
          <>
            <Stack.Screen
              name={ROUTES.DoctorAccount}
              component={DoctorAccountScreen}
            />
            <Stack.Screen
              name={ROUTES.DoctorServices}
              component={DoctorServicesScreen}
            />
            <Stack.Screen
              name={ROUTES.PatientSearch}
              component={PatientSearchScreen}
            />
            <Stack.Screen
              name={ROUTES.ChangePassword}
              component={ChangePasswordScreen}
            />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
