import React, { useEffect, useState, createContext, ReactNode } from "react";
import { API_BASE_URL } from '../config';

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

    useEffect(() => {
        const token = localStorage.getItem("jwtToken");
        if (token) {
            fetch(`${API_BASE_URL}/api/check-auth`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(res => res.ok ? res.json() : Promise.reject())
                .then(data => {
                    setIsAdmin(data.user.role === "admin");
                    setUserEmail(data.user.email);
                    setPermissions({
                        access_to_site: true,
                        view_graph: true,
                        view_data: true,
                        download_graph: true,
                        download_data: true,
                        ...data.user.permissions // if backend returns permissions
                    });
                })
                .catch(() => {
                    setIsAdmin(false);
                    setUserEmail(null);
                    setPermissions({
                        access_to_site: false,
                        view_graph: false,
                        view_data: false,
                        download_graph: false,
                        download_data: false
                    });
                    localStorage.removeItem("jwtToken");
                });
        }
    }, []);

    return (
        <AdminContext.Provider value={{ isAdmin, setIsAdmin, userEmail, setUserEmail, permissions, setPermissions }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdminContext = (): AdminContextType => {
    const context = React.useContext(AdminContext);
    if (!context) {
        throw new Error('useAdminContext must be used within an AdminProvider');
    }
    return context;
};