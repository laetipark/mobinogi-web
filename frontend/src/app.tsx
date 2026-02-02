import React from "react";
import {BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import {AuthProvider} from "./contexts/auth-context";
import {useAuth} from "./hooks/use-auth";
import Header from "./components/layout/header";
import HomePage from "./pages/home";
import LoginPage from "./pages/auth/login";
import GameItemsPage from "./pages/game/game-items";
import ItemSearchPage from "./pages/game/item-search";
import LoadingScreen from "./components/common/loading-screen";
import DarkModeToggle from "./components/common/dark-mode-toggle";

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
				<Route path="/item" element={<ItemSearchPage/>}/>
			</Routes>
			<DarkModeToggle/>
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
