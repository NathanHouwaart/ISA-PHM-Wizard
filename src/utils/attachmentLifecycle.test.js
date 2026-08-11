import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupAttachmentRefs,
  collectAttachmentRefs,
  getAttachmentCommitCleanup,
  getAttachmentRollbackCleanup,
  mergeAttachmentRefs,
  subtractAttachmentRefs
} from './attachmentLifecycle';
import { deleteDatasheetFile } from './datasheetStore';
import { deleteImageFile } from './imageStore';

vi.mock('./datasheetStore', () => ({ deleteDatasheetFile: vi.fn() }));
vi.mock('./imageStore', () => ({ deleteImageFile: vi.fn() }));

describe('attachment lifecycle helpers', () => {
  beforeEach(() => {
    deleteDatasheetFile.mockReset();
    deleteImageFile.mockReset();
  });

  it('collects nested datasheet and image references', () => {
    const refs = collectAttachmentRefs({
      images: [{ attachmentId: 'image-1' }],
      characteristics: [{ datasheet: { attachmentId: 'sheet-1' } }],
      sensorTypes: [{ datasheet: { attachmentId: 'sheet-2', notAvailable: true } }],
    });

    expect([...refs.images]).toEqual(['image-1']);
    expect([...refs.datasheets]).toEqual(['sheet-1']);
  });

  it('derives removed and abandoned attachments without touching retained ones', () => {
    const seen = collectAttachmentRefs({
      images: [{ attachmentId: 'saved' }, { attachmentId: 'new' }, { attachmentId: 'abandoned' }],
    });
    const retained = collectAttachmentRefs({
      images: [{ attachmentId: 'saved' }, { attachmentId: 'new' }],
    });
    const removed = subtractAttachmentRefs(seen, retained);
    mergeAttachmentRefs(removed, collectAttachmentRefs({ characteristics: [
      { datasheet: { attachmentId: 'old-sheet' } },
    ] }));

    expect([...removed.images]).toEqual(['abandoned']);
    expect([...removed.datasheets]).toEqual(['old-sheet']);
  });

  it('deletes each attachment from its correct store', async () => {
    await cleanupAttachmentRefs({
      datasheets: new Set(['sheet-1']),
      images: new Set(['image-1']),
    });

    expect(deleteDatasheetFile).toHaveBeenCalledWith('sheet-1');
    expect(deleteImageFile).toHaveBeenCalledWith('image-1');
  });

  it('keeps saved files on rollback and removes only files staged during editing', () => {
    const initial = collectAttachmentRefs({ images: [{ attachmentId: 'saved' }] });
    const seen = collectAttachmentRefs({
      images: [{ attachmentId: 'saved' }, { attachmentId: 'staged' }],
    });

    expect([...getAttachmentRollbackCleanup(initial, seen).images]).toEqual(['staged']);
  });

  it('cleans replaced saved files and abandoned staged files after commit', () => {
    const initial = collectAttachmentRefs({ images: [{ attachmentId: 'old' }] });
    const seen = collectAttachmentRefs({
      images: [
        { attachmentId: 'old' },
        { attachmentId: 'abandoned' },
        { attachmentId: 'replacement' },
      ],
    });
    const finalRefs = collectAttachmentRefs({ images: [{ attachmentId: 'replacement' }] });

    expect([...getAttachmentCommitCleanup(initial, seen, finalRefs).images]).toEqual([
      'old',
      'abandoned',
    ]);
  });
});
