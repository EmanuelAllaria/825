import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSupabaseClient } from "../lib/supabase";
import { ROUTES, type RootStackParamList } from "../navigation/routes";

type Props = NativeStackScreenProps<RootStackParamList, "PatientSearch">;

type Patient = {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  edad?: number | null;
  sexo?: string | null;
  descripcion?: string | null;
};

export function PatientSearchScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  const fetchPatients = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);
    setMessage(null);

    try {
      const searchTerm = query.trim();
      let queryBuilder = supabase.from("pacientes_global").select("*");

      // Si hay término de búsqueda, filtramos de forma segura usando texto plano
      if (searchTerm !== "") {
        queryBuilder = queryBuilder.or(
          `nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%`,
        );
      }

      // Ordenamos los resultados
      queryBuilder = queryBuilder.order("nombre", { ascending: true });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error("Error devuelto por Supabase:", error.message);
        setMessage(error.message);
        setPatients([]);
      } else {
        console.log("¡Pacientes traídos con éxito! Cantidad:", data?.length);
        setPatients(data || []);
      }
    } catch (err: any) {
      console.error("❌ CRASH EN FETCH_PATIENTS:", err);
      setMessage("Error de conexión o formato de búsqueda.");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPatients();
  }, [query]);

  async function handleAdd(patient: Patient) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setMessage(null);
    setAddingId(patient.id);
    try {
      const sessionRes = await supabase.auth.getSession();
      const user = sessionRes.data.session?.user;
      if (!user) {
        navigation.replace(ROUTES.DoctorAuth);
        return;
      }

      const res = await supabase.from("medico_pacientes").insert({
        medico_id: user.id,
        paciente_id: patient.id,
      });

      if (res.error) {
        setMessage(res.error.message);
        return;
      }

      navigation.goBack();
    } finally {
      setAddingId(null);
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
            Buscador global
          </Text>
          <View style={{ width: 72 }} />
        </View>

        <View className="mt-4 rounded-3xl bg-soft px-4 py-3">
          <Text className="mb-2 text-sm font-semibold text-primary-dark">
            Buscar por nombre
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            maxLength={30}
            placeholder="Escribe un nombre…"
            placeholderTextColor="#03045E"
            className="text-base text-primary-dark"
          />
        </View>

        {message ? (
          <View className="mt-3 rounded-3xl bg-accent px-4 py-3">
            <Text className="text-sm font-semibold text-primary-dark">
              {message}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-1 px-6 pb-6">
        <View className="flex-1 overflow-hidden rounded-3xl bg-soft">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator />
              <Text className="mt-3 text-primary-dark">Cargando…</Text>
            </View>
          ) : (
            <FlatList
              data={patients}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 22 }}
              renderItem={({ item }) => (
                <View className="mb-3 rounded-3xl bg-main p-4">
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-primary-dark">
                        {`${(item.nombre ?? "Paciente").toString()} ${(item.apellido ?? "").toString()}`.trim()}
                      </Text>
                      <Text className="mt-1 text-sm text-primary-dark">
                        {typeof item.edad === "number" ? `${item.edad} años` : "Edad no disponible"}
                        {item.sexo ? ` · ${item.sexo}` : ""}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleAdd(item)}
                      disabled={addingId === item.id}
                      className="rounded-3xl bg-primary px-4 py-3"
                    >
                      {addingId === item.id ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="font-semibold text-white">Agregar</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
