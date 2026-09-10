import type { IRoomHostService, IImageUploaderService } from '@core/ports/input';
import type { NostrSignalingAdapter } from '@adapters/signaling/nostr-signaling.adapter';

export interface AppServices {
  readonly hostService: IRoomHostService;
  readonly uploaderService: IImageUploaderService;
  readonly signalingAdapter: NostrSignalingAdapter;
}