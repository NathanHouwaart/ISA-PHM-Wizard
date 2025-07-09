// components/tooltips/InfoTooltip.tsx

import {
    AnimatedTooltip,
    AnimatedTooltipExplanation,
    AnimatedTooltipExample
} from '../Tooltip/AnimatedTooltipProvider';

export function TableTooltip({ isVisible, explanations = [], examples = [] }) {
    if (!examples || examples.length === 0) {
        return null;
    }

    const columns = Object.keys(examples[0]);

    return (
        <AnimatedTooltip isVisible={isVisible}>
            {explanations.map((exp, i) => (
                <AnimatedTooltipExplanation key={i}>
                    {exp}
                </AnimatedTooltipExplanation>
            ))}
            <AnimatedTooltipExample>
                <table className="table-fixed min-w-full divide-y divide-gray-200 text-sm text-gray-800">
                    <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                        <tr>
                            {columns.map((col) => (
                                <th key={col} className="px-6 py-3 text-left">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {examples.map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                {columns.map((col) => (
                                    <td key={col} className="px-6 py-4 ">
                                        {row[col]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </AnimatedTooltipExample>
        </AnimatedTooltip>
    );
}

export default TableTooltip;