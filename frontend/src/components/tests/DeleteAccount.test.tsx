import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuthContext } from "../../contexts/AuthContext";
import { ToastContext } from "../../contexts/ToastContext";
import { UserContext } from "../../contexts/UserContext";
import DeleteAccount from "../DeleteAccount";
import { User } from "../../interfaces/Interfaces";

describe("DeleteAccount", () => {
	it("deletes the user account", async () => {
		global.fetch = jest.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify({ success: true })),
			),
		);

		const showToast = jest.fn();
		const setUser = jest.fn();
		const setIsLoggedIn = jest.fn();

		const mockUser: User = {
			userId: "1",
			username: "testuser",
			email: "testuser@example.com",
			dateJoined: "2022-01-01",
		};

		render(
			<Router>
				<AuthContext.Provider value={{ isLoggedIn: true, setIsLoggedIn }}>
					<UserContext.Provider value={{ user: mockUser, setUser: setUser }}>
						<ToastContext.Provider value={{ showToast }}>
							<DeleteAccount />
						</ToastContext.Provider>
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		const deleteButton = screen.getByRole("button", { name: /Delete Account/i });
		fireEvent.click(deleteButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

		expect(global.fetch).toHaveBeenCalledWith("http://localhost:5000/api/users/testuser", { method: "DELETE" });

		expect(setIsLoggedIn).toHaveBeenCalledWith(false);
		expect(setUser).toHaveBeenCalledWith({
			userId: "",
			username: "",
			email: "",
			dateJoined: "",
		});
		expect(showToast).toHaveBeenCalledWith("User deleted successfully", "success");

		expect(window.location.pathname).toBe("/");
	});

	it("redirects to home page if user is not logged in", () => {
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
					<UserContext.Provider value={{ user: mockUser, setUser: setUser}}>
						<ToastContext.Provider value={{ showToast: jest.fn() }}>
							<DeleteAccount />
						</ToastContext.Provider>
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		expect(window.location.pathname).toBe("/");
	});
});