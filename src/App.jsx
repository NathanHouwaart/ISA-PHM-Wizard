
import React from "react";
import ReactDOM from "react-dom/client";
import ProfilePicture from "./ProfilePicture";

import Navbar from "./components/Navbar";
import { Routes } from "react-router-dom";
import { Route } from "react-router-dom";

import { About, Contact, Home, Services} from "./pages";

function App() {
  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
    </Routes>
    </div>
  );
}

// <ProfilePicture image={"../../assets/avatar-img.jpg"} altText={"Profile picture"} width={100} height={100}/>

export default App;