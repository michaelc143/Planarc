import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, LoginCredentials, RegisterData, AuthContextType } from "../interfaces/Interfaces";
import authService from "../services/auth-service";

// Export the context so components can import it directly
export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		initializeAuth();
	}, []);

	const initializeAuth = async () => {
		try {
			let storedUser = authService.getCurrentUser();
			const token = authService.getToken();

			if (storedUser && token) {
				// Normalize shape to ensure userId is present
				if (!storedUser.userId) {
					storedUser = { ...storedUser, userId: String(storedUser.id ?? "") };
					localStorage.setItem("user", JSON.stringify(storedUser));
				}
				const isValidToken = await authService.validateToken();
				if (isValidToken) {
					setUser(storedUser);
				} else {
					authService.logout();
				}
			}
		} catch (error) {
			authService.logout();
		} finally {
			setLoading(false);
		}
	};

	const login = async (credentials: LoginCredentials): Promise<boolean> => {
		try {
			const response = await authService.login(credentials);
			if (response) {
				setUser(response.user);
			}
			return !!response;
		} catch (error) {
			return false;
		}
	};

	const register = async (data: RegisterData): Promise<boolean> => {
		try {
			const response = await authService.register(data);
			if (response) {
				setUser(response.user);
			}
			return !!response;
		} catch (error) {
			return false;
		}
	};

	const logout = () => {
		authService.logout();
		setUser(null);
	};

	// Add legacy properties for backward compatibility
	const setIsLoggedIn = (loggedIn: boolean) => {
		if (!loggedIn) {
			logout();
		}
	};

	const value: AuthContextType = {
		user,
		login,
		register,
		logout,
		isAuthenticated: !!user,
		loading,
		// Add legacy properties for backward compatibility
		isLoggedIn: !!user,
		setIsLoggedIn,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};