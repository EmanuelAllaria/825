import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSupabaseClient } from "../lib/supabase";
import { ROUTES, type RootStackParamList } from "../navigation/routes";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorAuth">;

type Mode = "login" | "register";

function isValidPassword(value: string) {
  return value.length >= 6 && value.length <= 14;
}

export function DoctorAuthScreen({ navigation }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const primaryLabel = useMemo(
    () => (mode === "login" ? "Iniciar sesión" : "Crear cuenta"),
    [mode]
  );

  async function handleSubmit() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setMessage(null);
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail.includes("@")) {
      setMessage("Email inválido.");
      return;
    }

    if (!isValidPassword(password)) {
      setMessage("La contraseña debe tener entre 6 y 14 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "register") {
        const res = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });
        if (res.error) {
          setMessage(res.error.message);
          return;
        }
        setMessage("Cuenta creada. Revisa tu email si se requiere confirmación.");
      } else {
        const res = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (res.error) {
          setMessage(res.error.message);
          return;
        }
        setMessage("Sesión iniciada.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setMessage(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes("@")) {
      setMessage("Escribe tu email para recuperar la contraseña.");
      return;
    }

    setLoading(true);
    try {
      const res = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (res.error) {
        setMessage(res.error.message);
        return;
      }
      setMessage("Email de recuperación enviado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-soft">
      <View className="flex-1 px-6">
        <View className="items-center pt-10">
          <Image
            source={require("../../assets/logos/logo_without_text.png")}
            resizeMode="contain"
            className="h-20 w-52"
          />
        </View>

        <View className="mt-10 overflow-hidden rounded-3xl bg-main p-6">
          <Text className="text-2xl font-semibold text-primary-dark">
            {mode === "login" ? "Bienvenido" : "Crea tu cuenta"}
          </Text>
          <Text className="mt-2 text-base text-primary-dark">
            Accede a tu panel de médicos.
          </Text>

          <View className="mt-6 gap-3">
            <View className="rounded-3xl bg-soft px-4 py-3">
              <Text className="mb-2 text-sm font-semibold text-primary-dark">
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                maxLength={150}
                placeholder="doctor@email.com"
                placeholderTextColor="#03045E"
                className="text-base text-primary-dark"
              />
            </View>

            <View className="rounded-3xl bg-soft px-4 py-3">
              <Text className="mb-2 text-sm font-semibold text-primary-dark">
                Contraseña
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                maxLength={14}
                placeholder="6 a 14 caracteres"
                placeholderTextColor="#03045E"
                className="text-base text-primary-dark"
              />
            </View>

            {message ? (
              <View className="rounded-3xl bg-accent px-4 py-3">
                <Text className="text-sm font-semibold text-primary-dark">
                  {message}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className="rounded-3xl bg-primary px-5 py-4"
            >
              {loading ? (
                <View className="flex-row items-center justify-center gap-3">
                  <ActivityIndicator color="#fff" />
                  <Text className="text-center text-base font-semibold text-white">
                    Procesando…
                  </Text>
                </View>
              ) : (
                <Text className="text-center text-base font-semibold text-white">
                  {primaryLabel}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleResetPassword}
              disabled={loading}
              className="rounded-3xl bg-main px-5 py-4"
            >
              <Text className="text-center text-base font-semibold text-primary-dark">
                Recuperar contraseña
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode((m) => (m === "login" ? "register" : "login"))}
              disabled={loading}
              className="rounded-3xl bg-soft px-5 py-4"
            >
              <Text className="text-center text-base font-semibold text-primary-dark">
                {mode === "login"
                  ? "Crear cuenta"
                  : "Ya tengo cuenta, iniciar sesión"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
