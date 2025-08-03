import React from "react";
import { render, screen } from "@testing-library/react";

import PageNotFound from "../PageNotFound";

test("renders 404 and Page Not Found text", () => {
	render(<PageNotFound />);
	const text404 = screen.getByText(/404/i);
	expect(text404).toBeInTheDocument();
	const pageNotFoundText = screen.getByText(/Page Not Found/i);
	expect(pageNotFoundText).toBeInTheDocument();
});