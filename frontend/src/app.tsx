import React from "react";
import {BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import {AuthProvider} from "./contexts/auth-context.tsx";
import {useAuth} from "./hooks/use-auth.ts";
import Header from "./components/header.tsx";
import HomePage from "./pages/home.tsx";
import LoginPage from "./pages/login.tsx";
import RegisterPage from "./pages/register.tsx";
import LoadingScreen from "./components/loading-screen.tsx";

interface PublicRouteProps{
	children:React.ReactNode;
}

const PublicRoute:React.FC<PublicRouteProps> = ({children}) => {
	const {user} = useAuth();
	return !user ? <>{children}</> : <Navigate to="/controllers" replace/>;
};

const AppContent:React.FC = () => {
	const {loading} = useAuth();
	
	if(loading){
		return <LoadingScreen message="Initializing application..."/>;
	}
	
	return (
		<div className="app">
			<Header/>
			<main className="main">
				<Routes>
					<Route path="/" element={<HomePage/>}/>
					<Route
						path="/login"
						element={
							<PublicRoute>
								<LoginPage/>
							</PublicRoute>
						}
					/>
					<Route
						path="/register"
						element={
							<PublicRoute>
								<RegisterPage/>
							</PublicRoute>
						}
					/>
					<Route path="*" element={<Navigate to="/" replace/>}/>
				</Routes>
			</main>
		</div>
	);
};

const App:React.FC = () => {
	return (
		<Router>
			<AuthProvider>
				<AppContent/>
			</AuthProvider>
		</Router>
	);
};

export default App;
