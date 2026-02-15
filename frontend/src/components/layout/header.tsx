import React, {useEffect, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {Gamepad2, Shield, Package, LogOut, ClipboardCheck, MessageSquare, Megaphone, CalendarDays, Image, Menu, X} from "lucide-react";
import {useAuth} from "@/hooks/use-auth";

const Header:React.FC = () => {
	const {user, logout} = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const handleNavigation = (path:string):void => {
		navigate(path);
		setMobileMenuOpen(false);
	};

	const handleLogout = ():void => {
		logout();
		setMobileMenuOpen(false);
		navigate("/");
	};

	const isActive = (path:string):boolean => {
		if(path === "/"){
			return location.pathname === "/";
		}
		return location.pathname === path || location.pathname.startsWith(`${path}/`);
	};

	const displayNickname = user?.nickname || user?.username || "Profile";
	const displayInitial = displayNickname.charAt(0).toUpperCase();

	useEffect(() => {
		setMobileMenuOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		const handleResize = () => {
			if(window.innerWidth > 768){
				setMobileMenuOpen(false);
			}
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const renderNavButtons = () => (
		<>
			<button
				className={`nav-btn ${isActive("/news") ? "active" : ""}`}
				onClick={() => handleNavigation("/news")}
			>
				<Megaphone size={16}/>
				게임 소식
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
			<button
				className={`nav-btn ${(isActive("/gallery") || isActive("/photo-board")) ? "active" : ""}`}
				onClick={() => handleNavigation("/gallery")}
			>
				<Image size={16}/>
				갤러리
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
			<button
				className={`nav-btn ${(isActive("/items") || isActive("/item")) ? "active" : ""}`}
				onClick={() => handleNavigation("/items")}
			>
				<Package size={16}/>
				아이템
			</button>
		</>
	);

	return (
		<header className="header">
			<div className="container">
				<div className="header-content">
					<div className="logo" onClick={() => handleNavigation("/")}>
						<Gamepad2 className="logo-icon"/>
						<span>MobiNogi</span>
					</div>

					<div className="header-right">
						<nav className="nav desktop-nav">
							{renderNavButtons()}
						</nav>

						<div className="header-auth">
							{user ? (
								<>
									<button
										className={`profile-chip ${isActive("/profile") ? "active" : ""}`}
										onClick={() => handleNavigation("/profile")}
									>
										<span className="profile-avatar">
											{user.profileImage ? (
												<img src={user.profileImage} alt={displayNickname}/>
											) : (
												<span>{displayInitial}</span>
											)}
										</span>
										<span className="profile-text">
											<strong>{displayNickname}</strong>
											<small>{user.username}</small>
										</span>
										<Shield size={15}/>
									</button>
									<button className="logout-btn" onClick={handleLogout} title="Logout">
										<LogOut size={16}/>
									</button>
								</>
							) : (
								<button
									className={`nav-btn primary ${isActive("/login") ? "active" : ""}`}
									onClick={() => handleNavigation("/login")}
								>
									Login
								</button>
							)}
						</div>

						<button
							type="button"
							className={`menu-toggle ${mobileMenuOpen ? "open" : ""}`}
							onClick={() => setMobileMenuOpen((prev) => !prev)}
							aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
							aria-expanded={mobileMenuOpen}
						>
							{mobileMenuOpen ? <X size={18}/> : <Menu size={18}/>}
						</button>
					</div>
				</div>

				{mobileMenuOpen && (
					<>
						<button
							type="button"
							className="mobile-nav-backdrop"
							aria-label="메뉴 닫기"
							onClick={() => setMobileMenuOpen(false)}
						/>
						<nav className="mobile-nav" aria-label="모바일 메뉴">
							{renderNavButtons()}
						</nav>
					</>
				)}
			</div>
		</header>
	);
};

export default Header;
