import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuthContext } from "../../contexts/AuthContext";
import { ToastContext } from "../../contexts/ToastContext";
import { UserContext } from "../../contexts/UserContext";
import Login from "../Login";
import authService from "../../services/auth-service";

describe("Login", () => {

	test("renders Login form and allows typing", () => {
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
					login: async (credentials) => {
						try {
							await authService.login(credentials);
							return true;
						} catch {
							return false;
						}
					},
					register: async (data) => {
						try {
							await authService.register(data);
							return true;
						} catch {
							return false;
						}
					},
					logout: jest.fn(),
					isAuthenticated: false,
					loading: false,
				}}>
					<UserContext.Provider value={{ user: mockUser, setUser: setUser }}>
						<ToastContext.Provider value={{ showToast: jest.fn() }}>
							<Login />
						</ToastContext.Provider>
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		expect(screen.getByLabelText(/Username/i) as HTMLInputElement).toBeInTheDocument();
		expect(screen.getByLabelText(/Password/i) as HTMLInputElement).toBeInTheDocument();
	});

	test("Login form allows typing", () => {
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
					login: async (credentials) => {
						try {
							await authService.login(credentials);
							return true;
						} catch {
							return false;
						}
					},
					register: async (data) => {
						try {
							await authService.register(data);
							return true;
						} catch {
							return false;
						}
					},
					logout: jest.fn(),
					isAuthenticated: false,
					loading: false,
				}}>
					<UserContext.Provider value={{ user: mockUser, setUser: setUser }}>
						<ToastContext.Provider value={{ showToast: jest.fn() }}>
							<Login />
						</ToastContext.Provider>
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		const usernameInput = screen.getByLabelText(/Username/i) as HTMLInputElement;
		const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;

		fireEvent.change(usernameInput, { target: { value: "testuser" } });
		fireEvent.change(passwordInput, { target: { value: "testpassword" } });

		expect(usernameInput.value).toBe("testuser");
		expect(passwordInput.value).toBe("testpassword");
	});

	it("submits the form with username and password", async () => {
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
					isLoggedIn: false,
					setIsLoggedIn,
					user: mockUser,
					login: async (credentials) => {
						try {
							await authService.login(credentials);
							return true;
						} catch {
							return false;
						}
					},
					register: async (data) => {
						try {
							await authService.register(data);
							return true;
						} catch {
							return false;
						}
					},
					logout: jest.fn(),
					isAuthenticated: false,
					loading: false,
				}}>
					<UserContext.Provider value={{ user: mockUser, setUser: setUser }}>
						<ToastContext.Provider value={{ showToast: jest.fn() }}>
							<Login />
						</ToastContext.Provider>
					</UserContext.Provider>
				</AuthContext.Provider>
			</Router>,
		);

		const usernameInput = screen.getByLabelText("Username") as HTMLInputElement;
		const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
		const submitButton = screen.getByRole("button", { name: /Login/i }) as HTMLButtonElement;

		fireEvent.change(usernameInput, { target: { value: "testuser" } });
		fireEvent.change(passwordInput, { target: { value: "testpassword" } });
		fireEvent.click(submitButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

		expect(global.fetch).toHaveBeenCalledWith("http://localhost:5000/api/auth/login",
			{"body": "{\"username\":\"testuser\",\"password\":\"testpassword\"}", "headers": {"Content-Type": "application/json"}, "method": "POST"});

		expect(usernameInput.value).toBe("testuser");
		expect(passwordInput.value).toBe("testpassword");
	});
});