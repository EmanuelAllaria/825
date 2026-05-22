import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSupabaseClient } from "../lib/supabase";
import { ROUTES, type RootStackParamList } from "../navigation/routes";

type Props = NativeStackScreenProps<RootStackParamList, "ChangePassword">;

function isValidPassword(value: string) {
  return value.length >= 6 && value.length <= 14;
}

export function ChangePasswordScreen({ navigation }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!currentPassword || !newPassword || !confirmPassword) return false;
    if (newPassword !== confirmPassword) return false;
    if (!isValidPassword(newPassword)) return false;
    return true;
  }, [confirmPassword, currentPassword, newPassword]);

  async function handleSubmit() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setMessage(null);
    if (!isValidPassword(newPassword)) {
      setMessage("La contraseña nueva debe tener entre 6 y 14 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("La confirmación no coincide.");
      return;
    }

    setLoading(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const user = sessionRes.data.session?.user;
      const email = user?.email ?? null;
      if (!user || !email) {
        setMessage("Debes iniciar sesión para cambiar la contraseña.");
        navigation.replace(ROUTES.DoctorAuth);
        return;
      }

      const reauthRes = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (reauthRes.error) {
        setMessage("Contraseña actual incorrecta.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Contraseña actualizada.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-main">
      <View className="px-6 pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => navigation.goBack()}
            className="rounded-3xl bg-soft px-4 py-3"
          >
            <Text className="font-semibold text-primary-dark">Volver</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-primary-dark">
            Cambiar contraseña
          </Text>
          <View style={{ width: 72 }} />
        </View>
      </View>

      <View className="flex-1 px-6 pb-6">
        <View className="overflow-hidden rounded-3xl bg-soft p-5 gap-4">
          <View className="rounded-3xl bg-main px-4 py-3">
            <Text className="mb-2 text-sm font-semibold text-primary-dark">
              Contraseña actual
            </Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              maxLength={14}
              placeholder="Tu contraseña actual"
              placeholderTextColor="#03045E"
              className="text-base text-primary-dark"
            />
          </View>

          <View className="rounded-3xl bg-main px-4 py-3">
            <Text className="mb-2 text-sm font-semibold text-primary-dark">
              Nueva contraseña
            </Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              maxLength={14}
              placeholder="6 a 14 caracteres"
              placeholderTextColor="#03045E"
              className="text-base text-primary-dark"
            />
          </View>

          <View className="rounded-3xl bg-main px-4 py-3">
            <Text className="mb-2 text-sm font-semibold text-primary-dark">
              Confirmación
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              maxLength={14}
              placeholder="Repite la nueva contraseña"
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
            disabled={loading || !canSubmit}
            className={`rounded-3xl px-5 py-4 ${
              loading || !canSubmit ? "bg-accent" : "bg-primary"
            }`}
          >
            {loading ? (
              <View className="flex-row items-center justify-center gap-3">
                <ActivityIndicator color="#fff" />
                <Text className="text-center text-base font-semibold text-white">
                  Actualizando…
                </Text>
              </View>
            ) : (
              <Text className="text-center text-base font-semibold text-white">
                Actualizar contraseña
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
