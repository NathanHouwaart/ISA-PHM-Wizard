import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import FormField from '../../Form/FormField';
import Heading3 from '../../Typography/Heading3';
import { v4 as uuid4 } from 'uuid';
import { IconToolTipButton } from '../../Widgets/IconTooltipButton';
import TooltipButton from '../../Widgets/TooltipButton';
import Paragraph from '../../Typography/Paragraph';

const CommentEditor = ({ comments = [], onCommentsChange }) => {
  useEffect(() => {
    if (comments.some((comment) => !comment.id)) {
      onCommentsChange(
        comments.map((comment) => (comment.id ? comment : { ...comment, id: uuid4() }))
      );
    }
  }, [comments, onCommentsChange]);

  const addComment = useCallback(() => {
    const newComments = [...comments, { id: uuid4(), name: '', value: '' }];
    onCommentsChange(newComments);
  }, [comments, onCommentsChange]);

  const updateComment = useCallback((id, field, value) => {
    const updatedComments = comments.map((comment) =>
      comment.id === id ? { ...comment, [field]: value } : comment
    );
    onCommentsChange(updatedComments);
  }, [comments, onCommentsChange]);

  const removeComment = useCallback((id) => {
    const filteredComments = comments.filter((comment) => comment.id !== id);
    onCommentsChange(filteredComments);
  }, [comments, onCommentsChange]);

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <Heading3 className="text-sm font-semibold text-gray-700">
          Comments ({comments.length})
        </Heading3>
        <TooltipButton
          tooltipText="Add comment"
          onClick={addComment}
          className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <span>Add Comment</span>
        </TooltipButton>
      </div>

      <div className="space-y-4">
        {comments.map((comment, index) => (
          <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Paragraph className="text-sm font-medium text-gray-700">
                Comment {index + 1}
              </Paragraph>
              <IconToolTipButton
                icon={X}
                onClick={() => removeComment(comment.id)}
                tooltipText="Remove comment"
              />
            </div>

            <div className="space-y-3">
              <FormField
                name={`comment-${index}-title`}
                type="text"
                value={comment.name}
                label="Comment Title"
                placeholder="Enter a title for this comment"
                onChange={(e) => updateComment(comment.id, 'name', e.target.value)}
                required
              />

              <FormField
                name={`comment-${index}-text`}
                type="textarea"
                value={comment.value}
                label="Comment Text"
                placeholder="Enter your comment text here..."
                onChange={(e) => updateComment(comment.id, 'value', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <Paragraph className="text-sm text-gray-500 text-center py-6">
            No comments added yet. Click "Add Comment" to get started.
          </Paragraph>
        )}
      </div>
    </div>
  );
};

export default CommentEditor;
