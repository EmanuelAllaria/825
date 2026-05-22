import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ROUTES, RootStackParamList } from "./routes";
import { AccessScreen } from "../screens/AccessScreen";
import { TreatmentsScreen } from "../screens/TreatmentsScreen";
import { DoctorsScreen } from "../screens/DoctorsScreen";
import { DoctorProfileScreen } from "../screens/DoctorProfileScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={ROUTES.Onboarding}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name={ROUTES.Onboarding} component={AccessScreen} />
        <Stack.Screen name={ROUTES.Treatments} component={TreatmentsScreen} />
        <Stack.Screen name={ROUTES.Doctors} component={DoctorsScreen} />
        <Stack.Screen
          name={ROUTES.DoctorProfile}
          component={DoctorProfileScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
