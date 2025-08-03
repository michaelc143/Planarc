import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { render, screen } from "@testing-library/react";

import { AuthContext } from "../../contexts/AuthContext";
import { UserContext } from "../../contexts/UserContext";
import UserInfo from "../UserInfo";

describe("UserInfo", () => {
	test("renders user info when logged in", () => {
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
					<UserContext.Provider value={{ user: mockUser, setUser }}>
						<UserInfo />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		expect(screen.getByText(/User Info/i)).toBeInTheDocument();
		expect(screen.getByText(/Username: testuser/i)).toBeInTheDocument();
		expect(screen.getByText(/Email: testuser@example.com/i)).toBeInTheDocument();
		expect(screen.getByText(/Date Joined: 2022-01-01/i)).toBeInTheDocument();
	});

	test("renders not logged in redirect to /", () => {
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
					isLoggedIn: false,
					setIsLoggedIn,
					user: mockUser,
					login: jest.fn(),
					register: jest.fn(),
					logout: jest.fn(),
					isAuthenticated: false,
					loading: false,
				}}>
					<UserContext.Provider value={{ user: mockUser, setUser }}>
						<UserInfo />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);
		// make sure it redirects to home page when not logged in
		expect(window.location.pathname).toBe("/");
		expect(window.location.pathname).not.toBe("/userinfo");
	});
});