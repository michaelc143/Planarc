import React, { createContext, useState, ReactNode } from "react";

export const AuthContext = createContext<{
	isLoggedIn: boolean;
	setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}>({
	isLoggedIn: false,
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	setIsLoggedIn: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	return (
		<AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn }}>
			{children}
		</AuthContext.Provider>
	);
};