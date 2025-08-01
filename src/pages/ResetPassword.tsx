import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import logo from "../assets/logo.jpg";
import { API_BASE_URL } from '../config';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      toast.error("Invalid reset link. Please request a new password reset.");
      navigate("/forgot-password");
      return;
    }
    setToken(tokenFromUrl);
  }, [searchParams, navigate]);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          new_password: newPassword, 
          confirm_password: confirmPassword 
        }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      toast.success("Password reset successfully! You can now sign in with your new password.");
      setTimeout(() => navigate("/signin"), 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reset password";
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
            Reset Password
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
              Enter your new password below.
            </p>
            
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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

            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            
            <button
              onClick={handleResetPassword}
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
              {isLoading ? "Resetting..." : "Reset Password"}
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

export default ResetPassword; 