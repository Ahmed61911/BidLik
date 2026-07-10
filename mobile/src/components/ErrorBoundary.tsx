import { Component, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { AlertTriangle } from "lucide-react-native";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Top-level error boundary — a render crash anywhere below shows a recover
 * screen instead of a blank/white screen. Wraps the whole app in App.tsx.
 * (Uses inline styles, not NativeWind classes, so it can render even if the
 * styling layer itself is what failed.)
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#FAFBFC" }}>
        <AlertTriangle size={40} color="#DC2626" />
        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: "700", color: "#22283A", textAlign: "center" }}>
          Une erreur est survenue
        </Text>
        <Text style={{ marginTop: 8, fontSize: 14, color: "#6B7280", textAlign: "center" }}>
          L'application a rencontré un problème inattendu. Réessayez.
        </Text>
        <Pressable
          onPress={this.reset}
          style={{ marginTop: 24, backgroundColor: "#1F2D4D", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }}
        >
          <Text style={{ color: "#FAFBFC", fontWeight: "600" }}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }
}
