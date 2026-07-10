// aes-js ships no types. Declared narrowly for what largeSecureStore.ts actually uses.
declare module "aes-js" {
  export const utils: {
    hex: { toBytes(hex: string): Uint8Array; fromBytes(bytes: Uint8Array): string };
    utf8: { toBytes(text: string): Uint8Array; fromBytes(bytes: Uint8Array): string };
  };
  export class Counter {
    constructor(initialValue: number | Uint8Array);
  }
  export namespace ModeOfOperation {
    class ctr {
      constructor(key: Uint8Array, counter: Counter);
      encrypt(bytes: Uint8Array): Uint8Array;
      decrypt(bytes: Uint8Array): Uint8Array;
    }
  }
}
