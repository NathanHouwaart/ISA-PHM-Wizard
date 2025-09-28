import React, { useState, useRef, useContext, useEffect } from "react";
import { Button } from "../components/ui/button";
import TooltipButton from "../components/Widgets/TooltipButton";
import { useGlobalDataContext } from '../contexts/GlobalDataContext';

export function FileExplorer() {
  const [allFiles, setAllFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [pathStack, setPathStack] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [rootName, setRootName] = useState("Root");
  const [indexed, setIndexed] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  const containerRef = useRef(null);
  const fileRefs = useRef({});
  const mouseDownRef = useRef({ down: false, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragBox, setDragBox] = useState(null);

  // Sort directories first, then files, alphabetically
  function sortNodes(nodes) {
    return nodes
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      })
      .map((n) =>
        n.isDirectory ? { ...n, children: sortNodes(n.children || []) } : n
      );
  }

  // Build tree with progress updates
  async function walkDir(handle, prefix = "", onProgress = () => {}) {
    const entries = [];
    for await (const [name, h] of handle.entries()) {
      const relPath = prefix ? `${prefix}/${name}` : name;
      // report progress on current item being visited
      try {
        onProgress({ current: relPath });
      } catch (err) {
        /* ignore */
      }
      if (h.kind === "directory") {
        const children = await walkDir(h, relPath, onProgress);
        entries.push({ name, relPath, isDirectory: true, children });
      } else {
        entries.push({ name, relPath, isDirectory: false });
      }
      // report that we processed one item
      try {
        onProgress({ processed: 1 });
      } catch (err) {
        /* ignore */
      }
    }
    return sortNodes(entries);
  }

  // Count total entries to allow percentage progress reporting
  async function countEntries(handle) {
    let total = 0;
    for await (const [, h] of handle.entries()) {
      total += 1;
      if (h.kind === "directory") {
        try {
          total += await countEntries(h);
        } catch (err) {
          // ignore permission errors for subfolders
        }
      }
    }
    return total;
  }

  async function pickRoot() {
    // First open the system directory picker before showing any loading UI
    try {
      const rootHandle = await window.showDirectoryPicker({ mode: "read" });
      if (!rootHandle) {
        // user cancelled
        return;
      }

      // now begin indexing and show loading/progress
      setLoading(true);
      setProgressPercent(0);
      setProgressMessage("");
      setIndexed(false);

      // store root folder name for breadcrumbs and full paths
      try {
        setRootName(rootHandle.name || "Root");
      } catch (err) {
        setRootName("Root");
      }

      // first pass: count total entries
      setProgressMessage("Counting items...");
      let total = 0;
      try {
        total = await countEntries(rootHandle);
      } catch (err) {
        // fallback: if counting fails, set total to 1 to avoid division by zero
        total = 1;
      }

      let processed = 0;

      const onProgress = ({ current, processed: p = 0 }) => {
        if (current) setProgressMessage(current);
        if (p) {
          processed += p;
          const percent = Math.min(100, Math.round((processed / Math.max(1, total)) * 100));
          setProgressPercent(percent);
        }
      };

      // second pass: build tree with progress updates
      const tree = await walkDir(rootHandle, "", onProgress);

      setAllFiles(tree);
      setCurrentPath("");
      setPathStack([]);
      setSelectedFiles([]);
      setLastSelectedIndex(null);
      setIndexed(true);
    } catch (err) {
      // user cancelled or other error - ensure we don't mark as indexed
      // console.debug(err);
    } finally {
      setLoading(false);
      setProgressPercent(0);
      setProgressMessage("");
    }
  }

  function selectMoreFiles() {
    if (allFiles.length === 0) return;
    // open a clean picker: clear any previous selection
    setSelectedFiles([]);
    setLastSelectedIndex(null);
    setModalOpen(true);
  }

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

  const currentNode = findNode(allFiles, currentPath);
  const nodesToShow = currentNode?.children || [];
  const { explorerOpen, resolveExplorer, selectedDataset } = useGlobalDataContext();

  // If another component calls openExplorer(), the global flag explorerOpen will
  // be set and we should open this modal as an overlay so callers get the UI.
  useEffect(() => {
    if (explorerOpen) {
      setModalOpen(true);
    }
  }, [explorerOpen]);

  // Navigation
  function enterFolder(relPath) {
    setPathStack((stack) =>
      currentPath && currentPath !== "" ? [...stack, currentPath] : stack
    );
    setCurrentPath(relPath);
    setSelectedFiles([]);
    setLastSelectedIndex(null);
  }

  function goBack() {
    // if we're at a nested folder and there's no pathStack, go back to root
    if (pathStack.length === 0) {
      if (currentPath && currentPath !== "") {
        setCurrentPath("");
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
    const newPath = index === 0 ? "" : pathStack[index - 1];
    setPathStack(pathStack.slice(0, index));
    setCurrentPath(newPath);
    setSelectedFiles([]);
    setLastSelectedIndex(null);
  }

  // Multi-select (Shift + click, Ctrl/Command + click)
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

  // Drag selection
  // Improved drag selection: only begin dragging after a small move threshold
  function startDrag(e) {
    if (e.button !== 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseDownRef.current = {
      down: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top + containerRef.current.scrollTop,
    };
    // initialize dragBox but don't mark dragging true yet - wait for move threshold
    setDragBox({
      x1: mouseDownRef.current.x,
      y1: mouseDownRef.current.y,
      x2: mouseDownRef.current.x,
      y2: mouseDownRef.current.y,
    });
  }

  function moveDrag(e) {
    if (!mouseDownRef.current.down) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;

    // If not yet dragging, only start if movement exceeds threshold (5px)
    if (!dragging) {
      const dx = Math.abs(x - mouseDownRef.current.x);
      const dy = Math.abs(y - mouseDownRef.current.y);
      if (dx < 5 && dy < 5) return;
      setDragging(true);
    }

    setDragBox((b) => ({
      ...b,
      x2: x,
      y2: y,
    }));
  }

  function endDrag() {
    // clear mouseDown flag regardless
    mouseDownRef.current.down = false;

    if (!dragging || !dragBox) {
      // cleanup any temporary box
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

  return (
    <div className="p-5">
      <div className="flex gap-2 items-center">
        <TooltipButton
          onClick={pickRoot}
          tooltipText="Index files from a chosen root folder (does not open explorer)"
          className={indexed ? 'bg-green-100 text-green-800' : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'}
        >
          {indexed ? (
            <span className="inline-flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L7 12.172 4.707 9.879a1 1 0 00-1.414 1.415l3 3a1 1 0 001.414 0l9-9z" clipRule="evenodd" />
              </svg>
              Indexed
            </span>
          ) : (
            'Index Root Folder'
          )}
        </TooltipButton>
        <TooltipButton className="bg-gray-100 text-gray-800 hover:bg-gray-200" onClick={selectMoreFiles} tooltipText="Open the file picker with the last selection">Select More Files</TooltipButton>
        <TooltipButton className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setModalOpen(true)} tooltipText="Open the file explorer with indexed files" disabled={allFiles.length === 0}>Open File Explorer</TooltipButton>
      </div>

      {(loading && (indexed || progressPercent > 0 || progressMessage)) && (
        <div className="mt-5">
          <p className="text-gray-700">Loading file structure...</p>
          <div className="text-sm text-gray-600 mb-2 flex items-center">
            {progressMessage && progressMessage.toLowerCase().includes('count') ? (
              <>
                <svg className="animate-spin h-5 w-5 text-indigo-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span>{progressMessage}</span>
              </>
            ) : (
              <span>{progressMessage}</span>
            )}
          </div>
          <div className="w-full h-3 bg-gray-200 rounded overflow-hidden">
            <div
              className={`h-full bg-indigo-600 transition-all`} 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-600">{progressMessage && progressMessage.toLowerCase().includes('count') ? 'Counting…' : `${progressPercent}%`}</div>
        </div>
      )}

      {modalOpen && !loading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white w-[800px] h-[600px] rounded-lg flex flex-col overflow-hidden p-4">
            {/* Header */}
            <div className="py-2 border-b border-gray-200 flex items-center">
              <div>
                <TooltipButton
                  onClick={goBack}
                  tooltipText="Go up one level"
                  disabled={currentPath === "" && pathStack.length === 0}
                  className={currentPath === "" && pathStack.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
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
              {/* Selected badge inside the explorer header */}
              <div className="ml-4 flex items-center gap-3">
                <div className="text-sm text-gray-600">Selected</div>
                <div className="inline-flex items-center px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">{selectedFiles.length}</div>
              </div>
                      <div className="ml-auto flex items-center gap-2">
                        <TooltipButton
                          tooltipText="Cancel and close without selecting"
                          className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                          onClick={() => {
                            setModalOpen(false);
                            // If opened as part of an openExplorer() call, resolve with null to indicate cancel
                            try { if (explorerOpen) resolveExplorer(null); } catch (e) { /* ignore */ }
                          }}
                        >
                          Cancel
                        </TooltipButton>
                        <TooltipButton
                          tooltipText="Confirm selection and close"
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                          onClick={() => {
                            const full = selectedFiles.map((f) => (f ? `${rootName}/${f}` : rootName));
                            // Create file-like objects compatible with applyFilesToRange: { name, webkitRelativePath }
                            const fileLike = selectedFiles.map((rel) => ({ name: rel.split('/').pop(), webkitRelativePath: rel }));
                            // If the dataset has a rootName or base path, prefix webkitRelativePath
                            const prefixed = fileLike.map((f) => ({ ...f, webkitRelativePath: selectedDataset && selectedDataset.rootName ? `${selectedDataset.rootName}/${f.webkitRelativePath}` : f.webkitRelativePath }));
                            try { if (explorerOpen) resolveExplorer(prefixed); } catch (e) { /* ignore */ }
                            setModalOpen(false);
                          }}
                        >
                          OK
                        </TooltipButton>
                      </div>
            </div>

            {/* File list */}
            <div ref={containerRef} onMouseDown={startDrag} onMouseMove={moveDrag} onMouseUp={endDrag} className="flex-1 overflow-y-auto p-2 relative">
              {nodesToShow.map((node, idx) => (
                <div
                  key={node.relPath}
                  ref={(el) => (fileRefs.current[node.relPath] = el)}
                  onDoubleClick={() => node.isDirectory && enterFolder(node.relPath)}
                  onClick={(e) => toggleNode(node, e)}
                  className={`p-2 my-1 rounded-md flex items-center cursor-pointer select-none ${selectedFiles.includes(node.relPath) ? 'bg-indigo-50 border-2 border-indigo-600' : 'bg-white border border-gray-200'}`}
                >
                  <span className="mr-2">{node.isDirectory ? '📁' : '📄'}</span>
                  <span className="text-sm">{node.name}</span>
                </div>
              ))}

              {dragging && dragBox && (
                <div
                  style={{
                    position: "absolute",
                    left: Math.min(dragBox.x1, dragBox.x2),
                    top: Math.min(dragBox.y1, dragBox.y2),
                    width: Math.abs(dragBox.x2 - dragBox.x1),
                    height: Math.abs(dragBox.y2 - dragBox.y1),
                    border: "1px dashed rgba(79,70,229,0.8)",
                    backgroundColor: "rgba(79,70,229,0.08)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
