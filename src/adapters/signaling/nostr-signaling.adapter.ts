import type { ISignalingTransport } from '@core/ports/output';
import type { SignalingPayload } from '@core/domain/models';
import { SimplePool } from 'nostr-tools/pool';
import type { Filter } from 'nostr-tools/filter';
import { generateSecretKey, finalizeEvent } from 'nostr-tools/pure';
import { hexToBytes } from 'nostr-tools/utils';
import * as nip44 from 'nostr-tools/nip44';

export class NostrSignalingAdapter implements ISignalingTransport {
  private pool: SimplePool | null = null;
  private relays: string[] = [];
  private hostPrivateKeyHex: string | null = null;

  constructor(hostPrivateKeyHex?: string) {
    this.hostPrivateKeyHex = hostPrivateKeyHex ?? null;
  }

  public setHostPrivateKey(privKeyHex: string): void {
    this.hostPrivateKeyHex = privKeyHex;
  }

  public async connect(relayUrls: string[]): Promise<void> {
    this.relays = relayUrls;
    if (!this.pool) {
      this.pool = new SimplePool();
    }
  }

  public async publish(
    recipientPublicKeyHex: string,
    payload: SignalingPayload
  ): Promise<void> {
    if (!this.pool || this.relays.length === 0) {
      throw new Error('Signaling pool is not connected to any relays.');
    }

    const senderPrivKey = generateSecretKey();
    const now = Math.floor(Date.now() / 1000);

    // 1. Rumor (Kind 14) containing encrypted media metadata
    const rumor = {
      kind: 14,
      created_at: now,
      tags: [['p', recipientPublicKeyHex]],
      content: JSON.stringify(payload),
    };

    // 2. Seal (Kind 13) encrypted to recipient with NIP-44
    const conversationKey = nip44.v2.utils.getConversationKey(
      senderPrivKey,
      recipientPublicKeyHex
    );
    const encryptedRumor = nip44.v2.encrypt(JSON.stringify(rumor), conversationKey);

    const seal = finalizeEvent(
      {
        kind: 13,
        created_at: now,
        tags: [],
        content: encryptedRumor,
      },
      senderPrivKey
    );

    // 3. Gift Wrap (Kind 1059) signed with an ephemeral throwaway key
    const wrapKey = generateSecretKey();
    const wrapConversationKey = nip44.v2.utils.getConversationKey(
      wrapKey,
      recipientPublicKeyHex
    );
    const encryptedSeal = nip44.v2.encrypt(JSON.stringify(seal), wrapConversationKey);

    const giftWrap = finalizeEvent(
      {
        kind: 1059,
        created_at: now,
        tags: [['p', recipientPublicKeyHex]],
        content: encryptedSeal,
      },
      wrapKey
    );

    await Promise.any(this.pool.publish(this.relays, giftWrap));
  }

  public async subscribe(
    recipientPublicKeyHex: string,
    sinceTimestamp: number,
    onSignal: (signal: SignalingPayload) => void
  ): Promise<() => void> {
    if (!this.pool || this.relays.length === 0) {
      throw new Error('Signaling pool is not connected to any relays.');
    }
    if (!this.hostPrivateKeyHex) {
      throw new Error('Host private key is required to unwrap incoming gift-wrapped signals.');
    }

    const hostPrivKeyBytes = hexToBytes(this.hostPrivateKeyHex);
    const filter: Filter = {
      kinds: [1059],
      '#p': [recipientPublicKeyHex],
      since: sinceTimestamp,
    };

    // Pass filter directly or as array depending on overload
    const sub = (this.pool as any).subscribeMany(this.relays, filter, {
      onevent: (event: any) => {
        try {
          // 1. Unwrap Gift Wrap (Kind 1059)
          const wrapConvKey = nip44.v2.utils.getConversationKey(
            hostPrivKeyBytes,
            event.pubkey
          );
          const decryptedSealJson = nip44.v2.decrypt(event.content, wrapConvKey);
          const seal = JSON.parse(decryptedSealJson);

          if (seal.kind !== 13) return;

          // 2. Decrypt Seal (Kind 13)
          const sealConvKey = nip44.v2.utils.getConversationKey(
            hostPrivKeyBytes,
            seal.pubkey
          );
          const decryptedRumorJson = nip44.v2.decrypt(seal.content, sealConvKey);
          const rumor = JSON.parse(decryptedRumorJson);

          if (rumor.kind !== 14) return;

          // 3. Parse SignalingPayload
          const signal: SignalingPayload = JSON.parse(rumor.content);
          if (signal.blobUrl && signal.encryptionKeyHex && signal.ivHex) {
            onSignal(signal);
          }
        } catch {
          // Discard invalid, corrupted, or non-decryptable wrap events safely
        }
      },
    });

    return () => {
      sub.close();
    };
  }

  public async disconnect(): Promise<void> {
    if (this.pool) {
      this.pool.close(this.relays);
      this.pool = null;
    }
  }
}