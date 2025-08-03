import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuthContext } from "../../contexts/AuthContext";
import { ToastContext } from "../../contexts/ToastContext";
import { UserContext } from "../../contexts/UserContext";
import Register from "../Register";

describe("Register", () => {
	test("renders Register form and allows typing", () => {
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
						<ToastContext.Provider value={{ showToast: jest.fn() }}>
							<Register />
						</ToastContext.Provider>
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		const usernameInput = screen.getByLabelText(/Username/i) as HTMLInputElement;
		const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
		const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;

		fireEvent.change(usernameInput, { target: { value: "testuser" } });
		fireEvent.change(emailInput, { target: { value: "testuser@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "testpassword" } });

		expect(usernameInput.value).toBe("testuser");
		expect(emailInput.value).toBe("testuser@example.com");
		expect(passwordInput.value).toBe("testpassword");
	});

	it("submits the form with username, email and password", async () => {
		const setIsLoggedIn = jest.fn();
		const setUser = jest.fn();

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
				<AuthContext.Provider value={{ isLoggedIn: false, setIsLoggedIn }}>
					<UserContext.Provider value={{ user: mockUser, setUser }}>
						<ToastContext.Provider value={{ showToast: jest.fn() }}>
							<Register />
						</ToastContext.Provider>
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		const usernameInput = screen.getByLabelText("Username") as HTMLInputElement;
		const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
		const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
		const submitButton = screen.getByRole("button", { name: /Register/i }) as HTMLButtonElement;

		fireEvent.change(usernameInput, { target: { value: "testuser" } });
		fireEvent.change(emailInput, { target: { value: "testuser@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "testpassword" } });
		fireEvent.click(submitButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

		expect(global.fetch).toHaveBeenCalledWith("http://localhost:5000/api/register",
			{"body": "{\"username\":\"testuser\",\"email\":\"testuser@example.com\",\"password\":\"testpassword\"}", "headers": {"Content-Type": "application/json"}, "method": "POST"});

		expect(usernameInput.value).toBe("testuser");
		expect(emailInput.value).toBe("testuser@example.com");
		expect(passwordInput.value).toBe("testpassword");

	});
});