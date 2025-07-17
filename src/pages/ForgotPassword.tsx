import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import logo from "../assets/logo.jpg";
import { API_BASE_URL } from '../config';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to send reset email");

      toast.success("Password reset email sent successfully! Please check your inbox.");
      setTimeout(() => navigate("/signin"), 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send reset email";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
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
            Forgot Password
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
            <p style={{ textAlign: "center", color: "#666", margin: "0 0 20px 0" }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
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
            
            <button
              onClick={handleForgotPassword}
              disabled={isLoading}
              style={{
                padding: "14px",
                backgroundColor: isLoading ? "#ccc" : "#0056d2",
                color: "white",
                fontWeight: "bold",
                fontSize: "16px",
                borderRadius: "8px",
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "background 0.3s ease",
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0044aa";
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0056d2";
                }
              }}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>
            
            <button
              onClick={() => navigate("/signin")}
              style={{
                padding: "12px",
                backgroundColor: "transparent",
                color: "#0056d2",
                fontWeight: "bold",
                fontSize: "14px",
                borderRadius: "8px",
                border: "1px solid #0056d2",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0056d2";
                (e.currentTarget as HTMLButtonElement).style.color = "white";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "#0056d2";
              }}
            >
              Back to Sign In
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

export default ForgotPassword; 