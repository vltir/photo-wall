import type { ICryptoProvider } from '@core/ports/output';
import type { EncryptedPayload, KeyPair } from '@core/domain/models';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';

export class WebCryptoAdapter implements ICryptoProvider {
  public generateAsymmetricKeyPair(): KeyPair {
    const privBytes = generateSecretKey();
    const pubHex = getPublicKey(privBytes);
    const privHex = bytesToHex(privBytes);
    return {
      privateKeyHex: privHex,
      publicKeyHex: pubHex,
    };
  }

  public async generateSymmetricKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  public async exportKeyHex(key: CryptoKey): Promise<string> {
    const raw = await window.crypto.subtle.exportKey('raw', key);
    return bytesToHex(new Uint8Array(raw));
  }

  public async importKeyHex(hex: string): Promise<CryptoKey> {
    const raw = hexToBytes(hex);
    return window.crypto.subtle.importKey(
      'raw',
      raw.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  public async encryptBytes(
    data: Uint8Array,
    key: CryptoKey
  ): Promise<EncryptedPayload> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      data.buffer as ArrayBuffer
    );

    return {
      ciphertext: new Uint8Array(encryptedBuffer),
      iv,
    };
  }

  public async decryptBytes(
    ciphertext: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      ciphertext.buffer as ArrayBuffer
    );

    return new Uint8Array(decryptedBuffer);
  }

  public async computeSha256(data: Uint8Array): Promise<string> {
    const hashBuffer = await window.crypto.subtle.digest(
      'SHA-256',
      data.buffer as ArrayBuffer
    );
    return bytesToHex(new Uint8Array(hashBuffer));
  }
}