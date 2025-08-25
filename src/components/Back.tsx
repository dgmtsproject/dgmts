import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

interface BackButtonProps {
    to?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ to }) => {
    const navigate = useNavigate();
    
    const handleClick = () => {
        if (to) {
            navigate(to);
        } else {
            navigate(-1);
        }
    };
    
    return (
        <Button onClick={handleClick}>Back</Button>
    )
}
export default BackButton;