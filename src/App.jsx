
import React from "react";
import ReactDOM from "react-dom/client";

import Navbar from "./components/Navbar";
import { Routes } from "react-router-dom";
import { Route } from "react-router-dom";

import { About, IsaQuestionnaire, Home, TestSetups} from "./pages";
import { GlobalDataProvider } from "./contexts/GlobalDataContext";


function App() {
  return (
    <div className="App" >
      <Navbar />
      <GlobalDataProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/testsetups" element={<TestSetups />} />
          <Route path="/isaquestionnaire" element={<IsaQuestionnaire />} />
        </Routes>
      </GlobalDataProvider>
    </div>
  );
}

export default App;
