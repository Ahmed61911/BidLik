/**
 * Supabase session storage adapter for React Native.
 *
 * expo-secure-store (iOS Keychain / Android Keystore) caps values at ~2KB,
 * but a Supabase session (access + refresh token + user metadata) routinely
 * exceeds that. The standard workaround (per Supabase's own RN guidance):
 * encrypt the session with a random AES key, persist the encrypted blob in
 * AsyncStorage (size is not an issue there), and keep only the small AES key
 * itself in SecureStore. The plaintext session never touches unencrypted
 * on-device storage.
 */
import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as aesjs from "aes-js";

class LargeSecureStore {
  private async getEncryptionKey(keyName: string): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(keyName);
    if (existing) return aesjs.utils.hex.toBytes(existing);

    const key = crypto.getRandomValues(new Uint8Array(32));
    await SecureStore.setItemAsync(keyName, aesjs.utils.hex.fromBytes(key));
    return key;
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    const keyName = `${key}_aes_key`;
    const encryptionKey = await this.getEncryptionKey(keyName);
    const [ivHex, cipherHex] = encrypted.split(":");
    if (!ivHex || !cipherHex) return null;

    try {
      const iv = aesjs.utils.hex.toBytes(ivHex);
      const cipherBytes = aesjs.utils.hex.toBytes(cipherHex);
      const aesCtr = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(iv));
      const decryptedBytes = aesCtr.decrypt(cipherBytes);
      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch {
      // Corrupted/incompatible ciphertext (e.g. key rotated externally) — treat as no session.
      await this.removeItem(key);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const keyName = `${key}_aes_key`;
    const encryptionKey = await this.getEncryptionKey(keyName);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const aesCtr = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(iv));
    const cipherBytes = aesCtr.encrypt(aesjs.utils.utf8.toBytes(value));
    const payload = `${aesjs.utils.hex.fromBytes(iv)}:${aesjs.utils.hex.fromBytes(cipherBytes)}`;
    await AsyncStorage.setItem(key, payload);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(`${key}_aes_key`);
  }
}

export const largeSecureStore = new LargeSecureStore();
