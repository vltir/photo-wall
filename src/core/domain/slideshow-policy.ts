export interface SlideshowPlaylistOptions {
  readonly randomFn?: () => number;
}

export class SlideshowPlaylist {
  private readonly activeIds: Set<string> = new Set();
  private playlist: string[] = [];
  private cursor = -1;
  private readonly random: () => number;

  constructor(initialIds: string[] = [], options?: SlideshowPlaylistOptions) {
    this.random = options?.randomFn ?? Math.random;
    for (const id of initialIds) {
      this.activeIds.add(id);
    }
    this.rebuildPlaylist();
  }

  public get size(): number {
    return this.activeIds.size;
  }

  public get currentId(): string | null {
    if (this.playlist.length === 0 || this.cursor < 0 || this.cursor >= this.playlist.length) {
      return null;
    }
    return this.playlist[this.cursor];
  }

  public next(): string | null {
    if (this.activeIds.size === 0) {
      return null;
    }

    this.cursor += 1;
    if (this.cursor >= this.playlist.length) {
      this.rebuildPlaylist();
      this.cursor = 0;
    }

    return this.playlist[this.cursor] ?? null;
  }

  public previous(): string | null {
    if (this.activeIds.size === 0) {
      return null;
    }

    this.cursor -= 1;
    if (this.cursor < 0) {
      this.cursor = this.playlist.length - 1;
    }

    return this.playlist[this.cursor] ?? null;
  }

  /**
   * Adds newly ingested photos.
   * If prioritize is true, inserts them immediately after the current cursor position
   * so they display in the very next slides.
   */
  public addItems(ids: string[], prioritize = true): void {
    const newUniqueIds = ids.filter((id) => !this.activeIds.has(id));
    if (newUniqueIds.length === 0) return;

    for (const id of newUniqueIds) {
      this.activeIds.add(id);
    }

    if (this.playlist.length === 0) {
      this.rebuildPlaylist();
      this.cursor = -1;
      return;
    }

    if (prioritize) {
      const insertAt = this.cursor + 1;
      this.playlist.splice(insertAt, 0, ...newUniqueIds);
    } else {
      this.playlist.push(...newUniqueIds);
    }
  }

  public removeItem(id: string): void {
    if (!this.activeIds.has(id)) return;
    this.activeIds.delete(id);

    const index = this.playlist.indexOf(id);
    if (index !== -1) {
      this.playlist.splice(index, 1);
      if (index <= this.cursor && this.cursor > -1) {
        this.cursor -= 1;
      }
    }
  }

  public clear(): void {
    this.activeIds.clear();
    this.playlist = [];
    this.cursor = -1;
  }

  private rebuildPlaylist(): void {
    const items = Array.from(this.activeIds);
    // In-place Fisher-Yates shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      const temp = items[i];
      items[i] = items[j];
      items[j] = temp;
    }
    this.playlist = items;
  }
}