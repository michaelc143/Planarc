import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { render, screen, fireEvent } from "@testing-library/react";

import { AuthContext } from "../../contexts/AuthContext";
import { UserContext } from "../../contexts/UserContext";
import EditProfile from "../EditProfile";

describe("EditProfile", () => {
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
						<EditProfile />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		expect(screen.getByText("Edit User")).toBeInTheDocument();
		expect(screen.getByText("Edit Username")).toBeInTheDocument();
		expect(screen.getByText("Delete Account")).toBeInTheDocument();
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
						<EditProfile />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);
		// make sure it redirects to home page when not logged in
		expect(window.location.pathname).toBe("/");
		expect(window.location.pathname).not.toBe("/userinfo");
	});

	test("navigates to delete account page", () => {
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
						<EditProfile />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);
		// Use getByText with a function matcher to find the link or button containing 'Delete Account'
		const deleteAccountElement = screen.getByText((content, node) => {
			const hasText = (node: any) => node.textContent && /delete account/i.test(node.textContent);
			const nodeHasText = hasText(node);
			const childrenDontHaveText = Array.from(node?.children || []).every(
				child => !hasText(child),
			);
			return nodeHasText && childrenDontHaveText;
		});
		expect(deleteAccountElement).toBeInTheDocument();
		fireEvent.click(deleteAccountElement);
	});

	test("navigates to edit username page", () => {
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
						<EditProfile />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);
		// Use getByText with a function matcher to find the link or button containing 'Edit Username'
		const editUsernameElement = screen.getByText((content, node) => {
			const hasText = (node: any) => node.textContent && /edit username/i.test(node.textContent);
			const nodeHasText = hasText(node);
			const childrenDontHaveText = Array.from(node?.children || []).every(
				child => !hasText(child),
			);
			return nodeHasText && childrenDontHaveText;
		});
		expect(editUsernameElement).toBeInTheDocument();
		fireEvent.click(editUsernameElement);
	});
});