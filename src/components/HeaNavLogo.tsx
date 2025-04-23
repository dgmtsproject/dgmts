import Header from "./Header";
import Navbar from "../components/Navbar";
import logo from "../assets/logo.jpg";

const HeaNavLogo = () => {
  return (
    <div>
      <Header />
      <Navbar />
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
  );
};

export default HeaNavLogo;
