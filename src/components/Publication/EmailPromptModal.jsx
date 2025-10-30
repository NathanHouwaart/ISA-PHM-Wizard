// EmailPromptModal.jsx
// A small modal that prompts the user to enter an email address for a contact
// before setting them as the corresponding author.
//
// Example usage:
// <EmailPromptModal
//   isOpen={showEmailPrompt}
//   authorName="John Doe"
//   onSave={(email) => { updateEmail(authorId, email); setShowEmailPrompt(false); }}
//   onCancel={() => setShowEmailPrompt(false)}
// />

import { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { isValidEmail } from '../../utils/validation';
import FormField from '../Form/FormField';
import TooltipButton from '../Widgets/TooltipButton';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

const EmailPromptModal = ({ isOpen, authorName, onSave, onCancel }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    // Basic email validation
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email is required to set a corresponding author.');
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    onSave(trimmed);
    setEmail(''); // Reset for next use
  };

  const handleCancel = () => {
    setError('');
    setEmail('');
    onCancel();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            <Heading3 className="text-lg font-semibold text-gray-900">
              Email Required
            </Heading3>
          </div>
          <TooltipButton
            className="p-1 text-gray-500 hover:text-gray-700 bg-transparent hover:bg-transparent rounded transition-colors"
            onClick={handleCancel}
            tooltipText="Close"
          >
            <X className="w-5 h-5" />
          </TooltipButton>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          <Paragraph className="text-sm text-gray-700">
            <strong>{authorName}</strong> does not have an email address. 
            A corresponding author must have an email for contact purposes.
          </Paragraph>
          <Paragraph className="text-sm text-gray-600">
            Please enter an email address to proceed:
          </Paragraph>
          <FormField
            name="email"
            label="Email Address"
            type="text"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(''); // Clear error on input
            }}
            placeholder="author@example.com"
            required
          />
          {error && (
            <Paragraph className="text-sm text-red-600">
              {error}
            </Paragraph>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <TooltipButton
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            tooltipText="Cancel without setting email"
          >
            Cancel
          </TooltipButton>
          <TooltipButton
            onClick={handleSave}
            className={"px-4 py-2 text-white font-semibold rounded-lg transition-colors shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 flex items-center gap-2"}
            tooltipText="Save email and set as corresponding author"
          >
            <Mail className="w-4 h-4" />
            Save & Set Corresponding
          </TooltipButton>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EmailPromptModal;
