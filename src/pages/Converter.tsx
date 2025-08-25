import HeaNavLogo from '../components/HeaNavLogo';
import BackButton from '../components/Back';
import MainContentWrapper from '../components/MainContentWrapper';

const Converter = () => {
  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
      <BackButton to="/dashboard" />
        <div>Converter</div>
      </MainContentWrapper>
    </>
  )
}

export default Converter