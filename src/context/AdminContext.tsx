import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminContextType {
    isAdmin: boolean;
    setIsAdmin: (value: boolean) => void;
    userEmail: string | null;
    setUserEmail: (email: string | null) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    return (
        <AdminContext.Provider value={{ isAdmin, setIsAdmin, userEmail, setUserEmail }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdminContext = (): AdminContextType => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdminContext must be used within an AdminProvider');
    }
    return context;
};