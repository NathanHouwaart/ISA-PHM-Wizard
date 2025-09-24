import React, { useState, useRef, useEffect } from 'react';
import PageWrapper from "../layout/PageWrapper";
import "./About.css";
import Heading1 from '../components/Typography/Heading1';
import Heading2 from '../components/Typography/Heading2';
import Paragraph from '../components/Typography/Paragraph';

export const About = () => {
  const iframeSrc = 'https://www.isa-phm.com/dutch-progn-lab.html';
  const [loaded, setLoaded] = useState(false);
  const [embedPossible, setEmbedPossible] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    // If the iframe hasn't loaded after 3 seconds, assume embedding is blocked or slow.
    const t = setTimeout(() => {
      if (!loaded) setEmbedPossible(false);
    }, 3000);
    return () => clearTimeout(t);
  }, [loaded]);

  const handleLoad = () => {
    setLoaded(true);
    setEmbedPossible(true);
  };

  // no local theme override for embedded page (cross-origin iframe cannot be styled internally)

  return (
    <PageWrapper widthClass="max-w-7xl">
      <div className="space-y-6">
        <header>
          <Heading1 className="text-center">ISA-PHM — Dutch Prognostics Lab</Heading1>
          <Paragraph className="text-center text-sm text-gray-600 mt-1 max-w-3xl mx-auto">This page embeds the official ISA-PHM Dutch Prognostics Lab and serves as a small wiki with additional information and notes for the project. Use the button below to open the official site in a new tab.</Paragraph>
         
        </header>

        <div className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <iframe
              ref={iframeRef}
              title="ISA-PHM Dutch Prognostics Lab"
              src={iframeSrc}
              onLoad={handleLoad}
              style={{ width: '100%', height: '72vh', border: '0', background: 'white' }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>

          {!embedPossible && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">The official site may disallow embedding or is taking too long to load. Open the official page instead:</p>
              <div className="mt-2 flex gap-2">
                <a className="inline-block px-4 py-2 bg-blue-600 text-white rounded" href={iframeSrc} target="_blank" rel="noopener noreferrer">Open official page</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default About;