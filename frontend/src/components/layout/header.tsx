import React from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {Gamepad2, Shield, Package, LogOut, ClipboardCheck, MessageSquare, CalendarDays} from "lucide-react";
import {useAuth} from "@/hooks/use-auth";

const Header:React.FC = () => {
	const {user, logout} = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const handleNavigation = (path:string):void => {
		navigate(path);
	};

	const handleLogout = ():void => {
		logout();
		navigate("/");
	};

	const isActive = (path:string):boolean => location.pathname === path;

	return (
		<header className="header">
			<div className="container">
				<div className="header-content">
					<div className="logo" onClick={() => handleNavigation("/")}>
						<Gamepad2 className="logo-icon"/>
						<span>MobiNogi</span>
					</div>

					<nav className="nav">
						<button
							className={`nav-btn ${isActive("/") ? "active" : ""}`}
							onClick={() => handleNavigation("/")}
						>
							홈
						</button>
						<button
							className={`nav-btn ${isActive("/items") ? "active" : ""}`}
							onClick={() => handleNavigation("/items")}
						>
							<Package size={16}/>
							아이템
						</button>
						<button
							className={`nav-btn ${isActive("/events") ? "active" : ""}`}
							onClick={() => handleNavigation("/events")}
						>
							<CalendarDays size={16}/>
							이벤트
						</button>
						<button
							className={`nav-btn ${isActive("/board") ? "active" : ""}`}
							onClick={() => handleNavigation("/board")}
						>
							<MessageSquare size={16}/>
							게시판
						</button>
						{user && (
							<button
								className={`nav-btn ${isActive("/todo") ? "active" : ""}`}
								onClick={() => handleNavigation("/todo")}
							>
								<ClipboardCheck size={16}/>
								숙제
							</button>
						)}
						{user ? (
							<>
								<div className="user-menu">
									<button
										className={`nav-btn ${isActive("/profile") ? "active" : ""}`}
										onClick={() => handleNavigation("/profile")}
									>
										<Shield size={16}/>
										{user.nickname}
									</button>
									<span className="user-name">{user.username}</span>
									<button className="logout-btn" onClick={handleLogout} title="Logout">
										<LogOut size={16}/>
									</button>
								</div>
							</>
						) : (
							<>
								<button
									className={`nav-btn primary ${isActive("/login") ? "active" : ""}`}
									onClick={() => handleNavigation("/login")}
								>
									Login
								</button>
							</>
						)}
					</nav>
				</div>
			</div>
		</header>
	);
};

export default Header;
