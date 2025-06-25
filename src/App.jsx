
import React from "react";
import ReactDOM from "react-dom/client";

import Navbar from "./components/Navbar";
import { Routes } from "react-router-dom";
import { Route } from "react-router-dom";
import { QuestionnaireFormProvider } from "./contexts/QuestionnaireFormContext";


import { About, Contact, Home, TestSetups} from "./pages";
import { GlobalDataProvider } from "./contexts/GlobalDataContext";

function App() {
  return (
    <div className="App">
      <Navbar />
      <QuestionnaireFormProvider>
      <GlobalDataProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/testsetups" element={<TestSetups />} />
        <Route path="/isaquestionnaire" element={<Contact />} />
      </Routes>
      </GlobalDataProvider>
      </QuestionnaireFormProvider>

    </div>
  );
}

export default App;
