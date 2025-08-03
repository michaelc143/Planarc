import React from "react";
import { useContext } from "react";
import { Navigate } from "react-router-dom";

import { AuthContext } from "../../contexts/AuthContext";
import DashboardList from "./DashboardList";
import DashboardMainPane from "./DashboardMainPane";

export default function Dashboard(): React.JSX.Element {

	const { isLoggedIn } = useContext(AuthContext);

	if (!isLoggedIn) {
		return <Navigate to="/" />;
	}

	return (
		<div className="w-full h-screen flex flex-row">
			<div className="flex-[1] h-full rounded-lg px-2 py-2">
				<DashboardList />
			</div>
			<div className="flex-[3] h-full py-2">
				<DashboardMainPane />
			</div>
		</div>
	);
}
