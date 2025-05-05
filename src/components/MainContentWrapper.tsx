import { Box } from '@mui/material';

const MainContentWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <Box 
      component="main" 
      sx={{ 
        flexGrow: 1,
        p: 3,
        marginLeft: '240px',
        width: 'calc(100% - 240px)',
        position: 'relative'
      }}
    >
      {children}
    </Box>
  );
};

export default MainContentWrapper;