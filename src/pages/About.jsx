import React, { useEffect, useRef, useState } from 'react';
import { RevoGrid, Template } from '@revolist/react-datagrid';
import { Minus, Plus } from "lucide-react"; // Only need Minus and Plus, Bold isn't used as an icon
import PageWrapper from "../layout/PageWrapper";
import "./About.css";
import EntityMappingPanel from '../components/EntityMappingPanel';
import { useGlobalDataContext } from '../contexts/GlobalDataContext';
import StudyVariableMappingCard from '../components/StudyVariableMappingCard';


export const About = () => {

  const { studyVariables, setStudyVariables } = useGlobalDataContext();
  const { studies, setStudies } = useGlobalDataContext();
  const { studyToStudyVariableMapping, setStudyToStudyVariableMapping } = useGlobalDataContext();
  // const [processedData, setProcessedData] = useState([]);

  return (
    <PageWrapper >
      <div className='space-y-6'>
      {/* <EntityMappingPanel name={"Variables"} items={studyVariables} setItems={setStudyVariables} mappings={studyToStudyVariableMapping} mappingCardComponent={StudyVariableMappingCard}/> */}
      {/* <EntityMappingPanel name={"Studies"} items={studies} setItems={setStudies} mappings={[]}/> */}
    </div>
    </PageWrapper>
  );
}