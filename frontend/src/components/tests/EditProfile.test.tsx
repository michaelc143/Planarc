import React, { act } from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { render, screen } from "@testing-library/react";

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
		};

		render(
			<Router>
				<AuthContext.Provider value={{ isLoggedIn: true, setIsLoggedIn }}>
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
		};

		render(
			<Router>
				<AuthContext.Provider value={{ isLoggedIn: false, setIsLoggedIn }}>
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
		};

		render(
			<Router>
				<AuthContext.Provider value={{ isLoggedIn: true, setIsLoggedIn }}>
					<UserContext.Provider value={{ user: mockUser, setUser }}>
						<EditProfile />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);
		act(() => {
			// Simulate a click on the delete account button
			const deleteAccountButton = screen.getByText("Delete Account");
			deleteAccountButton.click();
		});
		expect(window.location.pathname).toBe("/deleteaccount");
		expect(window.location.pathname).not.toBe("/editprofile");
	});

	test("navigates to edit username page", () => {
		const setIsLoggedIn = jest.fn();
		const setUser = jest.fn();

		const mockUser = {
			userId: "1",
			username: "testuser",
			email: "testuser@example.com",
			dateJoined: "2022-01-01",
		};

		render(
			<Router>
				<AuthContext.Provider value={{ isLoggedIn: true, setIsLoggedIn }}>
					<UserContext.Provider value={{ user: mockUser, setUser }}>
						<EditProfile />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);
		act(() => {
			// Simulate a click on the edit username button
			const editUsernameButton = screen.getByText("Edit Username");
			editUsernameButton.click();
		});
		expect(window.location.pathname).toBe("/editusername");
		expect(window.location.pathname).not.toBe("/editprofile");
	});
});