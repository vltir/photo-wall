import type { IArchivePacker } from '@core/ports/output';
import type { ArchiveFileEntry } from '@core/domain/models';
import { zipSync, type Zippable } from 'fflate';

export class FflatePackerAdapter implements IArchivePacker {
  public async packZip(files: ArchiveFileEntry[]): Promise<Uint8Array> {
    const archiveTree: Zippable = {};

    for (const file of files) {
      archiveTree[file.filename] = file.data;
    }

    // Synchronous in-memory packing (zero-copy buffer allocation)
    return zipSync(archiveTree, { level: 6 });
  }
}