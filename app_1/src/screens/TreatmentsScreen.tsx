import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/routes";
import { ROUTES } from "../navigation/routes";

type Props = NativeStackScreenProps<RootStackParamList, "Treatments">;

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

export function TreatmentsScreen({ navigation }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-main">
      <View className="px-6 pb-6 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-semibold text-primary-dark">
            Tratamientos
          </Text>

          <Pressable
            onPress={() => navigation.navigate(ROUTES.Onboarding)}
            className="flex-row items-center gap-2 rounded-3xl bg-soft px-4 py-2 disabled:opacity-60"
          >
            <Text className="text-base font-semibold text-primary-dark">
              Perfil
            </Text>
          </Pressable>
        </View>

        <Text className="mt-2 text-base text-primary-dark">
          Elige un servicio para ver médicos disponibles.
        </Text>
      </View>

      <View className="flex-1 px-6">
        <View className="rounded-3xl bg-soft p-4">
          <ScrollView showsVerticalScrollIndicator={false}>
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
                        onPress={() =>
                          navigation.navigate(ROUTES.Doctors, { treatment: service })
                        }
                        className="rounded-3xl bg-main px-5 py-4"
                      >
                        <Text className="text-base font-semibold text-primary-dark">
                          {service}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
