import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/routes";
import { ROUTES } from "../navigation/routes";
import { getSupabaseClient, getSupabaseConfigStatus } from "../lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "Doctors">;

type Doctor = {
  id: string | number;
  nombre?: string | null;
  cedula?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  estado_provincia?: string | null;
  fotos?: unknown;
};

type TreatmentPriceRow = {
  id: string;
  tipo_tratamiento: string | null;
  precio: number | null;
  perfiles_medicos: Doctor | Doctor[] | null;
};

type DoctorItem = {
  doctorId: string | number;
  nombre: string;
  estado: string;
  precio: number;
  cedula?: string | null;
};

type Section = { title: string; data: DoctorItem[] };

function formatCurrencyMXN(value: number) {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString("es-MX")}`;
  }
}

export function DoctorsScreen({ navigation, route }: Props) {
  const { treatment: tratamientoSeleccionado } = route.params;
  const [ascending, setAscending] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const sortLabel = useMemo(
    () => (ascending ? "Menor a Mayor" : "Mayor a Menor"),
    [ascending]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErrorText(null);
      setSections([]);

      const supabase = getSupabaseClient();
      const status = getSupabaseConfigStatus();
      if (!supabase) {
        if (!cancelled) {
          setErrorText(
            `Falta configurar Supabase (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY). URL actual: ${status.url || "(vacía)"}`
          );
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("tratamientos_precios")
        .select(`
          id,
          tipo_tratamiento,
          precio,
          perfiles_medicos (
            id,
            nombre,
            cedula,
            whatsapp,
            telefono,
            estado_provincia,
            fotos
          )
        `)
        .eq("tipo_tratamiento", tratamientoSeleccionado)
        .order("precio", { ascending });

      if (cancelled) return;

      if (error) {
        setErrorText(error.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as TreatmentPriceRow[];
      const items: DoctorItem[] = rows
        .map((row) => {
          const doctor = Array.isArray(row.perfiles_medicos)
            ? row.perfiles_medicos[0]
            : row.perfiles_medicos;
          const precio = row.precio ?? 0;
          if (!doctor?.id) return null;
          return {
            doctorId: doctor.id,
            nombre: (doctor.nombre ?? "Médico").toString(),
            estado: (doctor.estado_provincia ?? "Sin estado").toString(),
            precio,
            cedula: doctor.cedula ?? null,
          };
        })
        .filter(Boolean) as DoctorItem[];

      const grouped = new Map<string, DoctorItem[]>();
      for (const item of items) {
        const key = item.estado.trim() || "Sin estado";
        const existing = grouped.get(key);
        if (existing) existing.push(item);
        else grouped.set(key, [item]);
      }

      const sortedStates = Array.from(grouped.keys()).sort((a, b) =>
        a.localeCompare(b, "es-MX", { sensitivity: "base" })
      );

      setSections(
        sortedStates.map((state) => ({
          title: state,
          data: grouped
            .get(state)!
            .slice()
            .sort((a, b) => {
              const delta = ascending ? a.precio - b.precio : b.precio - a.precio;
              if (delta !== 0) return delta;
              return a.nombre.localeCompare(b.nombre, "es-MX");
            }),
        }))
      );
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [ascending, tratamientoSeleccionado]);

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

          <Pressable
            onPress={() => setAscending((v) => !v)}
            className="rounded-3xl bg-primary px-4 py-3"
          >
            <Text className="font-semibold text-white">{sortLabel}</Text>
          </Pressable>
        </View>

        <Text className="mt-5 text-2xl font-semibold text-primary-dark">
          {tratamientoSeleccionado}
        </Text>
        <Text className="mt-2 text-base text-primary-dark">
          Médicos disponibles por estado.
        </Text>
      </View>

      <View className="flex-1 px-6 pb-6">
        <View className="flex-1 overflow-hidden rounded-3xl bg-soft">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator />
              <Text className="mt-3 text-primary-dark">Cargando…</Text>
            </View>
          ) : errorText ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-center text-base font-semibold text-primary-dark">
                No se pudo cargar la lista
              </Text>
              <Text className="mt-2 text-center text-sm text-primary-dark">
                {errorText}
              </Text>
            </View>
          ) : sections.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-center text-base font-semibold text-primary-dark">
                Sin resultados
              </Text>
              <Text className="mt-2 text-center text-sm text-primary-dark">
                No hay médicos para esta categoría.
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => `${item.doctorId}-${item.precio}`}
              contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <View className="mb-3 mt-5">
                  <Text className="text-base font-semibold text-primary-dark">
                    {section.title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    navigation.navigate(ROUTES.DoctorProfile, {
                      doctorId: item.doctorId,
                    })
                  }
                  className="mb-3 rounded-3xl bg-main p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-primary-dark">
                        {item.nombre}
                      </Text>
                      {item.cedula ? (
                        <Text className="mt-1 text-sm text-primary-dark">
                          Cédula: {item.cedula}
                        </Text>
                      ) : null}
                    </View>
                    <View className="rounded-3xl bg-accent px-3 py-2">
                      <Text className="font-semibold text-primary-dark">
                        {formatCurrencyMXN(item.precio)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
