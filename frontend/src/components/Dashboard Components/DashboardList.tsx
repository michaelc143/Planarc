import React from "react";
import { useContext } from "react";
import { Navigate } from "react-router-dom";

import { AuthContext } from "../../contexts/AuthContext";

export default function DashboardList(): React.JSX.Element {

	const { isLoggedIn } = useContext(AuthContext);

	if (!isLoggedIn) {
		return <Navigate to="/" />;
	}

	return (
		<div className="width-1/2 h-screen bg-slate-500 my-12 border-l-2 border-slate-500 rounded-lg">
			<div className="flex flex-col items-center justify-center my-12 py-8">
				<h3 className="mb-8 font-bold text-2xl">Main functions</h3>
			</div>
		</div>
	);
}
