import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase"; // Your existing Supabase client
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../components/Header";
import { useAdminContext } from "../context/AdminContext";

// interface User {
//   username: string;
//   email: string;
//   password: string;
//   role?: string; 
// }

const SignIn: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setIsAdmin, setUserEmail } = useAdminContext();

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password);

      if (error) throw error;
      if (!users || users.length === 0) {
        throw new Error("Invalid email or password");
      }

      const user = users[0];
      const isAdmin = user.role === "admin";
      setIsAdmin(isAdmin);
      setUserEmail(email); // Store the email in context

      toast.success(`${isAdmin ? "Admin" : "User"} login successful!`);
      setTimeout(() => navigate("/projects"), 2000);

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