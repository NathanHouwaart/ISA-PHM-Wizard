import React from 'react';
import TooltipButton from '../Widgets/TooltipButton';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

const defaultLabel = (suggestion) => {
    if (!suggestion || typeof suggestion !== 'object') return '';
    const name = suggestion.name || '';
    const unit = suggestion.unit ? String(suggestion.unit).trim() : '';
    return unit ? `${name} (${unit})` : name;
};

const SuggestionStrip = ({
    title = 'Suggestions',
    subtitle = 'Click to add a suggestion as a new item.',
    suggestions = [],
    onSelect,
    getLabel = defaultLabel,
    maxVisible = 8,
    className = ''
}) => {
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
        return null;
    }

    const visibleSuggestions = suggestions.slice(0, maxVisible);
    const overflowSuggestions = suggestions.slice(maxVisible);

    const tooltipTextForSuggestion = (suggestion) => {
        const parts = [
            suggestion?.type ? `Type: ${suggestion.type}` : '',
            suggestion?.unit ? `Unit: ${suggestion.unit}` : '',
            suggestion?.description || ''
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(' | ') : 'Add this suggestion';
    };

    const renderSuggestionButton = (suggestion, index, groupKey = 'main') => {
        const label = typeof getLabel === 'function'
            ? getLabel(suggestion)
            : defaultLabel(suggestion);

        return (
            <TooltipButton
                key={`${groupKey}-${suggestion?.name || 'suggestion'}-${index}`}
                type="button"
                tooltipText={tooltipTextForSuggestion(suggestion)}
                onClick={() => onSelect?.(suggestion)}
                className="bg-none from-transparent to-transparent hover:from-transparent hover:to-transparent bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-full px-3.5 py-1.5 text-sm space-x-0"
            >
                <span>+ {label}</span>
            </TooltipButton>
        );
    };

    return (
        <div className={`bg-gray-50 border border-gray-300 rounded-lg p-3 ${className}`}>
            <Heading3 className="text-sm font-semibold text-gray-800">{title}</Heading3>
            <Paragraph className="text-xs text-gray-600 mt-1">{subtitle}</Paragraph>

            <div className="mt-2 flex flex-wrap gap-2">
                {visibleSuggestions.map((suggestion, index) => renderSuggestionButton(suggestion, index, 'visible'))}
            </div>

            {overflowSuggestions.length > 0 && (
                <details className="mt-3">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        Show {overflowSuggestions.length} more suggestions
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {overflowSuggestions.map((suggestion, index) => renderSuggestionButton(suggestion, index, 'overflow'))}
                    </div>
                </details>
            )}
        </div>
    );
};

export default SuggestionStrip;
