import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LayoutDashboard, Car, Gavel, Banknote, User } from "lucide-react-native";
import type {
  VendeurTabParamList,
  VendeurVehiclesStackParamList,
  VendeurAuctionsStackParamList,
} from "./types";
import { ProfileStack } from "./ProfileStack";
import { DashboardScreen } from "@/screens/vendeur/DashboardScreen";
import { MesVehiculesScreen } from "@/screens/vendeur/MesVehiculesScreen";
import { VehicleDetailScreen } from "@/screens/vendeur/VehicleDetailScreen";
import { MesEncheresLiveScreen } from "@/screens/vendeur/MesEncheresLiveScreen";
import { HistoriqueScreen } from "@/screens/vendeur/HistoriqueScreen";
import { VendeurPaiementsScreen } from "@/screens/vendeur/VendeurPaiementsScreen";
import { useNotificationsStore } from "@/store/notificationsStore";

const Tab = createBottomTabNavigator<VendeurTabParamList>();
const VehiclesStack = createNativeStackNavigator<VendeurVehiclesStackParamList>();
const AuctionsStack = createNativeStackNavigator<VendeurAuctionsStackParamList>();

function VehiclesStackNavigator() {
  return (
    <VehiclesStack.Navigator>
      <VehiclesStack.Screen name="MesVehicules" component={MesVehiculesScreen} options={{ title: "Mes véhicules" }} />
      <VehiclesStack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: "Véhicule" }} />
    </VehiclesStack.Navigator>
  );
}

function AuctionsStackNavigator() {
  return (
    <AuctionsStack.Navigator>
      <AuctionsStack.Screen name="MesEncheresLive" component={MesEncheresLiveScreen} options={{ title: "En direct" }} />
      <AuctionsStack.Screen name="Historique" component={HistoriqueScreen} options={{ title: "Historique" }} />
    </AuctionsStack.Navigator>
  );
}

export function VendeurTabs() {
  const unread = useNotificationsStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{ title: "Tableau de bord", tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
      />
      <Tab.Screen
        name="VehiclesTab"
        component={VehiclesStackNavigator}
        options={{ title: "Véhicules", tabBarIcon: ({ color, size }) => <Car color={color} size={size} /> }}
      />
      <Tab.Screen
        name="AuctionsTab"
        component={AuctionsStackNavigator}
        options={{ title: "Enchères", tabBarIcon: ({ color, size }) => <Gavel color={color} size={size} /> }}
      />
      <Tab.Screen
        name="PayoutsTab"
        component={VendeurPaiementsScreen}
        options={{ title: "Paiements", tabBarIcon: ({ color, size }) => <Banknote color={color} size={size} /> }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
    </Tab.Navigator>
  );
}
