import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import logo from "../assets/logo.jpg";
import { useAdminContext } from "../context/AdminContext";
import { API_BASE_URL } from '../config';

// interface User {
//   username: string;
//   email: string;
//   password: string;
//   role?: string; 
// }

const SignIn: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setIsAdmin, setUserEmail, setPermissions } = useAdminContext();

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      // Store JWT token in localStorage
      localStorage.setItem('jwtToken', data.token);

      // Enforce access_to_site permission
      if (!data.user.permissions || !data.user.permissions.access_to_site) {
        toast.error("You do not have permission to access this site. Please contact your administrator.");
        return;
      }
      // Set context from backend response
      setIsAdmin(data.user.role === "admin");
      setUserEmail(data.user.email);
      setPermissions({
        ...data.user.permissions
      });

      toast.success(`${data.user.role === "admin" ? "Admin" : "User"} login successful!`);
      setTimeout(() => navigate("/dashboard"), 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      toast.error(errorMessage);
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-evenly",
            padding: "5px 10px",
            gap: "10px",
            borderBottom: "1px solid #000",
            backgroundColor: "white", 
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <img
              src={logo}
              alt="DGMTS Logo"
              style={{ height: "50px", display: "block", margin: 0, padding: 0 }}
            />
            <div
              style={{
                fontSize: "16px",
                lineHeight: "1",
                marginTop: "-2px",
              }}
            >
              <span style={{ color: "Black", fontWeight: "bold" }}>DGMTS-imSite</span>
            </div>
          </div>

          {/* Company Info */}
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "normal", margin: 0 }}>
              Dulles Geotechnical and Material Testing Services Inc.
            </h1>
            <p style={{ margin: "0", color: "#ff8c00", fontSize: "12px" }}>
              A Certified SWaM and MBE/DBE Firm
            </p>
          </div>
        </div>

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
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: "12px",
                  paddingRight: "40px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontSize: "16px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "#666",
                  padding: "4px",
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
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