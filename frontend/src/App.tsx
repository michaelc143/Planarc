import React from "react";
import "./App.css";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import UserInfo from "./components/UserInfo";
import PageNotFound from "./components/PageNotFound";
import Navbar from "./components/Navbar";
import Logout from "./components/Logout";
import DeleteAccount from "./components/DeleteAccount";
import EditProfile from "./components/EditProfile";
import EditUsername from "./components/EditUsername";
import Dashboard from "./components/Dashboard Components/Dashboard";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { UserProvider } from "./contexts/UserContext";
import { ToastContainer } from "react-toastify";
import BoardsPage from "./components/Boards/BoardsPage";
import BoardDetail from "./components/Boards/BoardDetail";
import DefaultBoardSettings from "./components/Settings/DefaultBoardSettings";

function App() {
	return (
		<AuthProvider>
			<UserProvider>
				<ToastProvider>
					<ToastContainer />
					<Router>
						<Navbar />
						<Routes>
							<Route path='/' element={<Home />} />
							<Route path='/login' element={<Login />} />
							<Route path='/logout' element={<Logout />} />
							<Route path='/register' element={<Register />} />
							<Route path='/userinfo' element={<UserInfo />} />
							<Route path='/deleteaccount' element={<DeleteAccount />} />
							<Route path='/editprofile' element={<EditProfile />} />
							<Route path='/editusername' element={<EditUsername />} />
							<Route path='/dashboard' element={<Dashboard />} />
							<Route path='/boards' element={<BoardsPage />} />
							<Route path='/boards/:boardId' element={<BoardDetail />} />
							<Route path='/settings/defaults' element={<DefaultBoardSettings />} />
							<Route path='*' element={<PageNotFound />} />
						</Routes>
					</Router>
				</ToastProvider>
			</UserProvider>
		</AuthProvider>
	);
}

export default App;
