import React from 'react';
import { createPortal } from 'react-dom';

import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from '../Widgets/TooltipButton';
import Z_INDEX from '../../constants/zIndex';

const ProjectSectionDialog = ({
  isOpen,
  title,
  description,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  disableConfirm = false,
}) => {
  if (!isOpen) {
    return null;
  }

  const modal = (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL }}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl p-6 space-y-4">
        <div>
          <Heading3>{title}</Heading3>
          {description && (
            <Paragraph className="text-sm text-gray-600 mt-1">{description}</Paragraph>
          )}
        </div>

        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <TooltipButton
            tooltipText="Close without saving"
            onClick={onClose}
            className="bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
          >
            {cancelLabel}
          </TooltipButton>
          {onConfirm && (
            <TooltipButton
              tooltipText={disableConfirm ? 'Complete required fields first' : 'Save changes'}
              onClick={onConfirm}
              disabled={disableConfirm}
              className={`px-4 py-2 rounded-lg ${disableConfirm ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 transition-colors'}`}
            >
              {confirmLabel}
            </TooltipButton>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ProjectSectionDialog;
