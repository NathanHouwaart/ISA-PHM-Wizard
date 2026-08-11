import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupAttachmentRefs,
  cleanupUnreferencedAttachmentRefs,
  collectAttachmentRefs,
  getAttachmentCommitCleanup,
  getAttachmentRollbackCleanup,
  garbageCollectOrphanedAttachments,
  mergeAttachmentRefs,
  subtractAttachmentRefs
} from './attachmentLifecycle';
import { deleteDatasheetFile, getAllDatasheetFiles } from './datasheetStore';
import { deleteImageFile, getAllImageFiles } from './imageStore';

vi.mock('./datasheetStore', () => ({
  deleteDatasheetFile: vi.fn(),
  getAllDatasheetFiles: vi.fn(),
}));
vi.mock('./imageStore', () => ({
  deleteImageFile: vi.fn(),
  getAllImageFiles: vi.fn(),
}));

describe('attachment lifecycle helpers', () => {
  beforeEach(() => {
    deleteDatasheetFile.mockReset();
    deleteImageFile.mockReset();
    getAllDatasheetFiles.mockReset();
    getAllImageFiles.mockReset();
    window.localStorage.clear();
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

  it('does not delete a candidate still referenced by another retained object', async () => {
    const candidates = collectAttachmentRefs({ images: [{ attachmentId: 'shared-image' }] });

    const deleted = await cleanupUnreferencedAttachmentRefs(candidates, [{
      images: [{ attachmentId: 'shared-image' }],
    }]);

    expect([...deleted.images]).toEqual([]);
    expect(deleteImageFile).not.toHaveBeenCalled();
  });

  it('protects references persisted by another project', async () => {
    window.localStorage.setItem(
      'globalAppData_other-project_configurationTypes',
      JSON.stringify([{ datasheet: { attachmentId: 'shared-sheet' } }])
    );
    const candidates = collectAttachmentRefs({
      characteristics: [{ datasheet: { attachmentId: 'shared-sheet' } }],
    });

    await cleanupUnreferencedAttachmentRefs(candidates);

    expect(deleteDatasheetFile).not.toHaveBeenCalled();
  });

  it('can ignore stale state for the project currently being committed', async () => {
    window.localStorage.setItem(
      'globalAppData_current-project_configurationTypes',
      JSON.stringify([{ datasheet: { attachmentId: 'old-sheet' } }])
    );
    const candidates = collectAttachmentRefs({
      characteristics: [{ datasheet: { attachmentId: 'old-sheet' } }],
    });

    await cleanupUnreferencedAttachmentRefs(candidates, [], {
      excludeProjectIds: ['current-project'],
    });

    expect(deleteDatasheetFile).toHaveBeenCalledWith('old-sheet');
  });

  it('garbage collects only files with no persisted references', async () => {
    window.localStorage.setItem(
      'globalAppData_testSetups',
      JSON.stringify([{ images: [{ attachmentId: 'kept-image' }] }])
    );
    window.localStorage.setItem(
      'globalAppData_project-1_configurationTypes',
      JSON.stringify([{ datasheet: { attachmentId: 'kept-sheet' } }])
    );
    getAllDatasheetFiles.mockResolvedValue([
      { id: 'kept-sheet', updatedAt: 100 },
      { id: 'orphan-sheet', updatedAt: 100 },
      { id: 'recent-sheet', updatedAt: 950 },
    ]);
    getAllImageFiles.mockResolvedValue([
      { id: 'kept-image', updatedAt: 100 },
      { id: 'orphan-image', updatedAt: 100 },
    ]);

    const removed = await garbageCollectOrphanedAttachments({ now: 1000, gracePeriodMs: 100 });

    expect([...removed.datasheets]).toEqual(['orphan-sheet']);
    expect([...removed.images]).toEqual(['orphan-image']);
    expect(deleteDatasheetFile).toHaveBeenCalledWith('orphan-sheet');
    expect(deleteImageFile).toHaveBeenCalledWith('orphan-image');
    expect(deleteDatasheetFile).not.toHaveBeenCalledWith('kept-sheet');
    expect(deleteDatasheetFile).not.toHaveBeenCalledWith('recent-sheet');
    expect(deleteImageFile).not.toHaveBeenCalledWith('kept-image');
  });
});
