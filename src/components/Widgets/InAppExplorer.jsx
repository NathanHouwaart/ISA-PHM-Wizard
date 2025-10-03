import React, { useState, useRef, useEffect } from 'react';
import TooltipButton from './TooltipButton';
import DatasetPicker from './DatasetPicker';
import { Folder } from 'lucide-react';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';

export default function InAppExplorer() {
  const { explorerOpen, resolveExplorer, selectedDataset, loadDatasetSubtree } = useGlobalDataContext();

  const [currentPath, setCurrentPath] = useState("");
  const [pathStack, setPathStack] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [dragBox, setDragBox] = useState(null);

  const containerRef = useRef(null);
  const fileRefs = useRef({});
  const mouseDownRef = useRef({ down: false, x: 0, y: 0 });

  const tree = selectedDataset?.tree || [];

  // helper: find node by relPath
  function findNode(nodes, path) {
    if (path === "") return { children: nodes };
    for (const node of nodes) {
      if (node.isDirectory) {
        if (node.relPath === path) return node;
        const found = findNode(node.children || [], path);
        if (found) return found;
      }
    }
    return null;
  }

  const currentNode = findNode(tree, currentPath);
  const nodesToShow = currentNode?.children || [];
  const hasItems = Array.isArray(tree) && tree.length > 0;
  const datasetSlideName = 'Root Folder Selection';

  function enterFolder(relPath) {
    (async () => {
      try {
        // ask the context to load subtree into selectedDataset and return the node
        if (typeof loadDatasetSubtree === 'function') {
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
    })();
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

  // selection logic
  function toggleNode(node, event) {
    const currentIndex = nodesToShow.findIndex((n) => n.relPath === node.relPath);
    let newSelected = [...selectedFiles];

    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      for (let i = start; i <= end; i++) {
        const n = nodesToShow[i].relPath;
        if (!newSelected.includes(n)) newSelected.push(n);
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
    if (e.button !== 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseDownRef.current = {
      down: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top + containerRef.current.scrollTop,
    };
    setDragBox({ x1: mouseDownRef.current.x, y1: mouseDownRef.current.y, x2: mouseDownRef.current.x, y2: mouseDownRef.current.y });
  }

  function moveDrag(e) {
    if (!mouseDownRef.current.down) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;

    if (!dragging) {
      const dx = Math.abs(x - mouseDownRef.current.x);
      const dy = Math.abs(y - mouseDownRef.current.y);
      if (dx < 5 && dy < 5) return;
      setDragging(true);
    }

    setDragBox((b) => ({ ...b, x2: x, y2: y }));
  }

  function endDrag() {
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

  // close when explorerOpen toggles off
  useEffect(() => {
    if (!explorerOpen) {
      setSelectedFiles([]);
      setCurrentPath('');
    }
  }, [explorerOpen]);

  if (!explorerOpen) return null;

  const rootName = selectedDataset?.rootName || 'Root';

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-[800px] h-[600px] rounded-lg flex flex-col overflow-hidden p-4">
        <div className="py-2 border-b border-gray-200 flex items-center">
          <div>
            <TooltipButton onClick={goBack} tooltipText="Go up one level" disabled={!hasItems || (currentPath === '' && pathStack.length === 0)}>
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
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TooltipButton tooltipText="Cancel and close without selecting" className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={() => { try { resolveExplorer(null); } catch (e) {} }}>
              Cancel
            </TooltipButton>
            <TooltipButton tooltipText="Confirm selection and close" className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700" onClick={() => {
              if (!hasItems) {
                try { resolveExplorer(null); } catch (e) {}
                return;
              }
              const fileLike = selectedFiles.map((rel) => ({ name: rel.split('/').pop(), webkitRelativePath: rel }));
              const prefixed = fileLike.map((f) => ({ ...f, webkitRelativePath: selectedDataset && selectedDataset.rootName ? `./${f.webkitRelativePath}` : f.webkitRelativePath }));
              try { resolveExplorer(prefixed); } catch (e) {}
            }}>
              OK
            </TooltipButton>
          </div>
        </div>

        {(!hasItems) ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <Folder className="w-12 h-12 text-gray-300" aria-hidden />
              </div>
              <p className="text-lg font-semibold text-gray-800">No dataset defined</p>
              <p className="mt-2 text-sm text-gray-600 max-w-[480px]">There are no indexed files to show. Index a dataset now to enable file browsing and assignment.</p>
              <div className="mt-4 flex justify-center">
                <DatasetPicker />
              </div>
            </div>
          </div>
        ) : (
          <div ref={containerRef} onMouseDown={startDrag} onMouseMove={moveDrag} onMouseUp={endDrag} className="flex-1 overflow-y-auto p-2 relative">
            {nodesToShow.map((node, idx) => (
              <div key={node.relPath} ref={(el) => (fileRefs.current[node.relPath] = el)} onDoubleClick={() => node.isDirectory && enterFolder(node.relPath)} onClick={(e) => toggleNode(node, e)} className={`p-2 my-1 rounded-md flex items-center cursor-pointer select-none ${selectedFiles.includes(node.relPath) ? 'bg-indigo-50 border-2 border-indigo-600' : 'bg-white border border-gray-200'}`}>
                <span className="mr-2">{node.isDirectory ? '📁' : '📄'}</span>
                <span className="text-sm">{node.name}</span>
              </div>
            ))}

            {dragging && dragBox && (
              <div style={{ position: 'absolute', left: Math.min(dragBox.x1, dragBox.x2), top: Math.min(dragBox.y1, dragBox.y2), width: Math.abs(dragBox.x2 - dragBox.x1), height: Math.abs(dragBox.y2 - dragBox.y1), border: '1px dashed rgba(79,70,229,0.8)', backgroundColor: 'rgba(79,70,229,0.08)', pointerEvents: 'none' }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
