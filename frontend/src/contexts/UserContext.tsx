import React, { createContext, useState, ReactNode } from "react";
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
	},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	setUser: () => {},
});

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
	const [user, setUser] = useState<User>({
		userId: "",
		username: "",
		email: "",
		dateJoined: "",
	});

	return (
		<UserContext.Provider value={{ user, setUser}}>
			{children}
		</UserContext.Provider>
	);
};