/**
 * Shared cell templates for study/run grids across measurement/processing/assay slides
 */

export const studyCellTemplate = (createElement, props = {}) => {
    const model = props?.model;
    if (!model) return createElement('div', null, '');
    if (!model.showStudyLabel) {
        return createElement('div', { class: 'text-xs text-gray-400' }, '');
    }
    const label = `Study S${String(model.studyDisplayIndex || 0).padStart(2, '0')}`;
    return createElement('div', { class: 'flex flex-col gap-0.5' }, [
        createElement('div', { class: 'text-xs text-gray-500' }, label),
        createElement('div', { class: 'font-semibold text-gray-900' }, model.studyDisplayName || label),
    ]);
};

export const runCellTemplate = (createElement, props = {}) => {
    const model = props?.model;
    if (!model) return createElement('div', null, '');
    return createElement('div', { class: 'font-medium text-gray-800' }, model.runLabel || `Run ${model.runNumber || ''}`);
};

export const studyCellProperties = (props) => {
    const model = props?.model;
    if (model?.isLastRunInStudy) {
        return {
            style: { "border-bottom": "3px solid black" }
        };
    }
    return {};
};

export const runCellProperties = (props) => {
    const model = props?.model;
    const style = {
        "border-right": "3px solid black"
    };
    
    if (model?.isLastRunInStudy) {
        style["border-bottom"] = "3px solid black";
    }
    
    return { style };
};
