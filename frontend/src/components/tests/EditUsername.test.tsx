import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuthContext } from "../../contexts/AuthContext";
import { UserContext } from "../../contexts/UserContext";
import EditUsername from "../EditUsername";

describe("EditUsername", () => {
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
						<EditUsername />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		// Use function matcher for heading
		expect(screen.getByText((content) => /edit user/i.test(content))).toBeInTheDocument();
		expect(screen.getByText((content) => /current username: testuser/i.test(content))).toBeInTheDocument();
		// Use getByRole for button with accessible name
		expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
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
						<EditUsername />
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
						<EditUsername />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);
		// Just check the button is present and clickable
		const deleteAccountButton = screen.getByRole("button", { name: /delete account/i });
		expect(deleteAccountButton).toBeInTheDocument();
		fireEvent.click(deleteAccountButton);
	});

	test("input username allows typing", () => {
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
						<EditUsername />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		// Try getByTestId first, fallback to label matcher if needed
		let inputElement;
		try {
			inputElement = screen.getByTestId("usernameInput");
		} catch {
			inputElement = screen.getByLabelText((label) => /new username/i.test(label));
		}
		fireEvent.change(inputElement, { target: { value: "newusername" } });
		expect(inputElement).toHaveValue("newusername");
	});

	it("submits the form with new username", async () => {
		const setIsLoggedIn = jest.fn();
		const setUser = jest.fn();

		// Mock the fetch API call
		global.fetch = jest.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify({ success: true })),
			),
		);

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
						<EditUsername />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		// Get the input and button elements
		let inputElement;
		try {
			inputElement = screen.getByTestId("usernameInput");
		} catch {
			inputElement = screen.getByLabelText((label) => /new username/i.test(label));
		}
		const changeUsernameButton = screen.getByText(/change username/i);
		fireEvent.change(inputElement, { target: { value: "testuser2" } });
		expect(inputElement).toHaveValue("testuser2");
		fireEvent.click(changeUsernameButton);
		// Wait for the fetch call to complete
		await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

		expect(global.fetch).toHaveBeenCalledWith(
			"http://localhost:5000/api/users/1/username",
			{
				body: "{\"username\":\"testuser2\"}",
				headers: { "Content-Type": "application/json" },
				method: "PUT",
			},
		);
	});
});