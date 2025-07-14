import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Permissions {
    access_to_site: boolean;
    view_graph: boolean;
    view_data: boolean;
    download_graph: boolean;
    download_data: boolean;
}

interface AdminContextType {
    isAdmin: boolean;
    setIsAdmin: (value: boolean) => void;
    userEmail: string | null;
    setUserEmail: (email: string | null) => void;
    permissions: Permissions;
    setPermissions: (perms: Permissions) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<Permissions>({
        access_to_site: true,
        view_graph: true,
        view_data: true,
        download_graph: false,
        download_data: false
    });

    return (
        <AdminContext.Provider value={{ isAdmin, setIsAdmin, userEmail, setUserEmail, permissions, setPermissions }}>
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