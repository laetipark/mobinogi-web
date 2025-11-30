import React from "react";
import {BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import {AuthProvider} from "./contexts/auth-context.tsx";
import {useAuth} from "./hooks/use-auth.ts";
import Header from "./components/header.tsx";
import HomePage from "./pages/home.tsx";
import LoginPage from "./pages/login.tsx";
import GameItemsPage from "./pages/game-items.tsx";
import LoadingScreen from "./components/loading-screen.tsx";

const PublicRoute:React.FC<{children:React.ReactNode}> = ({children}) => {
	const {user} = useAuth();
	return !user ? <>{children}</> : <Navigate to="/"/>;
};

const AppContent:React.FC = () => {
	const {loading} = useAuth();
	if(loading){
		return <LoadingScreen/>;
	}
	return (
		<>
			<Header/>
			<Routes>
				<Route path="/" element={<HomePage/>}/>
				<Route path="/login" element={<PublicRoute><LoginPage/></PublicRoute>}/>
				<Route path="/items" element={<GameItemsPage/>}/>
			</Routes>
		</>
	);
};

const App:React.FC = () => {
	return (
		<AuthProvider>
			<Router>
				<AppContent/>
			</Router>
		</AuthProvider>
	);
};

export default App;
