import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { fireEvent, render, screen } from "@testing-library/react";

import { AuthContext } from "../../contexts/AuthContext";
import { UserContext } from "../../contexts/UserContext";
import Logout from "../Logout";

describe("Logout", () => {
	test("renders logout button", () => {
		const setIsLoggedIn = jest.fn();
		const setUser = jest.fn();

		const mockUser = {
			userId: "1",
			username: "testuser",
			email: "testuser@example.com",
			dateJoined: "2022-01-01",
			role: "user" as const,
		};

		render(
			<Router>
				<AuthContext.Provider value={{
					isLoggedIn: true,
					setIsLoggedIn,
					user: mockUser,
					login: jest.fn(),
					register: jest.fn(),
					logout: jest.fn(),
					isAuthenticated: true,
					loading: false,
				}}>
					<UserContext.Provider value={{ user: mockUser, setUser: setUser }}>
						<Logout />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		expect(screen.getByText("Are you sure you want to logout?")).toBeInTheDocument();
		expect(screen.getByText("Logout")).toBeInTheDocument();
	});

	test("calls logout function on button click", () => {
		const setIsLoggedIn = jest.fn();
		const setUser = jest.fn();

		const mockUser = {
			userId: "1",
			username: "testuser",
			email: "testuser@example.com",
			dateJoined: "2022-01-01",
			role: "user" as const,
		};
		render(
			<Router>
				<AuthContext.Provider value={{
					isLoggedIn: true,
					setIsLoggedIn,
					user: mockUser,
					login: jest.fn(),
					register: jest.fn(),
					logout: jest.fn(),
					isAuthenticated: true,
					loading: false,
				}}>
					<UserContext.Provider value={{ user: mockUser, setUser: setUser }}>
						<Logout />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);
		fireEvent.click(screen.getByText("Logout"));
		expect(setUser).toHaveBeenCalledWith({
			userId: "",
			username: "",
			email: "",
			dateJoined: "",
			role: "user" as const,
		});
		expect(window.location.pathname).toBe("/");
	});
});