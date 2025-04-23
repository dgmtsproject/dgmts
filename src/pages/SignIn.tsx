import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface User {
  username: string;
  email: string;
  password: string;
}

const SignIn: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Preload 10 random general users if not already in localStorage
  if (!localStorage.getItem("json-users")) {
    const generalUsers: User[] = [
      { username: "John Doe", email: "john@gmail.com", password: "john123" },
      { username: "Jane Smith", email: "jane@gmail.com", password: "jane123" },
      { username: "Alice Johnson", email: "alice@gmail.com", password: "alice123" },
      { username: "Bob Brown", email: "bob@gmail.com", password: "bob123" },
      { username: "Charlie Davis", email: "charlie@gmail.com", password: "charlie123" },
      { username: "Eve Miller", email: "eve@gmail.com", password: "eve123" },
      { username: "Frank Wilson", email: "frank@gmail.com", password: "frank123" },
      { username: "Grace Hall", email: "grace@gmail.com", password: "grace123" },
      { username: "Hank Young", email: "hank@gmail.com", password: "hank123" },
      { username: "Ivy King", email: "ivy@gmail.com", password: "ivy123" },
    ];
    localStorage.setItem("json-users", JSON.stringify(generalUsers));
  }

  const handleSignIn = () => {
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    // Hardcoded admin
    if (email === "admin@gmail.com" && password === "adminadmin") {
      toast.success("Admin login successful!");
      setTimeout(() => navigate("/projects"), 2000);
      return;
    }

    const users: User[] = JSON.parse(localStorage.getItem("json-users") || "[]");
    const user = users.find((u) => u.email === email && u.password === password);

    if (user) {
      toast.success("Login successful!");
      setTimeout(() => navigate("/projects"), 2000);
    } else {
      toast.error("Invalid email or password!");
    }
  };

  return (
    <>
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#f5f5f5",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
        }}
      >
        <ToastContainer />
        <Header />

        <div style={{ marginTop: "60px", width: "100%", maxWidth: "400px", zIndex: 1 }}>
          <h2 style={{ textAlign: "center", color: "#003087", fontSize: "28px" }}>
            Sign In
          </h2>
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                fontSize: "16px",
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                fontSize: "16px",
              }}
            />
            <button
              onClick={handleSignIn}
              style={{
                padding: "14px",
                backgroundColor: "#0056d2",
                color: "white",
                fontWeight: "bold",
                fontSize: "16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                transition: "background 0.3s ease",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0044aa";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0056d2";
              }}
            >
              Sign In
            </button>
          </div>
        </div>

        <footer
          style={{
            position: "fixed",
            bottom: 0,
            width: "100%",
            textAlign: "center",
            padding: "10px 0",
            backgroundColor: "#fff",
            color: "#666",
            fontSize: "12px",
            zIndex: 2,
          }}
        >
          © 2025 DGMTS. All rights reserved.
        </footer>
      </div>
    </>
  );
};

export default SignIn;
