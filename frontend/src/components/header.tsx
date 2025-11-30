import React from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {Gamepad2, Shield, Package, LogOut} from "lucide-react";
import {useAuth} from "../hooks/use-auth.ts";

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
