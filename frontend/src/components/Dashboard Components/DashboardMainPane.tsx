import React from "react";
import { useContext } from "react";
import { Navigate } from "react-router-dom";

import { AuthContext } from "../../contexts/AuthContext";
import { UserContext } from "../../contexts/UserContext";

export default function DashboardMainPane(): React.JSX.Element {

	const { isLoggedIn } = useContext(AuthContext);
	const { user } = useContext(UserContext);

	if (!isLoggedIn) {
		return <Navigate to="/" />;
	}

	return (
		<div className="bg-slate-300 h-screen border-l-2 border-slate-500 rounded-lg">
			<div className="flex flex-col items-center justify-center my-12 py-8">
				<h1 className="mb-8 font-bold text-4xl">Welcome to the app!</h1>
				<p className="text-lg">Hello, {user?.username}!</p>
			</div>
		</div>
	);
}
