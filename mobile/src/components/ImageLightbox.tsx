import { Modal, View, Pressable, Text, Dimensions } from "react-native";
import { Image } from "expo-image";
import { X, ChevronLeft, ChevronRight } from "lucide-react-native";

/** Full-screen photo preview modal — tap a thumbnail to open, swipe/tap arrows
 * between photos, tap X or backdrop-adjacent close button to dismiss. */
export function ImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const { width, height } = Dimensions.get("window");

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/95">
        <Pressable
          onPress={onClose}
          className="absolute right-5 top-12 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/15"
        >
          <X size={20} color="#FFFFFF" />
        </Pressable>

        <View className="absolute left-0 right-0 top-14 z-10 items-center">
          <Text className="text-xs font-semibold text-white">
            {index + 1} / {images.length}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center">
          <Image source={{ uri: images[index] }} style={{ width, height: height * 0.75 }} contentFit="contain" />
        </View>

        {images.length > 1 ? (
          <>
            <Pressable
              onPress={() => onIndexChange((index - 1 + images.length) % images.length)}
              style={{ top: "50%", marginTop: -20 }}
              className="absolute left-3 h-10 w-10 items-center justify-center rounded-full bg-white/15"
            >
              <ChevronLeft size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => onIndexChange((index + 1) % images.length)}
              style={{ top: "50%", marginTop: -20 }}
              className="absolute right-3 h-10 w-10 items-center justify-center rounded-full bg-white/15"
            >
              <ChevronRight size={22} color="#FFFFFF" />
            </Pressable>
          </>
        ) : null}
      </View>
    </Modal>
  );
}
