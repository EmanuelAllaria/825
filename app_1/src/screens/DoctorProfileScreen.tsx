import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSupabaseClient, getSupabaseConfigStatus } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/routes";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorProfile">;

type Doctor = {
  id: string | number;
  nombre?: string | null;
  cedula?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  estado_provincia?: string | null;
  fotos?: unknown;
};

type TreatmentPrice = { tipo_tratamiento: string; precio: number };

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

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeTel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return `+${normalizeDigits(trimmed)}`;
  return normalizeDigits(trimmed);
}

function coercePhotoUrls(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : null))
      .filter(Boolean) as string[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => (typeof v === "string" ? v : null))
          .filter(Boolean) as string[];
      }
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

export function DoctorProfileScreen({ navigation, route }: Props) {
  const { doctorId } = route.params;
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 48, 420);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [prices, setPrices] = useState<TreatmentPrice[]>([]);

  const photoUrls = useMemo(() => coercePhotoUrls(doctor?.fotos), [doctor?.fotos]);

  const tel = useMemo(() => {
    const raw = (doctor?.telefono ?? doctor?.whatsapp ?? "").toString();
    return normalizeTel(raw);
  }, [doctor?.telefono, doctor?.whatsapp]);

  const wa = useMemo(() => {
    const raw = (doctor?.whatsapp ?? doctor?.telefono ?? "").toString();
    return normalizeDigits(raw);
  }, [doctor?.telefono, doctor?.whatsapp]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErrorText(null);
      setDoctor(null);
      setPrices([]);

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

      const doctorRes = await supabase
        .from("perfiles_medicos")
        .select("id,nombre,cedula,whatsapp,telefono,estado_provincia,fotos")
        .eq("id", doctorId)
        .maybeSingle();

      if (cancelled) return;

      if (doctorRes.error) {
        setErrorText(doctorRes.error.message);
        setLoading(false);
        return;
      }

      const pricesRes = await supabase
        .from("tratamientos_precios")
        .select("tipo_tratamiento,precio")
        .eq("medico_id", doctorId)
        .order("tipo_tratamiento", { ascending: true });

      if (cancelled) return;

      if (pricesRes.error) {
        setErrorText(pricesRes.error.message);
        setLoading(false);
        return;
      }

      const normalizedPrices: TreatmentPrice[] = (pricesRes.data ?? [])
        .map((row) => {
          const tipo_tratamiento =
            row && typeof (row as any).tipo_tratamiento === "string"
              ? ((row as any).tipo_tratamiento as string)
              : "";
          const precio =
            row && typeof (row as any).precio === "number"
              ? ((row as any).precio as number)
              : 0;
          return { tipo_tratamiento, precio };
        })
        .filter((p) => Boolean(p.tipo_tratamiento));

      setDoctor((doctorRes.data ?? null) as Doctor | null);
      setPrices(normalizedPrices);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  async function handleCall() {
    if (!tel) return;
    const url = `tel:${tel}`;
    await Linking.openURL(url);
  }

  async function handleWhatsApp() {
    if (!wa) return;
    const url = `https://wa.me/${wa}`;
    await Linking.openURL(url);
  }

  return (
    <SafeAreaView className="flex-1 bg-main">
      <View className="px-6 pb-4 pt-2">
        <Pressable
          onPress={() => navigation.goBack()}
          className="self-start rounded-3xl bg-soft px-4 py-3"
        >
          <Text className="font-semibold text-primary-dark">Volver</Text>
        </Pressable>
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
                No se pudo cargar el perfil
              </Text>
              <Text className="mt-2 text-center text-sm text-primary-dark">
                {errorText}
              </Text>
            </View>
          ) : !doctor ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-center text-base font-semibold text-primary-dark">
                Perfil no encontrado
              </Text>
            </View>
          ) : (
            <FlatList
              data={[{ key: "content" }]}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ padding: 16, paddingBottom: 22 }}
              renderItem={() => (
                <View className="gap-4">
                  <View className="overflow-hidden rounded-3xl bg-main">
                    {photoUrls.length === 0 ? (
                      <View className="h-56 items-center justify-center bg-accent">
                        <Text className="font-semibold text-primary-dark">
                          Sin fotos
                        </Text>
                      </View>
                    ) : (
                      <FlatList
                        data={photoUrls}
                        keyExtractor={(u, i) => `${i}-${u}`}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item: uri }) => (
                          <View style={{ width: cardWidth }}>
                            <Image
                              source={{ uri }}
                              resizeMode="cover"
                              className="h-56 w-full"
                            />
                          </View>
                        )}
                      />
                    )}
                  </View>

                  <View className="rounded-3xl bg-main p-5">
                    <Text className="text-xl font-semibold text-primary-dark">
                      {(doctor.nombre ?? "Médico").toString()}
                    </Text>
                    <Text className="mt-2 text-base text-primary-dark">
                      Cédula profesional:{" "}
                      {(doctor.cedula ?? "No disponible").toString()}
                    </Text>
                  </View>

                  <View className="rounded-3xl bg-main p-5">
                    <Text className="text-lg font-semibold text-primary-dark">
                      Servicios
                    </Text>
                    {prices.length === 0 ? (
                      <Text className="mt-2 text-sm text-primary-dark">
                        No hay servicios cargados.
                      </Text>
                    ) : (
                      <View className="mt-3 gap-3">
                        {prices.map((p) => (
                          <View
                            key={p.tipo_tratamiento}
                            className="flex-row items-center justify-between rounded-3xl bg-soft px-4 py-3"
                          >
                            <Text className="flex-1 pr-3 font-semibold text-primary-dark">
                              {p.tipo_tratamiento}
                            </Text>
                            <Text className="font-semibold text-primary-dark">
                              {formatCurrencyMXN(p.precio)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={handleCall}
                      disabled={!tel}
                      className={`flex-1 rounded-3xl px-5 py-4 ${
                        tel ? "bg-primary" : "bg-accent"
                      }`}
                    >
                      <Text className="text-center font-semibold text-white">
                        Llamar
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleWhatsApp}
                      disabled={!wa}
                      className={`flex-1 rounded-3xl px-5 py-4 ${
                        wa ? "bg-primary" : "bg-accent"
                      }`}
                    >
                      <Text className="text-center font-semibold text-white">
                        WhatsApp
                      </Text>
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
