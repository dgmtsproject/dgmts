import { useEffect, useRef, useState } from "react";
import Header from "./Header";
import NavSidebar from './NavSidebar';
import logo from "../assets/logo.jpg";

const HeaNavLogo = () => {
  const logoRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.intersectionRatio >= 1); 
      },
      {
        threshold: [1],
      }
    );

    if (logoRef.current) observer.observe(logoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <Header />
      <NavSidebar />
      {isVisible && (
        <img
          ref={logoRef}
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
      )}
    </div>
  );
};

export default HeaNavLogo;
