import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

import logo from "../assets/logo.jpg";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface User {
  username: string;
  email: string;
  password: string;
}

const SignUp: React.FC = () => {
  const [form, setForm] = useState<User>({
    username: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignUp = () => {
    const { username, email, password } = form;
    if (!username || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    const users: User[] = JSON.parse(
      localStorage.getItem("json-users") || "[]"
    );
    const emailExists = users.some((user) => user.email === email);

    if (emailExists) {
      toast.error("Email already exists!");
    } else {
      users.push(form);
      localStorage.setItem("json-users", JSON.stringify(users));
      toast.success("Account created successfully!");
      setTimeout(() => navigate("/signin"), 2000);
    }
  };

  return (
    <div className="page">
      <ToastContainer />
      <Header />
      {/* <Navbar /> */}
      <div className="content">
        <h2>Sign Up</h2>
        <div className="form-container">
          <input
            className="input-field"
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
          />
          <input
            className="input-field"
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
          <input
            className="input-field"
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
          <button className="submit-btn" onClick={handleSignUp}>
            Sign Up
          </button>
        </div>

        <div className="centered-logo">
          <img
            src={logo}
            alt="DGMTS Logo"
            style={{
              position: "fixed",
              top: "65%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "30vw",
              opacity: 0.1,
              zIndex: -1,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
      <footer>© 2025 DGMTS. All rights reserved.</footer>
    </div>
  );
};

export default SignUp;
