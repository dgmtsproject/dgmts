import Header from "./Header";
// import Navbar from "../components/Navbar";
import NavSidebar from './NavSidebar';
import logo from "../assets/logo.jpg";

const HeaNavLogo = () => {
  return (
    <div>
      <Header />
      <NavSidebar />
      <div className="centered-logo">
        <img
          src={logo}
          alt="DGMTS Logo"
          style={{
            position: "fixed",
            top: "68%",
            left: "61%",
            transform: "translate(-50%, -50%)",
            width: "30vw",
            opacity: 0.3,
            zIndex: -1,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};

export default HeaNavLogo;
