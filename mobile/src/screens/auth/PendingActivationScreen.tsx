import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Clock } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import type { AuthStackParamList } from "@/navigation/types";

export function PendingActivationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-warning/15">
        <Clock size={32} color="rgb(232, 166, 61)" />
      </View>
      <Text className="mt-6 text-xl font-semibold text-foreground text-center">Compte en attente d'activation</Text>
      <Text className="mt-2 text-base text-muted-foreground text-center">
        Votre compte a bien été créé. Un administrateur Bidlik doit l'activer avant votre première connexion — vous
        recevrez une notification dès que ce sera fait.
      </Text>
      <Button
        label="Retour à la connexion"
        variant="outline"
        onPress={() => navigation.reset({ index: 0, routes: [{ name: "Login" }] })}
        className="mt-8 self-stretch"
      />
    </View>
  );
}
