import React from 'react';
import { Link, NavLink } from 'react-router-dom';

import './Navbar.css'; // Assuming you have a CSS file for styling

function Navbar() {
  return (
    <nav className="navbar">
      <Link to={"/"} className="title">ISA-PHM Wizard</Link>
      <ul>
        <li>
          <NavLink to={"/about"}>About</NavLink>
        </li>
        <li>
          <NavLink to={"/services"}>Services</NavLink>
        </li>
        <li>
          <NavLink to={"contact"}>Contact</NavLink>
        </li>
      </ul>
    </nav>
  );
}


export default Navbar;