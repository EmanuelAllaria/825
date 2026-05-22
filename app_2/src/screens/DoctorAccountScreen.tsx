import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSupabaseClient } from "../lib/supabase";
import { ROUTES, type RootStackParamList } from "../navigation/routes";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorAccount">;

type Patient = {
  id: string | number;
  nombre?: string | null;
  apellido?: string | null;
  edad?: number | null;
  sexo?: string | null;
  descripcion?: string | null;
};

type MedicoPacienteRow = {
  id: string | number;
  paciente_id: string | number;
  paciente: Patient | Patient[] | null;
};

export function DoctorAccountScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  const load = useCallback(() => {
    let cancelled = false;
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    (async () => {
      setLoading(true);
      setMessage(null);

      const sessionRes = await supabase.auth.getSession();
      const user = sessionRes.data.session?.user;
      if (!user) {
        navigation.replace(ROUTES.DoctorAuth);
        return;
      }

      const res = await supabase
        .from("medico_pacientes")
        .select("id,paciente_id,paciente:pacientes_global(id,nombre,apellido,edad,sexo,descripcion)")
        .eq("medico_id", user.id);

      if (cancelled) return;

      if (res.error) {
        setMessage(res.error.message);
        setLoading(false);
        return;
      }

      const rows = (res.data ?? []) as unknown as MedicoPacienteRow[];
      const list: Patient[] = rows
        .map((row) => {
          const p = Array.isArray(row.paciente) ? row.paciente[0] : row.paciente;
          if (!p?.id) return null;
          return {
            id: p.id,
            nombre: p.nombre ?? "Paciente",
            apellido: (p as any).apellido ?? null,
            edad: (p as any).edad ?? null,
            sexo: (p as any).sexo ?? null,
            descripcion: (p as any).descripcion ?? null,
          };
        })
        .filter(Boolean) as Patient[];

      setPatients(list);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigation]);

  useFocusEffect(load);

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    navigation.replace(ROUTES.DoctorAuth);
  }

  return (
    <SafeAreaView className="flex-1 bg-main">
      <View className="px-6 pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-semibold text-primary-dark">
            Mi cuenta
          </Text>
          <Pressable
            onPress={handleSignOut}
            className="rounded-3xl bg-soft px-4 py-3"
          >
            <Text className="font-semibold text-primary-dark">Salir</Text>
          </Pressable>
        </View>

        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={() => navigation.navigate(ROUTES.PatientSearch)}
            className="flex-1 rounded-3xl bg-primary px-5 py-4"
          >
            <Text className="text-center font-semibold text-white">
              Buscar paciente
            </Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate(ROUTES.DoctorServices)}
            className="flex-1 rounded-3xl bg-soft px-5 py-4"
          >
            <Text className="text-center font-semibold text-primary-dark">
              Servicios
            </Text>
          </Pressable>
        </View>

        <View className="mt-3">
          <Pressable
            onPress={() => navigation.navigate(ROUTES.ChangePassword)}
            className="rounded-3xl bg-soft px-5 py-4"
          >
            <Text className="text-center font-semibold text-primary-dark">
              Cambiar contraseña
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-1 px-6 pb-6">
        <View className="flex-1 overflow-hidden rounded-3xl bg-soft">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator />
              <Text className="mt-3 text-primary-dark">Cargando…</Text>
            </View>
          ) : message ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-center text-base font-semibold text-primary-dark">
                No se pudo cargar tu lista
              </Text>
              <Text className="mt-2 text-center text-sm text-primary-dark">
                {message}
              </Text>
            </View>
          ) : patients.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-center text-base font-semibold text-primary-dark">
                Sin pacientes
              </Text>
              <Text className="mt-2 text-center text-sm text-primary-dark">
                Agrega pacientes desde el buscador.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 22 }}>
              <View className="gap-3">
                {patients.map((p) => (
                  <View key={String(p.id)} className="rounded-3xl bg-main p-4">
                    <Text className="text-base font-semibold text-primary-dark">
                      {`${(p.nombre ?? "Paciente").toString()} ${(p.apellido ?? "").toString()}`.trim()}
                    </Text>
                    <Text className="mt-1 text-sm text-primary-dark">
                      {typeof p.edad === "number" ? `${p.edad} años` : "Edad no disponible"}
                      {p.sexo ? ` · ${p.sexo}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
