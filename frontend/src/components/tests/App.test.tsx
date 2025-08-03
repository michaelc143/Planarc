import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import App from "../../App";

describe("App", () => {

	test("renders welcome message", () => {
		render(<App />);
		const titleElement = screen.getByText(/Welcome to the app!/i);
		expect(titleElement).toBeInTheDocument();
	});

	test("renders login button", () => {
		render(<App />);
		const loginButton = screen.getByRole("link", { name: /Login/i });
		expect(loginButton).toBeInTheDocument();
	});

	test("renders register button", () => {
		render(<App />);
		const registerButton = screen.getByRole("link", { name: /Register/i });
		expect(registerButton).toBeInTheDocument();
	});

});

describe("Nav", () => {

	test("login button navs to /login", () => {
		render(<App />);
		const loginButton = screen.getByRole("link", { name: /Login/i });
		fireEvent.click(loginButton);
		expect(window.location.pathname).toBe("/login");
		const homeButton = screen.getByRole("link", { name: /Back to Home/i }); // have to nav back to home to run register test
		fireEvent.click(homeButton);
	});

	test("register button navs to /register", () => {
		render(<App />);
		const registerButton = screen.getByRole("link", { name: /Register/i });
		fireEvent.click(registerButton);
		expect(window.location.pathname).toBe("/register");
	});

});