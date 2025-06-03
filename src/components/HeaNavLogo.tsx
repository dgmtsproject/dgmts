import Header from "./Header";
import NavSidebar from './NavSidebar';

const HeaNavLogo = () => {
  return (
    <div style={{ display: 'flex' }}> {/* Added flex container */}
      <NavSidebar />
      <Header />
    </div>
  );
};

export default HeaNavLogo;