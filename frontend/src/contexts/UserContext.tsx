import React, { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "../interfaces/Interfaces";

export const UserContext = createContext<{
	user: User;
	setUser: React.Dispatch<React.SetStateAction<User>>;
}>({
	user: {
		userId: "",
		username: "",
		email: "",
		dateJoined: "",
		role: "user",
	},
	//eslint-disable-next-line @typescript-eslint/no-empty-function
	setUser: () => {},
});

interface UserProviderProps {
	children: ReactNode;
}


export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
	// Try to load user from localStorage, else use default empty user
	const getInitialUser = (): User => {
		const userStr = localStorage.getItem("user");
		if (userStr) {
			try {
				return JSON.parse(userStr);
			} catch {
				// fallback to empty user if parse fails
			}
		}
		return {
			userId: "",
			username: "",
			email: "",
			dateJoined: "",
			role: "user",
		};
	};

	const [user, setUser] = useState<User>(getInitialUser());

	// Sync user state with localStorage changes (e.g., after login/logout)
	useEffect(() => {
		const syncUser = () => {
			const userStr = localStorage.getItem("user");
			if (userStr) {
				try {
					setUser(JSON.parse(userStr));
				} catch {
					// fallback: do not update
				}
			}
		};
		window.addEventListener("storage", syncUser);
		return () => window.removeEventListener("storage", syncUser);
	}, []);

	// Also update user state immediately after login/logout in this tab
	useEffect(() => {
		const userStr = localStorage.getItem("user");
		if (userStr) {
			try {
				const parsed = JSON.parse(userStr);
				if (JSON.stringify(parsed) !== JSON.stringify(user)) {
					setUser(parsed);
				}
			// eslint-disable-next-line no-empty
			} catch {}
		}
		
	}, [localStorage.getItem("user")]);

	return (
		<UserContext.Provider value={{ user, setUser}}>
			{children}
		</UserContext.Provider>
	);
};