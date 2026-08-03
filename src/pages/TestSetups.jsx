import "../styles.css";
import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

// Hooks
import useDynamicHeightContainer from '../hooks/useDynamicHeightContainer';

import Collection, {
  CollectionTitle,
  CollectionSubtitle,
  CollectionAddButtonText,
  CollectionEmptyStateTitle,
  CollectionEmptyStateSubtitle,
  CollectionEmptyStateAddButtonText,
  CollectionExtraActions
} from '../components/Collection'; // Adjust the import path as needed
import useTestSetups from '../hooks/useTestSetups';
import PageWrapper from '../layout/PageWrapper';
import TooltipButton from '../components/Widgets/TooltipButton';
import AlertDecisionDialog from '../components/Widgets/AlertDecisionDialog';
import TestSetupConflictDialog from '../components/Widgets/TestSetupConflictDialog';
import { useProjectActions, useProjectData } from '../contexts/GlobalDataContext';
import { hasContentChanged } from '../utils/testSetupUtils';
import generateId from '../utils/generateId';
import { parseTestSetupImportPackage } from '../utils/testSetupExport';

const resolveImportedTestSetupName = (name, testSetups = []) => {
  const baseName = typeof name === 'string' && name.trim() ? name.trim() : 'Imported Test Setup';
  const usedNames = new Set(
    testSetups
      .map((testSetup) => testSetup?.name?.trim().toLocaleLowerCase())
      .filter(Boolean)
  );

  if (!usedNames.has(baseName.toLocaleLowerCase())) {
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName} (imported)`;
  while (usedNames.has(candidate.toLocaleLowerCase())) {
    candidate = `${baseName} (imported ${suffix})`;
    suffix += 1;
  }
  return candidate;
};

export const TestSetups = () => {
  const { testSetups = [] } = useProjectData();
  const { setTestSetups } = useProjectActions();
  const importInputRef = useRef(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [dialogConfig, setDialogConfig] = useState(null);

  const {
    containerHeight,
    childRefs,
    handleChildHeightChange,
  } = useDynamicHeightContainer();

  const showDialog = useCallback((config) => {
    setDialogConfig({
      tone: 'info',
      confirmLabel: 'OK',
      showCancel: false,
      ...config,
      onConfirm: () => setDialogConfig(null),
      onCancel: () => setDialogConfig(null)
    });
  }, []);

  const handleImportFile = useCallback(async (file) => {
    try {
      const importedTestSetup = parseTestSetupImportPackage(await file.text());
      const localTestSetup = testSetups.find((testSetup) => testSetup?.id === importedTestSetup.id);

      if (!localTestSetup) {
        setTestSetups((previous) => [...previous, importedTestSetup]);
        return;
      }

      if (!hasContentChanged(localTestSetup, importedTestSetup)) {
        showDialog({
          title: 'Test setup already imported',
          message: `"${importedTestSetup.name || 'This test setup'}" is already up to date in this workspace.`
        });
        return;
      }

      setPendingImport({
        conflict: {
          setupId: importedTestSetup.id,
          setupName: importedTestSetup.name || 'Unnamed Test Setup',
          local: {
            version: localTestSetup.version ?? 0,
            lastModified: localTestSetup.lastModified ?? 0,
            setup: localTestSetup
          },
          imported: {
            version: importedTestSetup.version ?? 0,
            lastModified: importedTestSetup.lastModified ?? 0,
            setup: importedTestSetup
          }
        }
      });
    } catch (error) {
      showDialog({
        tone: 'danger',
        title: 'Unable to import test setup',
        message: error?.message || 'Choose a valid test setup export file and try again.'
      });
    }
  }, [setTestSetups, showDialog, testSetups]);

  const handleImportInputChange = useCallback((event) => {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (file) {
      handleImportFile(file);
    }
  }, [handleImportFile]);

  const handleConflictResolution = useCallback((resolution) => {
    const conflict = pendingImport?.conflict;
    if (!conflict) return;

    if (resolution === 'use-imported') {
      setTestSetups((previous) => previous.map((testSetup) => (
        testSetup?.id === conflict.setupId ? conflict.imported.setup : testSetup
      )));
    }

    if (resolution === 'keep-both') {
      const importedCopy = {
        ...conflict.imported.setup,
        id: generateId(),
        name: resolveImportedTestSetupName(conflict.imported.setup.name, testSetups)
      };
      setTestSetups((previous) => [...previous, importedCopy]);
    }

    setPendingImport(null);
  }, [pendingImport, setTestSetups, testSetups]);

  return (
    <PageWrapper>
        <div className='space-y-6 w-ful overflow-hidden flex-shrink-0' >
          <div style={{ height: containerHeight, transition: 'height 0.35s' }}>
            {
            <Collection
              ref={el => childRefs.current[0] = el}
              onHeightChange={handleChildHeightChange}
              itemHook={useTestSetups}
            >
              <CollectionTitle>Test Setups</CollectionTitle>
              <CollectionSubtitle>View, add and edit test-setups used in the projects, by specifying relevant components and sensors.</CollectionSubtitle>
              <CollectionAddButtonText>Add Test Setup</CollectionAddButtonText>
                            <CollectionEmptyStateTitle>No Test Setups Found</CollectionEmptyStateTitle>
                            <CollectionEmptyStateSubtitle>Get started by adding your first Test Setup</CollectionEmptyStateSubtitle>
                            <CollectionEmptyStateAddButtonText>Add test setup Now</CollectionEmptyStateAddButtonText>
                            <CollectionExtraActions>
                              <TooltipButton
                                onClick={() => importInputRef.current?.click()}
                                tooltipText="Import a test setup export file"
                              >
                                <Upload className="w-5 h-5" />
                                <span>Import Test Setup</span>
                              </TooltipButton>
                            </CollectionExtraActions>
                          </Collection>
          }
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportInputChange}
        />
        <TestSetupConflictDialog
          conflict={pendingImport?.conflict}
          importScope="test-setup"
          onResolve={handleConflictResolution}
          onCancel={() => setPendingImport(null)}
        />
        <AlertDecisionDialog
          open={Boolean(dialogConfig)}
          tone={dialogConfig?.tone}
          title={dialogConfig?.title}
          message={dialogConfig?.message}
          confirmLabel={dialogConfig?.confirmLabel}
          showCancel={dialogConfig?.showCancel}
          onConfirm={dialogConfig?.onConfirm}
          onCancel={dialogConfig?.onCancel}
        />
      </div>
    </PageWrapper>
  );
};

export default TestSetups;
