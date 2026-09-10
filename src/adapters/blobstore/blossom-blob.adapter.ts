import type { IBlobStoreTransport } from '@core/ports/output';
import { generateSecretKey, finalizeEvent } from 'nostr-tools/pure';
import { bytesToHex } from 'nostr-tools/utils';

export class BlossomBlobAdapter implements IBlobStoreTransport {
  public async uploadBlob(
    serverUrl: string,
    encryptedBytes: Uint8Array
  ): Promise<string> {
    const cleanServerUrl = serverUrl.replace(/\/+$/, '');

    // 1. Calculate SHA-256 of encrypted bytes for BUD-11 authorization
    const hashBuffer = await window.crypto.subtle.digest(
      'SHA-256',
      encryptedBytes.buffer as ArrayBuffer
    );
    const hashHex = bytesToHex(new Uint8Array(hashBuffer));

    // 2. Senders create a throwaway ephemeral key to sign the BUD-11 auth event
    const ephemeralPrivKey = generateSecretKey();
    const now = Math.floor(Date.now() / 1000);

    const authEvent = finalizeEvent(
      {
        kind: 24242,
        created_at: now,
        tags: [
          ['t', 'upload'],
          ['x', hashHex],
          ['expiration', (now + 300).toString()],
        ],
        content: 'Authorize Blossom Blob Upload',
      },
      ephemeralPrivKey
    );

    const authHeader = `Nostr ${btoa(JSON.stringify(authEvent))}`;

    // 3. Perform PUT /upload with raw binary ciphertext
    const response = await fetch(`${cleanServerUrl}/upload`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/octet-stream',
      },
      body: encryptedBytes.buffer as ArrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Blossom upload failed with status ${response.status}: ${errorText}`
      );
    }

    const payload = await response.json();
    return payload.url || `${cleanServerUrl}/${payload.sha256 || hashHex}`;
  }

  public async downloadBlob(url: string): Promise<Uint8Array> {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to download blob from ${url} (status: ${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
}