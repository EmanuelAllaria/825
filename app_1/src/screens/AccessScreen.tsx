import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSupabaseClient } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/routes";
import { ROUTES } from "../navigation/routes";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

export function AccessScreen({ navigation }: Props) {
  const [nombreInput, setNombreInput] = useState("");
  const [apellidoInput, setApellidoInput] = useState("");
  const [edadInput, setEdadInput] = useState("");
  const [sexoInput, setSexoInput] = useState("");
  const [descripcionInput, setDescripcionInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleCreateProfile() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      Alert.alert("Error", "Supabase no está configurado en esta app.");
      return;
    }

    const nombre = nombreInput.trim();
    const apellido = apellidoInput.trim();
    const edad = Number.parseInt(edadInput.trim(), 10);
    const sexo = sexoInput.trim();
    const descripcion = descripcionInput.trim();

    try {
      setIsBusy(true);

      if (!nombre || !apellido) {
        Alert.alert("Faltan datos", "Completa nombre y apellido.");
        return;
      }
      if (!Number.isFinite(edad) || edad <= 0) {
        Alert.alert("Faltan datos", "Ingresa una edad válida.");
        return;
      }

      const { error: insertError } = await supabase.from("pacientes_global").insert({
        nombre,
        apellido,
        edad,
        sexo: sexo || null,
        descripcion: descripcion || null,
      });

      if (insertError) {
        Alert.alert("Error al crear el perfil", insertError.message);
        return;
      }

      Alert.alert("Listo", "Perfil creado.");
      setNombreInput("");
      setApellidoInput("");
      setEdadInput("");
      setSexoInput("");
      setDescripcionInput("");
      navigation.replace(ROUTES.Treatments);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-main">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 items-center justify-center px-8 py-10">
          <View className="items-center">
            <Image
              source={require("../../assets/logos/logo_without_text.png")}
              resizeMode="contain"
              className="h-28 w-64"
            />
          </View>

          <View className="mt-10 w-full max-w-md overflow-hidden rounded-3xl bg-soft p-6">
            <Text className="text-xl font-semibold text-primary-dark">
              Añadir perfil
            </Text>
            <Text className="mt-2 text-base text-primary-dark">
              Crea tu perfil sin iniciar sesión.
            </Text>

            <View className="mt-5 gap-3">
              <TextInput
                value={nombreInput}
                onChangeText={setNombreInput}
                placeholder="Nombre"
                placeholderTextColor="#6b7280"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
                editable={!isBusy}
                className="rounded-3xl bg-main px-5 py-4 text-base text-primary-dark"
              />

              <TextInput
                value={apellidoInput}
                onChangeText={setApellidoInput}
                placeholder="Apellido"
                placeholderTextColor="#6b7280"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
                editable={!isBusy}
                className="rounded-3xl bg-main px-5 py-4 text-base text-primary-dark"
              />

              <TextInput
                value={edadInput}
                onChangeText={setEdadInput}
                placeholder="Edad"
                placeholderTextColor="#6b7280"
                keyboardType="number-pad"
                maxLength={3}
                editable={!isBusy}
                className="rounded-3xl bg-main px-5 py-4 text-base text-primary-dark"
              />

              <TextInput
                value={sexoInput}
                onChangeText={setSexoInput}
                placeholder="Sexo (opcional)"
                placeholderTextColor="#6b7280"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
                editable={!isBusy}
                className="rounded-3xl bg-main px-5 py-4 text-base text-primary-dark"
              />

              <TextInput
                value={descripcionInput}
                onChangeText={setDescripcionInput}
                placeholder="Descripción (opcional)"
                placeholderTextColor="#6b7280"
                autoCapitalize="sentences"
                autoCorrect={false}
                maxLength={150}
                editable={!isBusy}
                className="rounded-3xl bg-main px-5 py-4 text-base text-primary-dark"
              />
            </View>

            <View className="mt-5 gap-3">
              <Pressable
                onPress={handleCreateProfile}
                disabled={isBusy}
                className="flex-row items-center justify-center gap-2 rounded-3xl bg-primary px-5 py-4 shadow-sm disabled:opacity-60"
              >
                {isBusy ? <ActivityIndicator color="#fff" /> : null}
                <Text className="text-center text-base font-semibold text-white">
                  Crear perfil
                </Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.replace(ROUTES.Treatments)}
                disabled={isBusy}
                className="rounded-3xl bg-main px-5 py-4 disabled:opacity-60"
              >
                <Text className="text-center text-base font-semibold text-primary-dark">
                  Entrar sin iniciar sesión
                </Text>
              </Pressable>
            </View>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
