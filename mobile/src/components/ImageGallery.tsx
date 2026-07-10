import { useState } from "react";
import { View, Text, ScrollView, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { Image } from "expo-image";

export function ImageGallery({ images, marque }: { images: string[]; marque: string }) {
  const { width } = useWindowDimensions();
  const [activeIdx, setActiveIdx] = useState(0);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIdx) setActiveIdx(idx);
  }

  if (images.length === 0) {
    return (
      <View className="aspect-[4/3] w-full items-center justify-center bg-primary">
        <Text className="text-2xl font-bold text-primary-foreground">{marque}</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        {images.map((src) => (
          <Image
            key={src}
            source={{ uri: src }}
            style={{ width, aspectRatio: 4 / 3 }}
            contentFit="cover"
            transition={150}
          />
        ))}
      </ScrollView>
      {images.length > 1 ? (
        <View className="flex-row justify-center gap-1.5 py-2">
          {images.map((src, i) => (
            <View key={src} className={`h-1.5 rounded-full ${i === activeIdx ? "w-4 bg-primary" : "w-1.5 bg-border"}`} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
