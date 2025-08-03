import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { render, screen } from "@testing-library/react";

import { AuthContext } from "../../contexts/AuthContext";
import DashboardList from "../Dashboard Components/DashboardList";

describe("DashboardList", () => {
	test("renders DashboardList when logged in", () => {
		const setIsLoggedIn = jest.fn();

		render(
			<Router>
				<AuthContext.Provider value={{ isLoggedIn: true, setIsLoggedIn: setIsLoggedIn }}>
					<DashboardList />
				</AuthContext.Provider>
			</Router>,
		);

		expect(screen.getByText(/Main functions/i)).toBeInTheDocument();
	});

	test("redirects to home page when not logged in", () => {
		const setIsLoggedIn = jest.fn();

		render(
			<Router>
				<AuthContext.Provider value={{ isLoggedIn: false, setIsLoggedIn: setIsLoggedIn }}>
					<DashboardList />
				</AuthContext.Provider>
			</Router>,
		);

		expect(window.location.pathname).toBe("/");
	});
});
