import React from 'react';
import { Link, NavLink } from 'react-router-dom';

import './Navbar.css'; // Assuming you have a CSS file for styling

function Navbar() {
  return (
    <nav className="navbar">
      <Link to={"/"} className="title">ISA-PHM Wizard</Link>
      <ul>
        <li>
          <NavLink to={"/gridtest"}>Grid Test</NavLink>
        </li>
        <li>
          <NavLink to={"/about"}>About</NavLink>
        </li>
        <li>
          <NavLink to={"/testsetups"}>Test Setups</NavLink>
        </li>
        <li>
          <NavLink to={"isaquestionnaire"}>ISA Questionnaire Form</NavLink>
        </li>
      </ul>
    </nav>
  );
}


export default Navbar;