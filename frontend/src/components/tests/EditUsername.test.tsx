import React, { act } from "react";
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
		};

		render(
			<Router>
				<AuthContext.Provider value={{ isLoggedIn: true, setIsLoggedIn }}>
					<UserContext.Provider value={{ user: mockUser, setUser }}>
						<EditUsername />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		expect(screen.getByText("Edit User")).toBeInTheDocument();
		expect(screen.getByText(/Current Username: testuser/i)).toBeInTheDocument();
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
		};

		render(
			<Router>
				<AuthContext.Provider value={{ isLoggedIn: true, setIsLoggedIn }}>
					<UserContext.Provider value={{ user: mockUser, setUser }}>
						<EditUsername />
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

	test("input username allows typing", () => {
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
						<EditUsername />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		//get the input element by its html id
		const inputElement = screen.getByLabelText(/New Username/i) as HTMLInputElement;
		
		fireEvent.change(inputElement, { target: { value: "newusername" } });

		expect(inputElement.value).toBe("newusername");
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
		};
    
		render(
			<Router>
				<AuthContext.Provider value={{ isLoggedIn: true, setIsLoggedIn }}>
					<UserContext.Provider value={{ user: mockUser, setUser }}>
						<EditUsername />
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);
    
		// Get the input and button elements

		const inputElement = screen.getByTestId("usernameInput") as HTMLInputElement;
		const changeUsernameButton = screen.getByText("Change Username");
		fireEvent.change(inputElement, { target: { value: "testuser2" } });
		expect(inputElement.value).toBe("testuser2");
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