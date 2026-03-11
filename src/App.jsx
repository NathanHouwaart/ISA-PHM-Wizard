
import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { GlobalDataProvider } from "./contexts/GlobalDataContext";
import Navbar from "./components/Navbar";
import LoadingOverlay from "./components/ui/LoadingOverlay";

// Check if we're in development mode
const isDev = import.meta.env.DEV;

// Production routes - lazy loaded for optimal bundle splitting
// Home page is eager-loaded as it's the entry point most users see first
import Home from "./pages/Home";

// Heavy pages are lazy-loaded to reduce initial bundle size
const About = React.lazy(() => import("./pages/About"));
const TestSetups = React.lazy(() => import("./pages/TestSetups"));
const IsaQuestionnaire = React.lazy(() => import("./pages/IsaQuestionnaire"));

// Demo/test pages - only loaded in development mode
const SimpleRevoGridTest = isDev ? React.lazy(() => import("./pages/__demo__/SimpleRevoGridTest")) : null;
const FileSystemTest = isDev ? React.lazy(() => import("./pages/__demo__/FileSystemTest")) : null;
const FilePickerTest = isDev ? React.lazy(() => import("./pages/__demo__/FilePickerTest")) : null;
const NewGrid = isDev ? React.lazy(() => import("./pages/__demo__/NewGrid")) : null;

function App() {
  return (
    <div className="App" >
      <Navbar />
      <GlobalDataProvider>
        <Routes>
          {/* Production routes - Home is eager-loaded, others are lazy-loaded */}
          <Route path="/" element={<Home />} />
          
          <Route 
            path="/about" 
            element={
              <Suspense fallback={<LoadingOverlay message="Loading page..." />}>
                <About />
              </Suspense>
            } 
          />
          
          <Route 
            path="/testsetups" 
            element={
              <Suspense fallback={<LoadingOverlay message="Loading test setups..." />}>
                <TestSetups />
              </Suspense>
            } 
          />
          
          <Route 
            path="/isaquestionnaire" 
            element={
              <Suspense fallback={<LoadingOverlay message="Loading questionnaire..." />}>
                <IsaQuestionnaire />
              </Suspense>
            } 
          />

          {/* Demo routes - only available in development mode (npm run dev) */}
          {isDev && (
            <>
              <Route 
                path="/demo/simplerevogrid" 
                element={
                  <Suspense fallback={<div className="p-8 text-center">Loading demo...</div>}>
                    <SimpleRevoGridTest />
                  </Suspense>
                } 
              />
              <Route 
                path="/demo/filesystemtest" 
                element={
                  <Suspense fallback={<div className="p-8 text-center">Loading demo...</div>}>
                    <FileSystemTest />
                  </Suspense>
                } 
              />
              <Route 
                path="/demo/filepickertest" 
                element={
                  <Suspense fallback={<div className="p-8 text-center">Loading demo...</div>}>
                    <FilePickerTest />
                  </Suspense>
                } 
              />
              <Route 
                path="/demo/newgrid" 
                element={
                  <Suspense fallback={<div className="p-8 text-center">Loading demo...</div>}>
                    <NewGrid />
                  </Suspense>
                } 
              />
            </>
          )}
        </Routes>
      </GlobalDataProvider>
    </div>
  );
}

export default App;
