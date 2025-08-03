import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { render, screen } from "@testing-library/react";

import { AuthContext } from "../../contexts/AuthContext";
import { UserContext } from "../../contexts/UserContext";
import DashboardMainPane from "../Dashboard Components/DashboardMainPane";

describe("DashboardMainPane", () => {
	test("renders DashboardMainPane with user info when logged in", () => {
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
					<UserContext.Provider value={{ user: mockUser, setUser: setUser }}>
						<DashboardMainPane />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		expect(screen.getByText(/Welcome to the app!/i)).toBeInTheDocument();
		expect(screen.getByText(/Hello, testuser!/i)).toBeInTheDocument();
	});

	test("redirects to home page when not logged in", () => {
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
					<UserContext.Provider value={{ user: mockUser, setUser: setUser }}>
						<DashboardMainPane />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		expect(window.location.pathname).toBe("/");
	});
});
