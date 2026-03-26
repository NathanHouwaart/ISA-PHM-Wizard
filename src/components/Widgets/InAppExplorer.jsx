import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import TooltipButton from './TooltipButton';
import { File, Folder } from 'lucide-react';
import { useProjectActions, useProjectData } from '../../contexts/GlobalDataContext';

const NATURAL_SORT_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareNodesNaturally(a, b) {
  if (a.isDirectory && !b.isDirectory) return -1;
  if (!a.isDirectory && b.isDirectory) return 1;
  return NATURAL_SORT_COLLATOR.compare(a.name || '', b.name || '');
}

function comparePathsNaturally(a, b) {
  return NATURAL_SORT_COLLATOR.compare(a || '', b || '');
}

function findNodeByPath(nodes, path) {
  if (path === '') return { children: nodes };
  for (const node of nodes || []) {
    if (node.relPath === path) return node;
    if (node.isDirectory) {
      const found = findNodeByPath(node.children || [], path);
      if (found) return found;
    }
  }
  return null;
}

/**
 * InAppExplorer - File browser overlay for selecting files from indexed dataset
 *
 * Pure presentational component that follows the standard overlay pattern.
 * Parent controls visibility and receives selection via onSelect callback.
 *
 * @param {function} onClose - Called when user cancels (no selection)
 * @param {function} onSelect - Called when user confirms selection (array of file objects)
 */
const InAppExplorer = ({ onClose, onSelect }) => {
  const { selectedDataset } = useProjectData();
  const { loadDatasetSubtree } = useProjectActions();

  const [currentPath, setCurrentPath] = useState('');
  const [pathStack, setPathStack] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [dragBox, setDragBox] = useState(null);
  const [expandingSelection, setExpandingSelection] = useState(false);
  const [selectionPreview, setSelectionPreview] = useState({
    status: 'idle',
    totalFiles: 0,
    samplePaths: [],
    emptyFolders: [],
  });
  const [selectionError, setSelectionError] = useState('');

  const containerRef = useRef(null);
  const fileRefs = useRef({});
  const mouseDownRef = useRef({ down: false, x: 0, y: 0 });
  const previewRequestIdRef = useRef(0);

  const tree = useMemo(() => selectedDataset?.tree || [], [selectedDataset]);
  const currentNode = useMemo(() => {
    if (currentPath === '') {
      return { children: tree };
    }
    return findNodeByPath(tree, currentPath);
  }, [tree, currentPath]);
  const nodesToShow = useMemo(
    () => (currentNode?.children ? [...currentNode.children].sort(compareNodesNaturally) : []),
    [currentNode]
  );
  const nodesByRelPath = useMemo(() => {
    const map = new Map();
    nodesToShow.forEach((node) => map.set(node.relPath, node));
    return map;
  }, [nodesToShow]);
  const selectionBreakdown = useMemo(() => {
    let folders = 0;
    for (const relPath of selectedFiles) {
      const node = nodesByRelPath.get(relPath) || findNodeByPath(tree, relPath);
      if (node?.isDirectory) folders += 1;
    }
    return {
      files: Math.max(0, selectedFiles.length - folders),
      folders
    };
  }, [selectedFiles, nodesByRelPath, tree]);
  const hasItems = Array.isArray(tree) && tree.length > 0;

  async function enterFolder(relPath) {
    const node = nodesByRelPath.get(relPath) || findNodeByPath(tree, relPath);
    const shouldLoadSubtree = !node
      || (node.isDirectory && (node.childrenLoaded === false || !Array.isArray(node.children)));

    try {
      // Load only when the directory node is a lazy stub or missing from in-memory tree.
      if (shouldLoadSubtree && typeof loadDatasetSubtree === 'function') {
        await loadDatasetSubtree(relPath);
      }
    } catch (err) {
      console.warn('[InAppExplorer] enterFolder loadDatasetSubtree failed', err);
    } finally {
      setPathStack((stack) => (currentPath && currentPath !== '' ? [...stack, currentPath] : stack));
      setCurrentPath(relPath);
      setSelectedFiles([]);
      setLastSelectedIndex(null);
    }
  }

  function goBack() {
    if (pathStack.length === 0) {
      if (currentPath && currentPath !== '') {
        setCurrentPath('');
        setSelectedFiles([]);
        setLastSelectedIndex(null);
      }
      return;
    }
    const last = pathStack[pathStack.length - 1];
    setPathStack((stack) => stack.slice(0, -1));
    setCurrentPath(last);
    setSelectedFiles([]);
    setLastSelectedIndex(null);
  }

  function goToBreadcrumb(index) {
    const newPath = index === 0 ? '' : pathStack[index - 1];
    setPathStack(pathStack.slice(0, index));
    setCurrentPath(newPath);
    setSelectedFiles([]);
    setLastSelectedIndex(null);
  }

  // Selection logic
  function toggleNode(node, event) {
    if (expandingSelection) return;

    const currentIndex = nodesToShow.findIndex((n) => n.relPath === node.relPath);
    let newSelected = [...selectedFiles];

    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      for (let i = start; i <= end; i++) {
        const relPath = nodesToShow[i].relPath;
        if (!newSelected.includes(relPath)) newSelected.push(relPath);
      }
    } else if (event.ctrlKey || event.metaKey) {
      if (newSelected.includes(node.relPath)) {
        newSelected = newSelected.filter((f) => f !== node.relPath);
      } else {
        newSelected.push(node.relPath);
      }
      setLastSelectedIndex(currentIndex);
    } else {
      newSelected = [node.relPath];
      setLastSelectedIndex(currentIndex);
    }

    setSelectedFiles(newSelected);
  }

  // Drag selection (small threshold)
  function startDrag(e) {
    if (expandingSelection) return;
    if (e.button !== 0) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseDownRef.current = {
      down: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top + containerRef.current.scrollTop,
    };
    setDragBox({
      x1: mouseDownRef.current.x,
      y1: mouseDownRef.current.y,
      x2: mouseDownRef.current.x,
      y2: mouseDownRef.current.y
    });
  }

  function moveDrag(e) {
    if (expandingSelection) return;
    if (!mouseDownRef.current.down) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;

    if (!dragging) {
      const dx = Math.abs(x - mouseDownRef.current.x);
      const dy = Math.abs(y - mouseDownRef.current.y);
      if (dx < 5 && dy < 5) return;
      setDragging(true);
    }

    setDragBox((box) => ({ ...box, x2: x, y2: y }));
  }

  function endDrag() {
    if (expandingSelection) return;

    mouseDownRef.current.down = false;

    if (!dragging || !dragBox) {
      setDragging(false);
      setDragBox(null);
      return;
    }

    const minY = Math.min(dragBox.y1, dragBox.y2);
    const maxY = Math.max(dragBox.y1, dragBox.y2);

    const selected = [];
    Object.keys(fileRefs.current).forEach((relPath) => {
      const el = fileRefs.current[relPath];
      if (!el) return;
      const offsetTop = el.offsetTop;
      const offsetHeight = el.offsetHeight;
      if (offsetTop < maxY && offsetTop + offsetHeight > minY) selected.push(relPath);
    });

    setSelectedFiles(selected);
    setDragging(false);
    setDragBox(null);
  }

  const collectFilesRecursively = useCallback(async function walk(node, visited = new Set()) {
    if (!node || !node.isDirectory) return [];

    const dirPath = node.relPath || '';
    if (visited.has(dirPath)) return [];
    visited.add(dirPath);

    let directoryNode = node;
    const needsLoad = directoryNode.childrenLoaded === false || !Array.isArray(directoryNode.children);
    if (needsLoad && typeof loadDatasetSubtree === 'function' && dirPath !== '') {
      try {
        const loadedNode = await loadDatasetSubtree(dirPath);
        if (loadedNode) directoryNode = loadedNode;
      } catch (err) {
        console.warn('[InAppExplorer] collectFilesRecursively loadDatasetSubtree failed', err);
      }
    }

    const children = Array.isArray(directoryNode.children)
      ? [...directoryNode.children].sort(compareNodesNaturally)
      : [];

    const files = [];
    for (const child of children) {
      if (!child) continue;
      if (child.isDirectory) {
        const nestedFiles = await walk(child, visited);
        files.push(...nestedFiles);
      } else if (child.relPath) {
        files.push(child.relPath);
      }
    }

    return files;
  }, [loadDatasetSubtree]);

  const resolveSelectionPaths = useCallback(async (relPaths = []) => {
    const expandedPaths = [];
    const emptyFolders = [];

    for (const relPath of relPaths) {
      let node = nodesByRelPath.get(relPath) || findNodeByPath(tree, relPath);
      if (!node && typeof loadDatasetSubtree === 'function') {
        try {
          node = await loadDatasetSubtree(relPath);
        } catch (err) {
          console.warn('[InAppExplorer] resolveSelectionPaths loadDatasetSubtree failed', err);
        }
      }

      if (!node) {
        expandedPaths.push(relPath);
        continue;
      }

      if (node.isDirectory) {
        const folderFiles = await collectFilesRecursively(node, new Set());
        if (folderFiles.length === 0) {
          emptyFolders.push(node.relPath || relPath);
        }
        expandedPaths.push(...folderFiles);
      } else {
        expandedPaths.push(node.relPath || relPath);
      }
    }

    const uniquePaths = [...new Set(expandedPaths)].sort(comparePathsNaturally);
    return {
      paths: uniquePaths,
      samplePaths: uniquePaths.slice(0, 5),
      emptyFolders,
    };
  }, [nodesByRelPath, tree, loadDatasetSubtree, collectFilesRecursively]);

  useEffect(() => {
    setSelectionError('');
  }, [selectedFiles]);

  useEffect(() => {
    if (!selectedFiles.length) {
      setSelectionPreview({
        status: 'idle',
        totalFiles: 0,
        samplePaths: [],
        emptyFolders: [],
      });
      return;
    }

    const hasFolderSelection = selectedFiles.some((relPath) => {
      const node = nodesByRelPath.get(relPath) || findNodeByPath(tree, relPath);
      return Boolean(node?.isDirectory);
    });

    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;

    setSelectionPreview((prev) => ({
      ...prev,
      status: hasFolderSelection ? 'loading' : 'ready',
    }));

    (async () => {
      if (!hasFolderSelection) {
        const unique = [...new Set(selectedFiles)].sort(comparePathsNaturally);
        if (previewRequestIdRef.current !== requestId) return;
        setSelectionPreview({
          status: 'ready',
          totalFiles: unique.length,
          samplePaths: unique.slice(0, 5),
          emptyFolders: [],
        });
        return;
      }

      const resolved = await resolveSelectionPaths(selectedFiles);
      if (previewRequestIdRef.current !== requestId) return;

      setSelectionPreview({
        status: 'ready',
        totalFiles: resolved.paths.length,
        samplePaths: resolved.samplePaths,
        emptyFolders: resolved.emptyFolders,
      });
    })();
  }, [selectedFiles, nodesByRelPath, tree, resolveSelectionPaths]);

  async function handleConfirm() {
    if (!hasItems) {
      onClose();
      return;
    }
    if (expandingSelection) return;

    setExpandingSelection(true);
    let resolvedSelection = null;
    try {
      const resolved = await resolveSelectionPaths(selectedFiles);
      if (selectedFiles.length > 0 && resolved.paths.length === 0) {
        setSelectionError('No files found inside the selected folder(s).');
        return;
      }

      const uniquePaths = resolved.paths;
      const fileLike = uniquePaths.map((rel) => ({
        name: rel.split('/').pop(),
        webkitRelativePath: rel
      }));
      const prefixed = fileLike.map((file) => ({
        ...file,
        webkitRelativePath: selectedDataset && selectedDataset.rootName
          ? `./${file.webkitRelativePath}`
          : file.webkitRelativePath
      }));

      resolvedSelection = prefixed;
    } finally {
      setExpandingSelection(false);
    }

    if (resolvedSelection !== null) {
      onSelect(resolvedSelection);
      onClose();
    }
  }

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      setSelectedFiles([]);
      setCurrentPath('');
      setPathStack([]);
    };
  }, []);

  const rootName = selectedDataset?.rootName || 'Root';
  const previewHasNoFiles = selectedFiles.length > 0
    && selectionPreview.status === 'ready'
    && selectionPreview.totalFiles === 0;
  const confirmDisabled = expandingSelection || !hasItems || previewHasNoFiles;
  const confirmTooltipText = previewHasNoFiles
    ? 'Selected folders contain no files'
    : (expandingSelection ? 'Expanding selected folders...' : 'Confirm selection and close');

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-[800px] h-[600px] rounded-lg flex flex-col overflow-hidden p-4">
        <div className="py-2 border-b border-gray-200 flex items-center">
          <div>
            <TooltipButton
              onClick={goBack}
              tooltipText="Go up one level"
              disabled={expandingSelection || !hasItems || (currentPath === '' && pathStack.length === 0)}
            >
              Back
            </TooltipButton>
          </div>
          <div className="ml-3 flex flex-wrap items-center">
            <span className="cursor-pointer underline" onClick={() => goToBreadcrumb(0)}>{rootName}</span>
            {pathStack.map((p, i) => (
              <span key={i} className="inline-flex items-center">
                <span className="mx-2">/</span>
                <span className="cursor-pointer underline" onClick={() => goToBreadcrumb(i + 1)}>{p.split('/').pop()}</span>
              </span>
            ))}
            {currentPath && (
              <span className="inline-flex items-center">
                <span className="mx-2">/</span>
                <span>{currentPath.split('/').pop()}</span>
              </span>
            )}
          </div>
          <div className="ml-4 flex items-center gap-3">
            <div className="text-sm text-gray-600">Selected</div>
            <div className="inline-flex items-center px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">{selectedFiles.length}</div>
            {selectedFiles.length > 0 && (
              <div className="text-xs text-gray-500">
                {selectionBreakdown.files} files, {selectionBreakdown.folders} folders
                {selectionBreakdown.folders > 0 && selectionPreview.status === 'loading' ? ' • previewing folders...' : null}
                {selectionBreakdown.folders > 0 && selectionPreview.status === 'ready' ? ` • ${selectionPreview.totalFiles} files to assign` : null}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TooltipButton
              tooltipText="Cancel and close without selecting"
              className="bg-gray-200 text-gray-800 hover:bg-gray-300"
              onClick={onClose}
              disabled={expandingSelection}
            >
              Cancel
            </TooltipButton>
            <TooltipButton
              tooltipText={confirmTooltipText}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
              onClick={handleConfirm}
              disabled={confirmDisabled}
            >
              {expandingSelection ? 'Expanding...' : 'OK'}
            </TooltipButton>
          </div>
        </div>

        {!hasItems ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <Folder className="w-12 h-12 text-gray-300" aria-hidden />
              </div>
              <p className="text-lg font-semibold text-gray-800">No dataset indexed</p>
              <p className="mt-2 text-sm text-gray-600 max-w-[480px]">
                There are no indexed files to show. Go to the project settings to index a dataset folder containing your measurement files.
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            onMouseDown={startDrag}
            onMouseMove={moveDrag}
            onMouseUp={endDrag}
            className={`flex-1 overflow-y-auto p-2 relative ${expandingSelection ? 'pointer-events-none opacity-80' : ''}`}
          >
            {nodesToShow.map((node) => (
              <div
                key={node.relPath}
                ref={(el) => { fileRefs.current[node.relPath] = el; }}
                onDoubleClick={() => node.isDirectory && enterFolder(node.relPath)}
                onClick={(e) => toggleNode(node, e)}
                className={`p-2 my-1 rounded-md flex items-center cursor-pointer select-none ${selectedFiles.includes(node.relPath) ? 'bg-indigo-50 border-2 border-indigo-600' : 'bg-white border border-gray-200'}`}
              >
                <span className="mr-2 inline-flex items-center">
                  {node.isDirectory ? (
                    <Folder className="w-4 h-4 text-amber-600" aria-hidden />
                  ) : (
                    <File className="w-4 h-4 text-slate-500" aria-hidden />
                  )}
                </span>
                <span className="text-sm">{node.name}</span>
              </div>
            ))}

            {dragging && dragBox && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(dragBox.x1, dragBox.x2),
                  top: Math.min(dragBox.y1, dragBox.y2),
                  width: Math.abs(dragBox.x2 - dragBox.x1),
                  height: Math.abs(dragBox.y2 - dragBox.y1),
                  border: '1px dashed rgba(79,70,229,0.8)',
                  backgroundColor: 'rgba(79,70,229,0.08)',
                  pointerEvents: 'none'
                }}
              />
            )}
          </div>
        )}

        <div className="border-t border-gray-200 bg-slate-50 px-3 py-2 text-xs text-gray-600 h-28 shrink-0 overflow-y-auto">
          {selectedFiles.length === 0 ? (
            <div className="text-gray-500">
              Select files or folders to preview the resolved assignment list here.
            </div>
          ) : selectionPreview.status === 'loading' ? (
            <div>Building folder preview...</div>
          ) : (
            <>
              <div className="font-semibold text-gray-700">
                Preview: {selectionPreview.totalFiles} files will be assigned.
              </div>
              {selectionPreview.samplePaths.length > 0 && (
                <div className="mt-1 space-y-1">
                  {selectionPreview.samplePaths.map((path) => (
                    <div key={path} className="truncate" title={path}>{path}</div>
                  ))}
                  {selectionPreview.totalFiles > selectionPreview.samplePaths.length && (
                    <div className="text-gray-500">+{selectionPreview.totalFiles - selectionPreview.samplePaths.length} more...</div>
                  )}
                </div>
              )}
              {selectionPreview.emptyFolders.length > 0 && (
                <div className="mt-2 text-red-600">
                  Empty folders: {selectionPreview.emptyFolders.map((path) => path.split('/').pop() || path).join(', ')}
                </div>
              )}
            </>
          )}
          {selectionError ? (
            <div className="mt-2 text-red-700">{selectionError}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default InAppExplorer;
