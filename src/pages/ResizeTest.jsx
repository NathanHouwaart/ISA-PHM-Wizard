import React, { useEffect, useState } from 'react';
import PageWrapper from "../layout/PageWrapper";
import "./About.css";
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import DataGrid from '../components/DataGrid';
import { BoldCell, HTML5DateCellTemplate, PatternCellTemplate } from '../components/GridTable/CellTemplates';
import { Template } from '@revolist/react-datagrid';
import { VARIABLE_TYPE_OPTIONS } from '../constants/variableTypes';
import SelectTypePlugin from '@revolist/revogrid-column-select'
import StudySlide from '../components/Slides/StudySlide';


export const ResizeTest = () => {

  return (
    <div></div>
    // <StudySlide onHeightChange={() => {}} currentPage={5} />
  );
};
