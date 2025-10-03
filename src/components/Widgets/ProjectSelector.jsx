import React, { useState, useRef, useEffect } from 'react';
import { useGlobalDataContext } from '../../contexts/GlobalDataContext';
import TooltipButton from './TooltipButton';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export default function ProjectSelector() {
  const { projects = [], currentProjectId, switchProject, createProject, deleteProject, renameProject } = useGlobalDataContext();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const current = projects.find((p) => p.id === currentProjectId) || projects[0] || { name: 'Default Project' };

  function handleCreate() {
    const name = newName.trim() || `Project ${projects.length + 1}`;
    createProject(name);
    setNewName('');
    setCreating(false);
    setOpen(false);
  }

  function handleDelete(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`Delete project "${p.name}"? This will remove its local state (this does not affect other projects).`)) return;
    deleteProject(id);
  }

  function startRename(id, name) {
    setEditingId(id);
    setRenameValue(name || '');
  }

  function commitRename(id) {
    const v = renameValue.trim();
    if (!v) return;
    renameProject(id, v);
    setEditingId(null);
  }

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-md transition"
          title="Select project"
        >
          <span className="text-sm font-medium">{current.name}</span>
          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </button>

        <TooltipButton tooltipText="Create new project" onClick={() => { setOpen(true); setCreating((c) => !c); }} className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:scale-105 transform transition-shadow duration-150">
          <Plus className="w-4 h-4" />
        </TooltipButton>
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 transition-transform transform origin-top-right">
          <div className="p-3">
            <div className="mb-2 text-xs text-gray-500">Active projects</div>
            <div className="max-h-44 overflow-y-auto">
              {projects.map((p) => (
                <div key={p.id} className={`flex items-center justify-between gap-2 p-2 rounded ${p.id === currentProjectId ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { switchProject(p.id); setOpen(false); }} className="text-sm font-medium text-gray-800 text-left">
                      {editingId === p.id ? (
                        <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="text-sm border-b border-gray-200 focus:outline-none" />
                      ) : (
                        <span>{p.name}</span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingId === p.id ? (
                      <>
                        <button onClick={() => commitRename(p.id)} className="p-1 rounded hover:bg-gray-100"><Check className="w-4 h-4 text-green-600" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-red-600" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startRename(p.id, p.name)} className="p-1 rounded hover:bg-gray-100" title="Rename project"><Edit2 className="w-4 h-4 text-gray-600" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-gray-100" title="Delete project"><Trash2 className="w-4 h-4 text-red-600" /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {creating && (
              <div className="mt-3 flex items-center gap-2">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New project name" className="flex-1 px-3 py-2 border border-gray-200 rounded" />
                <button onClick={handleCreate} className="px-3 py-2 bg-green-500 text-white rounded">Create</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
