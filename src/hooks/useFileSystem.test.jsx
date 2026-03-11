import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useFileSystem } from './useFileSystem';
import { directoryOpen } from 'browser-fs-access';

// Mock browser-fs-access
vi.mock('browser-fs-access', () => ({
  directoryOpen: vi.fn(),
}));

describe('useFileSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.showDirectoryPicker mock
    delete window.showDirectoryPicker;
  });

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useFileSystem());

      expect(result.current.loading).toBe(false);
      expect(result.current.progress).toBeNull();
    });

    it('should detect native API support in Chromium', () => {
      window.showDirectoryPicker = vi.fn();
      
      const { result } = renderHook(() => useFileSystem());

      expect(result.current.isNativeSupported).toBe(true);
    });

    it('should detect lack of native API support in non-Chromium', () => {
      const { result } = renderHook(() => useFileSystem());

      expect(result.current.isNativeSupported).toBe(false);
    });
  });

  describe('Directory Indexing - browser-fs-access', () => {
    it('should successfully index a small directory', async () => {
      const mockFiles = [
        { name: 'file1.txt', webkitRelativePath: 'root/file1.txt' },
        { name: 'file2.txt', webkitRelativePath: 'root/file2.txt' },
      ];

      directoryOpen.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileSystem());

      let dataset;
      await act(async () => {
        dataset = await result.current.pickAndIndexDirectory();
      });

      expect(dataset).toBeTruthy();
      expect(dataset.rootName).toBe('root');
      // Tree should NOT include the root folder itself, just its contents
      expect(dataset.tree).toHaveLength(2);
      expect(dataset.tree[0].name).toBe('file1.txt');
      expect(dataset.tree[1].name).toBe('file2.txt');
    });

    it('should set loading state during indexing', async () => {
      const mockFiles = [
        { name: 'file1.txt', webkitRelativePath: 'root/file1.txt' },
      ];

      directoryOpen.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileSystem());

      let promise;
      act(() => {
        promise = result.current.pickAndIndexDirectory();
      });

      // Should be loading immediately
      expect(result.current.loading).toBe(true);

      await act(async () => {
        await promise;
      });

      // Should not be loading after completion (after timeout)
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 2000 });
    });

    it('should report progress updates', async () => {
      const mockFiles = Array.from({ length: 1000 }, (_, i) => ({
        name: `file${i}.txt`,
        webkitRelativePath: `root/file${i}.txt`,
      }));

      directoryOpen.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileSystem());

      const progressUpdates = [];
      
      await act(async () => {
        await result.current.pickAndIndexDirectory((_progress) => {
          progressUpdates.push({ ...result.current.progress });
        });
      });

      // Should have had progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Final progress should be 100%
      expect(result.current.progress.percent).toBe(100);
    });

    it('should handle user cancellation gracefully', async () => {
      directoryOpen.mockResolvedValue([]);

      const { result } = renderHook(() => useFileSystem());

      let dataset;
      await act(async () => {
        dataset = await result.current.pickAndIndexDirectory();
      });

      expect(dataset).toBeNull();
    });

    it('should handle AbortError gracefully', async () => {
      const abortError = new Error('User aborted');
      abortError.name = 'AbortError';
      directoryOpen.mockRejectedValue(abortError);

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await expect(result.current.pickAndIndexDirectory()).resolves.toBeNull();
      });
    });

    it('should build nested directory structure correctly', async () => {
      const mockFiles = [
        { name: 'file1.txt', webkitRelativePath: 'root/file1.txt' },
        { name: 'file2.txt', webkitRelativePath: 'root/sub/file2.txt' },
        { name: 'file3.txt', webkitRelativePath: 'root/sub/deep/file3.txt' },
      ];

      directoryOpen.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileSystem());

      let dataset;
      await act(async () => {
        dataset = await result.current.pickAndIndexDirectory();
      });

      // Should have file1.txt and sub/ at the root level (no 'root' folder)
      expect(dataset.tree).toHaveLength(2); // file1.txt and sub/
      
      const subDir = dataset.tree.find(n => n.name === 'sub');
      expect(subDir).toBeTruthy();
      expect(subDir.isDirectory).toBe(true);
      expect(subDir.children).toHaveLength(2); // file2.txt and deep/
      
      const deepDir = subDir.children.find(n => n.name === 'deep');
      expect(deepDir).toBeTruthy();
      expect(deepDir.children).toHaveLength(1); // file3.txt
    });

    it('should sort directories before files', async () => {
      const mockFiles = [
        { name: 'zfile.txt', webkitRelativePath: 'root/zfile.txt' },
        { name: 'afile.txt', webkitRelativePath: 'root/afile.txt' },
        { name: 'file.txt', webkitRelativePath: 'root/bdir/file.txt' },
      ];

      directoryOpen.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileSystem());

      let dataset;
      await act(async () => {
        dataset = await result.current.pickAndIndexDirectory();
      });

      // Directory should come before files (no root folder in tree)
      expect(dataset.tree[0].isDirectory).toBe(true);
      expect(dataset.tree[0].name).toBe('bdir');
      
      // Files should be alphabetically sorted after directories
      expect(dataset.tree[1].name).toBe('afile.txt');
      expect(dataset.tree[2].name).toBe('zfile.txt');
    });
  });

  describe('Directory Indexing - Native API', () => {
    it('should use native API when available', async () => {
      const mockEntries = new Map([
        ['file1.txt', { kind: 'file', name: 'file1.txt' }],
        ['file2.txt', { kind: 'file', name: 'file2.txt' }],
      ]);

      const mockRootHandle = {
        name: 'TestRoot',
        entries: async function* () {
          for (const [name, handle] of mockEntries) {
            yield [name, handle];
          }
        },
      };

      window.showDirectoryPicker = vi.fn().mockResolvedValue(mockRootHandle);

      const { result } = renderHook(() => useFileSystem());

      let dataset;
      await act(async () => {
        dataset = await result.current.pickAndIndexDirectory();
      });

      expect(dataset).toBeTruthy();
      expect(dataset.rootName).toBe('TestRoot');
      expect(window.showDirectoryPicker).toHaveBeenCalled();
    });

    it('should fallback to browser-fs-access if native fails', async () => {
      window.showDirectoryPicker = vi.fn().mockRejectedValue(
        new Error('Native API failed')
      );

      const mockFiles = [
        { name: 'file1.txt', webkitRelativePath: 'root/file1.txt' },
      ];
      directoryOpen.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileSystem());

      let dataset;
      await act(async () => {
        dataset = await result.current.pickAndIndexDirectory();
      });

      expect(dataset).toBeTruthy();
      expect(dataset.rootName).toBe('root');
      expect(directoryOpen).toHaveBeenCalled();
    });

    it('should handle user cancellation of native picker', async () => {
      window.showDirectoryPicker = vi.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useFileSystem());

      let dataset;
      await act(async () => {
        dataset = await result.current.pickAndIndexDirectory();
      });

      expect(dataset).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should propagate NotFoundError', async () => {
      const notFoundError = new Error('File not found');
      notFoundError.name = 'NotFoundError';
      directoryOpen.mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await expect(result.current.pickAndIndexDirectory()).rejects.toThrow(
          'File not found'
        );
      });
    });

    it('should propagate NotAllowedError', async () => {
      const permError = new Error('Permission denied');
      permError.name = 'NotAllowedError';
      directoryOpen.mockRejectedValue(permError);

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await expect(result.current.pickAndIndexDirectory()).rejects.toThrow(
          'Permission denied'
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty directory', async () => {
      const mockFiles = [
        { name: '.gitkeep', webkitRelativePath: 'empty/.gitkeep' },
      ];

      directoryOpen.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileSystem());

      let dataset;
      await act(async () => {
        dataset = await result.current.pickAndIndexDirectory();
      });

      expect(dataset).toBeTruthy();
      expect(dataset.tree).toHaveLength(1);
    });

    it('should handle files with special characters', async () => {
      const mockFiles = [
        { name: 'file (1).txt', webkitRelativePath: 'root/file (1).txt' },
        { name: 'file [2].txt', webkitRelativePath: 'root/file [2].txt' },
        { name: 'file #3.txt', webkitRelativePath: 'root/file #3.txt' },
      ];

      directoryOpen.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileSystem());

      let dataset;
      await act(async () => {
        dataset = await result.current.pickAndIndexDirectory();
      });

      // Should have 3 files at root level (no extra root folder)
      expect(dataset.tree).toHaveLength(3);
      expect(dataset.tree.map(n => n.name)).toContain('file (1).txt');
      expect(dataset.tree.map(n => n.name)).toContain('file [2].txt');
      expect(dataset.tree.map(n => n.name)).toContain('file #3.txt');
    });

    it('should skip problematic files and continue', async () => {
      const mockFiles = [
        { name: 'good1.txt', webkitRelativePath: 'root/good1.txt' },
        // Simulate a file that throws during processing
        { 
          get name() { throw new Error('Access denied'); },
          webkitRelativePath: 'root/bad.txt' 
        },
        { name: 'good2.txt', webkitRelativePath: 'root/good2.txt' },
      ];

      directoryOpen.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileSystem());

      let dataset;
      await act(async () => {
        dataset = await result.current.pickAndIndexDirectory();
      });

      // Should have indexed the good files despite the error
      expect(dataset).toBeTruthy();
      expect(dataset.tree.length).toBeGreaterThan(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset loading and progress state', async () => {
      const mockFiles = [
        { name: 'file1.txt', webkitRelativePath: 'root/file1.txt' },
      ];

      directoryOpen.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.pickAndIndexDirectory();
      });

      // Wait for loading to finish
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 2000 });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.progress).toBeNull();
    });
  });
});
