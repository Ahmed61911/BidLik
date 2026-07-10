import { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Gavel, Landmark, Trophy, Wallet, User } from "lucide-react-native";
import { initAcheteurStore } from "@/store/acheteurStore";
import { useNotificationsStore } from "@/store/notificationsStore";
import type {
  AcheteurTabParamList,
  AcheteurHomeStackParamList,
  AcheteurMyBidsStackParamList,
  AcheteurWonStackParamList,
  AcheteurPaymentsStackParamList,
} from "./types";
import { ProfileStack } from "./ProfileStack";
import { AuctionsListScreen } from "@/screens/acheteur/AuctionsListScreen";
import { AuctionDetailScreen } from "@/screens/acheteur/AuctionDetailScreen";
import { MesEncheresScreen } from "@/screens/acheteur/MesEncheresScreen";
import { GagneesScreen } from "@/screens/acheteur/GagneesScreen";
import { WonAuctionDetailScreen } from "@/screens/acheteur/WonAuctionDetailScreen";
import { UploadPaymentProofScreen } from "@/screens/acheteur/UploadPaymentProofScreen";
import { CautionScreen } from "@/screens/acheteur/CautionScreen";
import { CautionPaiementScreen } from "@/screens/acheteur/CautionPaiementScreen";
import { PaiementsScreen } from "@/screens/acheteur/PaiementsScreen";

const Tab = createBottomTabNavigator<AcheteurTabParamList>();
const HomeStack = createNativeStackNavigator<AcheteurHomeStackParamList>();
const MyBidsStack = createNativeStackNavigator<AcheteurMyBidsStackParamList>();
const WonStack = createNativeStackNavigator<AcheteurWonStackParamList>();
const PaymentsStack = createNativeStackNavigator<AcheteurPaymentsStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="AuctionsList" component={AuctionsListScreen} options={{ title: "Enchères" }} />
      <HomeStack.Screen name="AuctionDetail" component={AuctionDetailScreen} options={{ title: "Détail" }} />
    </HomeStack.Navigator>
  );
}

function MyBidsStackNavigator() {
  return (
    <MyBidsStack.Navigator>
      <MyBidsStack.Screen name="MesEncheres" component={MesEncheresScreen} options={{ title: "Mes enchères" }} />
      <MyBidsStack.Screen name="AuctionDetail" component={AuctionDetailScreen} options={{ title: "Détail" }} />
    </MyBidsStack.Navigator>
  );
}

function WonStackNavigator() {
  return (
    <WonStack.Navigator>
      <WonStack.Screen name="Gagnees" component={GagneesScreen} options={{ title: "Gagnées" }} />
      <WonStack.Screen name="WonAuctionDetail" component={WonAuctionDetailScreen} options={{ title: "Véhicule" }} />
      <WonStack.Screen name="UploadPaymentProof" component={UploadPaymentProofScreen} options={{ title: "Justificatif" }} />
    </WonStack.Navigator>
  );
}

function PaymentsStackNavigator() {
  return (
    <PaymentsStack.Navigator>
      <PaymentsStack.Screen name="Caution" component={CautionScreen} options={{ title: "Caution" }} />
      <PaymentsStack.Screen name="CautionPaiement" component={CautionPaiementScreen} options={{ title: "Paiement caution" }} />
      <PaymentsStack.Screen name="Paiements" component={PaiementsScreen} options={{ title: "Paiements" }} />
    </PaymentsStack.Navigator>
  );
}

export function AcheteurTabs() {
  const unread = useNotificationsStore((s) => s.notifications.filter((n) => !n.read).length);

  useEffect(() => {
    initAcheteurStore();
  }, []);

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ title: "Enchères", tabBarIcon: ({ color, size }) => <Gavel color={color} size={size} /> }}
      />
      <Tab.Screen
        name="MyBidsTab"
        component={MyBidsStackNavigator}
        options={{ title: "Mes enchères", tabBarIcon: ({ color, size }) => <Landmark color={color} size={size} /> }}
      />
      <Tab.Screen
        name="WonTab"
        component={WonStackNavigator}
        options={{ title: "Gagnées", tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }}
      />
      <Tab.Screen
        name="PaymentsTab"
        component={PaymentsStackNavigator}
        options={{ title: "Paiements", tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> }}
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
