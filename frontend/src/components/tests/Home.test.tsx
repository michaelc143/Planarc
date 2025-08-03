import React from "react";
import { render, screen } from "@testing-library/react";

import Home from "../Home";

test("renders 404 and Page Not Found text", () => {
	render(<Home />);
	const welcomeText = screen.getByText(/Welcome to the app!/i);
	expect(welcomeText).toBeInTheDocument();
});