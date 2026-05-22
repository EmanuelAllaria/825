import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSupabaseClient } from "../lib/supabase";
import { ROUTES, type RootStackParamList } from "../navigation/routes";

type Props = NativeStackScreenProps<RootStackParamList, "DoctorServices">;

type TabKey = "perfil" | "servicios";

const CATEGORIES = [
  {
    title: "Ortodoncia",
    services: [
      "Brackets metálicos",
      "Brackets estéticos",
      "Alineadores",
      "Retenedores",
    ],
  },
  {
    title: "Estética",
    services: ["Blanqueamiento", "Carillas", "Resinas estéticas", "Limpieza profunda"],
  },
  {
    title: "Cirugía oral",
    services: [
      "Extracción simple",
      "Extracción de muela de juicio",
      "Cirugía de frenillo",
      "Biopsia",
    ],
  },
  {
    title: "Prótesis",
    services: ["Corona", "Puente", "Prótesis parcial", "Prótesis completa"],
  },
  {
    title: "Periodoncia",
    services: [
      "Destartraje",
      "Raspaje y alisado radicular",
      "Curetaje",
      "Mantenimiento periodontal",
    ],
  },
  {
    title: "Odontopediatría",
    services: [
      "Consulta pediátrica",
      "Selladores",
      "Flúor",
      "Pulpotomía",
    ],
  },
  {
    title: "Diagnóstico",
    services: ["Consulta", "Radiografía", "Plan de tratamiento", "Control"],
  },
] as const;

type PriceMap = Record<string, number>;

type PhotoSlot = { uri: string; kind: "remote" | "local" } | null;

async function uriToBlob(uri: string) {
  const res = await fetch(uri);
  return await res.blob();
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsArrayBuffer(blob);
  });
}

function coerceStringArray(value: unknown) {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string") as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((v) => typeof v === "string") as string[];
      }
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

export function DoctorServicesScreen({ navigation, route }: Props) {
  const [tab, setTab] = useState<TabKey>(route.params?.initialTab ?? "perfil");

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [estadoProvincia, setEstadoProvincia] = useState("");
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    null,
    null,
    null,
    null,
    null,
  ]);

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [priceText, setPriceText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [servicePrices, setServicePrices] = useState<PriceMap>({});

  const placeholder = useMemo(
    () => selectedService ?? "Selecciona un servicio",
    [selectedService]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      await ImagePicker.requestMediaLibraryPermissionsAsync();

      setProfileLoading(true);
      setProfileMessage(null);
      setLoading(true);
      setMessage(null);
      const sessionRes = await supabase.auth.getSession();
      const user = sessionRes.data.session?.user;
      if (!user) {
        navigation.replace(ROUTES.DoctorAuth);
        return;
      }

      const profileRes = await supabase
        .from("perfiles_medicos")
        .select("nombre,cedula,estado_provincia,fotos")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        if (profileRes.data) {
          setName((profileRes.data as any).nombre?.toString() ?? "");
          setLicense((profileRes.data as any).cedula?.toString() ?? "");
          setEstadoProvincia((profileRes.data as any).estado_provincia?.toString() ?? "");
          const urls = coerceStringArray((profileRes.data as any).fotos);
          setPhotos(() => {
            const next: PhotoSlot[] = [null, null, null, null, null];
            for (let i = 0; i < Math.min(5, urls.length); i++) {
              next[i] = { uri: urls[i], kind: "remote" };
            }
            return next;
          });
        }
        setProfileLoading(false);
      }

      const res = await supabase
        .from("tratamientos_precios")
        .select("tipo_tratamiento,precio")
        .eq("medico_id", user.id);

      if (cancelled) return;

      if (res.error) {
        setMessage(res.error.message);
        setLoading(false);
        return;
      }

      const map: PriceMap = {};
      for (const row of res.data ?? []) {
        const servicio =
          row && typeof (row as any).tipo_tratamiento === "string"
            ? ((row as any).tipo_tratamiento as string)
            : null;
        const precio =
          row && typeof (row as any).precio === "number"
            ? ((row as any).precio as number)
            : null;
        if (servicio && typeof precio === "number") map[servicio] = precio;
      }
      setServicePrices(map);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  useEffect(() => {
    if (!selectedService) return;
    const existing = servicePrices[selectedService];
    if (typeof existing === "number") {
      setPriceText(String(existing));
    } else {
      setPriceText("");
    }
  }, [servicePrices, selectedService]);

  async function pickForSlot(index: number) {
    setProfileMessage(null);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      allowsMultipleSelection: false,
    });

    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;

    setPhotos((prev) => {
      const next = prev.slice();
      next[index] = { uri: asset.uri, kind: "local" };
      return next;
    });
  }

  async function handleUpdateProfile() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setProfileMessage(null);
    const trimmedName = name.trim();
    const trimmedLicense = license.trim();
    const trimmedEstadoProvincia = estadoProvincia.trim();

    if (!trimmedName) {
      setProfileMessage("Escribe tu nombre.");
      return;
    }
    if (!trimmedLicense) {
      setProfileMessage("Escribe tu cédula profesional.");
      return;
    }
    if (!trimmedEstadoProvincia) {
      setProfileMessage("Escribe tu provincia/estado.");
      return;
    }

    setProfileSaving(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const user = sessionRes.data.session?.user;
      if (!user) {
        navigation.replace(ROUTES.DoctorAuth);
        return;
      }

      const existingRes = await supabase
        .from("perfiles_medicos")
        .select("telefono,whatsapp")
        .eq("id", user.id)
        .maybeSingle();

      const telefono =
        existingRes.data && typeof (existingRes.data as any).telefono === "string"
          ? ((existingRes.data as any).telefono as string)
          : null;
      const whatsapp =
        existingRes.data && typeof (existingRes.data as any).whatsapp === "string"
          ? ((existingRes.data as any).whatsapp as string)
          : null;

      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const slot = photos[i];
        if (!slot) continue;
        if (slot.kind === "remote") {
          urls.push(slot.uri);
          continue;
        }

        const blob = await uriToBlob(slot.uri);
        const bytes = await blobToArrayBuffer(blob);
        const path = `profiles/${user.id}/${Date.now()}-${i}.jpg`;

        const uploadRes = await supabase.storage
          .from("medicos")
          .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

        if (uploadRes.error) {
          setProfileMessage(uploadRes.error.message);
          return;
        }

        const publicUrlRes = supabase.storage.from("medicos").getPublicUrl(path);
        urls.push(publicUrlRes.data.publicUrl);
      }

      const upsertRes = await supabase.from("perfiles_medicos").upsert(
        {
          id: user.id,
          nombre: trimmedName,
          cedula: trimmedLicense,
          estado_provincia: trimmedEstadoProvincia,
          telefono,
          whatsapp,
          fotos: urls,
        },
        { onConflict: "id" }
      );

      if (upsertRes.error) {
        setProfileMessage(upsertRes.error.message);
        return;
      }

      setProfileMessage("Perfil actualizado.");
      DeviceEventEmitter.emit("profile_updated");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSave() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setMessage(null);

    if (!selectedService) {
      setMessage("Selecciona un servicio.");
      return;
    }

    const price = Number(priceText);
    if (!Number.isFinite(price) || price <= 0) {
      setMessage("Ingresa un precio válido.");
      return;
    }

    setSaving(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const user = sessionRes.data.session?.user;
      if (!user) {
        navigation.replace(ROUTES.DoctorAuth);
        return;
      }

      const { data: existente, error: fetchError } = await supabase
        .from("tratamientos_precios")
        .select("id")
        .eq("medico_id", user.id)
        .eq("tipo_tratamiento", selectedService)
        .maybeSingle();

      if (fetchError) {
        setMessage(fetchError.message);
        return;
      }

      if (existente) {
        const { error: updateError } = await supabase
          .from("tratamientos_precios")
          .update({ precio: parseFloat(priceText) })
          .eq("id", (existente as any).id);

        if (updateError) {
          setMessage(`Error al actualizar: ${updateError.message}`);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("tratamientos_precios")
          .insert({
            medico_id: user.id,
            tipo_tratamiento: selectedService,
            precio: parseFloat(priceText),
          });

        if (insertError) {
          setMessage(`Error al guardar: ${insertError.message}`);
          return;
        }
      }

      setServicePrices((prev) => ({ ...prev, [selectedService]: price }));
      setMessage("Servicio guardado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-main">
      <View className="px-6 pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => navigation.replace(ROUTES.DoctorAccount)}
            className="rounded-3xl bg-soft px-4 py-3"
          >
            <Text className="font-semibold text-primary-dark">Volver</Text>
          </Pressable>
        </View>

        <Text className="mt-5 text-2xl font-semibold text-primary-dark">
          Configuración
        </Text>
        <Text className="mt-2 text-base text-primary-dark">
          Perfil y servicios.
        </Text>
      </View>

      <View className="flex-1 px-6 pb-6">
        <View className="flex-1 overflow-hidden rounded-3xl bg-soft p-5">
          <View className="mb-4 flex-row overflow-hidden rounded-3xl bg-main">
            <Pressable
              onPress={() => setTab("perfil")}
              className={`flex-1 px-4 py-3 ${tab === "perfil" ? "bg-primary" : ""}`}
            >
              <Text className={`text-center font-semibold ${tab === "perfil" ? "text-white" : "text-primary-dark"}`}>
                Perfil
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("servicios")}
              className={`flex-1 px-4 py-3 ${tab === "servicios" ? "bg-primary" : ""}`}
            >
              <Text className={`text-center font-semibold ${tab === "servicios" ? "text-white" : "text-primary-dark"}`}>
                Servicios
              </Text>
            </Pressable>
          </View>

          {tab === "perfil" ? (
            profileLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator />
                <Text className="mt-3 text-primary-dark">Cargando…</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-4">
                  <View className="rounded-3xl bg-main px-4 py-3">
                    <Text className="mb-2 text-sm font-semibold text-primary-dark">
                      Nombre
                    </Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      maxLength={30}
                      placeholder="Tu nombre completo"
                      placeholderTextColor="#03045E"
                      className="text-base text-primary-dark"
                    />
                  </View>

                  <View className="rounded-3xl bg-main px-4 py-3">
                    <Text className="mb-2 text-sm font-semibold text-primary-dark">
                      Cédula profesional
                    </Text>
                    <TextInput
                      value={license}
                      onChangeText={setLicense}
                      maxLength={15}
                      placeholder="Ej. 1234567"
                      placeholderTextColor="#03045E"
                      className="text-base text-primary-dark"
                    />
                  </View>

                  <View className="rounded-3xl bg-main px-4 py-3">
                    <Text className="mb-2 text-sm font-semibold text-primary-dark">
                      Provincia / Estado
                    </Text>
                    <TextInput
                      value={estadoProvincia}
                      onChangeText={setEstadoProvincia}
                      maxLength={30}
                      placeholder="Ej. Buenos Aires"
                      placeholderTextColor="#03045E"
                      className="text-base text-primary-dark"
                    />
                  </View>

                  <View className="rounded-3xl bg-main p-4">
                    <Text className="text-base font-semibold text-primary-dark">
                      Fotos (opcional)
                    </Text>
                    <View className="mt-3 flex-row flex-wrap justify-between">
                      {photos.map((slot, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => pickForSlot(idx)}
                          disabled={profileSaving}
                          className="mb-3 overflow-hidden rounded-3xl bg-soft"
                          style={{ width: "48%", aspectRatio: 1 }}
                        >
                          {slot ? (
                            <Image
                              source={{ uri: slot.uri }}
                              resizeMode="cover"
                              className="h-full w-full"
                            />
                          ) : (
                            <View className="flex-1 items-center justify-center bg-accent px-3">
                              <Text className="text-center font-semibold text-primary-dark">
                                Elegir foto {idx + 1}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {profileMessage ? (
                    <View className="rounded-3xl bg-accent px-4 py-3">
                      <Text className="text-sm font-semibold text-primary-dark">
                        {profileMessage}
                      </Text>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={handleUpdateProfile}
                    disabled={profileSaving}
                    className="rounded-3xl bg-primary px-5 py-4"
                  >
                    {profileSaving ? (
                      <View className="flex-row items-center justify-center gap-3">
                        <ActivityIndicator color="#fff" />
                        <Text className="text-center text-base font-semibold text-white">
                          Actualizando…
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-center text-base font-semibold text-white">
                        Actualizar perfil
                      </Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            )
          ) : loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator />
              <Text className="mt-3 text-primary-dark">Cargando…</Text>
            </View>
          ) : (
            <View className="flex-1 gap-4">
              <View className="rounded-3xl bg-main px-4 py-4">
                <Text className="text-base font-semibold text-primary-dark">
                  {placeholder}
                </Text>
              </View>

              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="gap-4">
                  {CATEGORIES.map((cat) => (
                    <View key={cat.title} className="gap-3">
                      <Text className="text-base font-semibold text-primary-dark">
                        {cat.title}
                      </Text>
                      <View className="gap-3">
                        {cat.services.map((service) => (
                          <Pressable
                            key={service}
                            onPress={() => setSelectedService(service)}
                            className={`rounded-3xl px-4 py-4 ${
                              selectedService === service ? "bg-primary" : "bg-main"
                            }`}
                          >
                            <View className="flex-row items-center justify-between">
                              <Text
                                className={`font-semibold ${
                                  selectedService === service
                                    ? "text-white"
                                    : "text-primary-dark"
                                }`}
                              >
                                {service}
                              </Text>
                              {typeof servicePrices[service] === "number" ? (
                                <Text
                                  className={`font-semibold ${
                                    selectedService === service
                                      ? "text-white"
                                      : "text-primary-dark"
                                  }`}
                                >
                                  ${Math.round(servicePrices[service]).toLocaleString("es-AR")}
                                </Text>
                              ) : null}
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {selectedService ? (
                <View className="rounded-3xl bg-main px-4 py-3">
                  <Text className="mb-2 text-sm font-semibold text-primary-dark">
                    Precio
                  </Text>
                  <TextInput
                    value={priceText}
                    onChangeText={setPriceText}
                    keyboardType="numeric"
                    maxLength={15}
                    placeholder="Ej. 12000"
                    placeholderTextColor="#03045E"
                    className="text-base text-primary-dark"
                  />
                </View>
              ) : null}

              {message ? (
                <View className="rounded-3xl bg-accent px-4 py-3">
                  <Text className="text-sm font-semibold text-primary-dark">
                    {message}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSave}
                disabled={saving || !selectedService}
                className={`rounded-3xl px-5 py-4 ${
                  saving || !selectedService ? "bg-accent" : "bg-primary"
                }`}
              >
                {saving ? (
                  <View className="flex-row items-center justify-center gap-3">
                    <ActivityIndicator color="#fff" />
                    <Text className="text-center text-base font-semibold text-white">
                      Guardando…
                    </Text>
                  </View>
                ) : (
                  <Text className="text-center text-base font-semibold text-white">
                    Guardar
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
