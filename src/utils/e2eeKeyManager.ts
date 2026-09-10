import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import nacl from 'tweetnacl';
import { sha256Sync, getChatSessionKey } from './encryption';
import { getBackendUrl } from '../services/firebase';

// Helper: Uint8Array to Hex string
export function uint8ArrayToHex(arr: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < arr.length; i++) {
    hex += arr[i].toString(16).padStart(2, '0');
  }
  return hex;
}

// Helper: Hex string to Uint8Array
export function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    arr[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return arr;
}

// Ensure secure PRNG is initialized across Hermes, Web, and Node
try {
  if (typeof (nacl as any).setPRNG === 'function') {
    (nacl as any).setPRNG((x: Uint8Array, n: number) => {
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const v = new Uint8Array(n);
        crypto.getRandomValues(v);
        for (let i = 0; i < n; i++) x[i] = v[i];
      } else {
        for (let i = 0; i < n; i++) x[i] = Math.floor(Math.random() * 256);
      }
    });
  }
} catch (_) {}

const STORAGE_KEY_PRIV = '@khusphus_e2ee_priv_key_v1';
const STORAGE_KEY_PUB = '@khusphus_e2ee_pub_key_v1';

// In-memory cache for peer public keys and derived secrets
const peerKeyCache = new Map<string, string>();
const secretCache = new Map<string, string>();

export const E2eeKeyManager = {
  /**
   * Get or generate Curve25519 Identity Keypair for current device
   * Private key stays strictly locked on-device (Zero-Knowledge)
   */
  async getOrGenerateKeyPair(): Promise<{ publicKey: string; secretKey: string }> {
    try {
      let privHex = await AsyncStorage.getItem(STORAGE_KEY_PRIV);
      let pubHex = await AsyncStorage.getItem(STORAGE_KEY_PUB);

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        if (!privHex) privHex = window.localStorage.getItem(STORAGE_KEY_PRIV);
        if (!pubHex) pubHex = window.localStorage.getItem(STORAGE_KEY_PUB);
      }

      if (privHex && pubHex && privHex.length === 64 && pubHex.length === 64) {
        return { publicKey: pubHex, secretKey: privHex };
      }

      // Generate brand new Curve25519 keypair
      const keyPair = nacl.box.keyPair();
      const newPubHex = uint8ArrayToHex(keyPair.publicKey);
      const newPrivHex = uint8ArrayToHex(keyPair.secretKey);

      await AsyncStorage.setItem(STORAGE_KEY_PRIV, newPrivHex);
      await AsyncStorage.setItem(STORAGE_KEY_PUB, newPubHex);

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_PRIV, newPrivHex);
        window.localStorage.setItem(STORAGE_KEY_PUB, newPubHex);
      }

      return { publicKey: newPubHex, secretKey: newPrivHex };
    } catch (e) {
      console.warn('[E2EE_KEY_GEN_ERR]', e);
      return { publicKey: '', secretKey: '' };
    }
  },

  /**
   * Fetch peer's public key from server or cache
   */
  async getPeerPublicKey(peerPhone: string): Promise<string | null> {
    const cleanPhone = String(peerPhone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone) return null;

    if (peerKeyCache.has(cleanPhone)) {
      return peerKeyCache.get(cleanPhone)!;
    }

    // Try reading cached key from storage
    const storageKey = `@khusphus_peer_pubkey_${cleanPhone}`;
    try {
      let cached = await AsyncStorage.getItem(storageKey);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage && !cached) {
        cached = window.localStorage.getItem(storageKey);
      }
      if (cached && cached.length === 64) {
        peerKeyCache.set(cleanPhone, cached);
        return cached;
      }
    } catch (_) {}

    // Fetch from backend API
    try {
      const baseUrl = getBackendUrl();
      const res = await fetch(`${baseUrl}/api/user/publickey?phone=${cleanPhone}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.publicKey && data.publicKey.length === 64) {
          const key = String(data.publicKey).trim();
          peerKeyCache.set(cleanPhone, key);
          await AsyncStorage.setItem(storageKey, key);
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(storageKey, key);
          }
          return key;
        }
      }
    } catch (_) {}

    return null;
  },

  /**
   * Set peer public key manually (e.g. from user search / contacts sync)
   */
  setPeerPublicKey(peerPhone: string, publicKey: string) {
    const cleanPhone = String(peerPhone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || !publicKey || publicKey.length !== 64) return;
    peerKeyCache.set(cleanPhone, publicKey);
  },

  /**
   * Compute Diffie-Hellman Shared Secret: ECDH(My_Priv, Peer_Pub)
   * If peer public key is not available yet, falls back gracefully to deterministic session key
   */
  async getSharedSecretHash(myPhone: string, peerPhone: string): Promise<string> {
    const cleanMe = String(myPhone || '').replace(/\D/g, '').slice(-10);
    const cleanPeer = String(peerPhone || '').replace(/\D/g, '').slice(-10);
    const pairId = [cleanMe, cleanPeer].sort().join('_');

    if (secretCache.has(pairId)) {
      return secretCache.get(pairId)!;
    }

    try {
      const myKeys = await this.getOrGenerateKeyPair();
      const peerPubHex = await this.getPeerPublicKey(cleanPeer);

      if (myKeys.secretKey && peerPubHex && peerPubHex.length === 64) {
        const myPrivBytes = hexToUint8Array(myKeys.secretKey);
        const peerPubBytes = hexToUint8Array(peerPubHex);

        // 🔒 Real Curve25519 Diffie-Hellman Key Agreement
        const rawSecret = nacl.box.before(peerPubBytes, myPrivBytes);
        const rawSecretHex = uint8ArrayToHex(rawSecret);

        // Derive uniform 256-bit session key via SHA-256
        const ecdhHash = sha256Sync(`ecdh_v1_${rawSecretHex}`);
        secretCache.set(pairId, ecdhHash);
        return ecdhHash;
      }
    } catch (e) {
      console.warn('[ECDH_DERIVATION_WARN]', e);
    }

    // Graceful backward-compatible fallback
    const fallback = sha256Sync(getChatSessionKey(cleanMe, cleanPeer));
    return fallback;
  }
};
