// src/tests/unit/slideshow-policy.test.ts
import { describe, expect, it } from 'vitest';
import { SlideshowPlaylist } from '@core/domain/slideshow-policy';

describe('SlideshowPlaylist Policy', () => {
  it('cycles through all items before repeating', () => {
    const items = ['img1', 'img2', 'img3'];
    const playlist = new SlideshowPlaylist(items);

    const firstCycle = [playlist.next(), playlist.next(), playlist.next()];
    expect(firstCycle).toHaveLength(3);
    expect(new Set(firstCycle).size).toBe(3);
    expect(firstCycle).toEqual(expect.arrayContaining(items));

    const secondCycleFirstItem = playlist.next();
    expect(items).toContain(secondCycleFirstItem);
  });

  it('immediately incorporates newly prioritized items after current cursor', () => {
    const playlist = new SlideshowPlaylist(['a', 'b', 'c']);
    const current = playlist.next();
    expect(current).not.toBeNull();

    playlist.addItems(['incoming_urgent'], true);

    const nextItem = playlist.next();
    expect(nextItem).toBe('incoming_urgent');
  });

  it('removes deleted items immediately from upcoming cycle', () => {
    const playlist = new SlideshowPlaylist(['item1', 'item2']);
    playlist.removeItem('item1');

    expect(playlist.size).toBe(1);
    expect(playlist.next()).toBe('item2');
    expect(playlist.next()).toBe('item2');
  });

  it('returns null safely when playlist is empty', () => {
    const playlist = new SlideshowPlaylist([]);
    expect(playlist.next()).toBeNull();
    expect(playlist.previous()).toBeNull();
  });
});