import React from "react";
import {BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import {AuthProvider} from "./contexts/auth-context";
import {useAuth} from "./hooks/use-auth";
import Header from "./components/layout/header";
import AdminGuildFloating from "./components/layout/admin-guild-floating";
import HomePage from "./pages/home";
import LoginPage from "./pages/auth/login";
import RegisterNicknamePage from "./pages/auth/register-nickname";
import GameItemsPage from "./pages/game/game-items";
import EventsPage from "./pages/game/events";
import NewsPage from "./pages/game/news";
import CharactersPage from "./pages/user/characters";
import ProfilePage from "./pages/user/profile";
import TodoPage from "./pages/user/todo";
import GuildManagementPage from "./pages/guild/guild-management";
import BoardListPage from "./pages/board/board-list";
import BoardDetailPage from "./pages/board/board-detail";
import BoardWritePage from "./pages/board/board-write";
import PhotoBoardPage from "./pages/photo/photo-board";
import DiscordCallbackPage from "./pages/auth/discord-callback";
import DarkModeToggle from "./components/common/dark-mode-toggle";
import SiteFooter from "./components/layout/site-footer";

const PublicRoute:React.FC<{children:React.ReactNode}> = ({children}) => {
	const {user} = useAuth();
	return !user ? <>{children}</> : <Navigate to="/"/>;
};

// 로그인 필수 라우트
const PrivateRoute:React.FC<{children:React.ReactNode}> = ({children}) => {
	const {user} = useAuth();
	return user ? <>{children}</> : <Navigate to="/login"/>;
};

// 닉네임 입력 페이지용 라우트 (pendingKakaoUser가 있을 때만 접근 가능)
const RegisterNicknameRoute:React.FC<{children:React.ReactNode}> = ({children}) => {
	const {pendingKakaoUser} = useAuth();
	return pendingKakaoUser ? <>{children}</> : <Navigate to="/login"/>;
};

const AppContent:React.FC = () => {
	const {loading, pendingKakaoUser} = useAuth();
	const renderWithLayout = (content:React.ReactNode) => (
		<div className="app">
			<Header/>
			<main className="main page-bg-shell">
				{content}
			</main>
			<AdminGuildFloating/>
			<SiteFooter/>
			<DarkModeToggle/>
		</div>
	);

	if(loading){
		return renderWithLayout(null);
	}

	// 신규 회원이면 닉네임 입력 페이지로 리다이렉트
	if(pendingKakaoUser){
		return (
			<Routes>
				<Route path="/register/nickname" element={<RegisterNicknamePage/>}/>
				<Route path="*" element={<Navigate to="/register/nickname"/>}/>
			</Routes>
		);
	}

	return (
		renderWithLayout(
			<Routes>
				<Route path="/" element={<HomePage/>}/>
				<Route path="/login" element={<PublicRoute><LoginPage/></PublicRoute>}/>
				<Route path="/register/nickname"
					   element={<RegisterNicknameRoute><RegisterNicknamePage/></RegisterNicknameRoute>}/>
				<Route path="/discord-callback" element={<DiscordCallbackPage/>}/>
				<Route path="/items" element={<GameItemsPage/>}/>
				<Route path="/barter" element={<GameItemsPage/>}/>
				<Route path="/craft" element={<GameItemsPage/>}/>
				<Route path="/items/barter" element={<Navigate to="/barter" replace/>}/>
				<Route path="/items/craft" element={<Navigate to="/craft" replace/>}/>
				<Route path="/items/:itemName/detail" element={<GameItemsPage/>}/>
				<Route path="/item" element={<GameItemsPage/>}/>
				<Route path="/item/barter" element={<Navigate to="/barter" replace/>}/>
				<Route path="/item/craft" element={<Navigate to="/craft" replace/>}/>
				<Route path="/item/:itemName/detail" element={<GameItemsPage/>}/>
				<Route path="/events" element={<EventsPage/>}/>
				<Route path="/news" element={<NewsPage/>}/>
				<Route path="/profile" element={<PrivateRoute><ProfilePage/></PrivateRoute>}/>
				<Route path="/characters" element={<CharactersPage/>}/>
				<Route path="/todo" element={<PrivateRoute><TodoPage/></PrivateRoute>}/>
				<Route path="/guild" element={<PrivateRoute><GuildManagementPage/></PrivateRoute>}/>
				<Route path="/guild/:guildName" element={<PrivateRoute><GuildManagementPage/></PrivateRoute>}/>
				<Route path="/board" element={<BoardListPage/>}/>
				<Route path="/board/external" element={<BoardDetailPage/>}/>
				<Route path="/board/write" element={<PrivateRoute><BoardWritePage/></PrivateRoute>}/>
				<Route path="/board/edit/:postId" element={<PrivateRoute><BoardWritePage/></PrivateRoute>}/>
				<Route path="/board/:postSlug" element={<BoardDetailPage/>}/>
				<Route path="/gallery" element={<PhotoBoardPage/>}/>
				<Route path="/photo-board" element={<Navigate to="/gallery" replace/>}/>
			</Routes>
		)
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
