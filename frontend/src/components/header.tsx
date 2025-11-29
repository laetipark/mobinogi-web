import React from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {Gamepad2, Shield, LogOut} from "lucide-react";
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
						{user ? (
							<>
								<button
									className={`nav-btn ${isActive("/controllers") ? "active" : ""}`}
									onClick={() => handleNavigation("/controllers")}
								>
									<Shield size={16}/>
									Controllers
								</button>
								<div className="user-menu">
									<span className="user-name">{user.username}</span>
									<button className="logout-btn" onClick={handleLogout} title="Logout">
										<LogOut size={16}/>
									</button>
								</div>
							</>
						) : (
							<>
								<button
									className={`nav-btn ${isActive("/login") ? "active" : ""}`}
									onClick={() => handleNavigation("/login")}
								>
									Login
								</button>
								<button
									className={`nav-btn primary ${isActive("/register") ? "active" : ""}`}
									onClick={() => handleNavigation("/register")}
								>
									Sign Up
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
