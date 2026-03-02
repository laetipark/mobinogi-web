import React, {useEffect, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {
	CalendarDays,
	ChevronDown,
	ClipboardCheck,
	FileText,
	LogOut,
	Megaphone,
	Menu,
	MessageSquare,
	Package,
	Shield,
	Users,
	Image as ImageIcon,
	X
} from "lucide-react";
import type {LucideIcon} from "lucide-react";
import {useAuth} from "@/hooks/use-auth";
import {guildService} from "@/services";
import {toGuildSlug} from "@/features/guild";

/**
 * Constant MOBILE_MENU_BREAKPOINT.
 */
const MOBILE_MENU_BREAKPOINT = 940;

type GuildSubMenuItem = {
	path:string;
	label:string;
	icon:LucideIcon;
};

type CommunitySubMenuItem = {
	path:string;
	label:string;
	icon:LucideIcon;
};

type GameNewsSubMenuItem = {
	path:string;
	label:string;
	icon:LucideIcon;
};

const GAME_NEWS_SUB_MENUS:GameNewsSubMenuItem[] = [
	{path : "/news/notice", label : "공지", icon : Megaphone},
	{path : "/news/events", label : "이벤트", icon : CalendarDays},
	{path : "/news/update-note", label : "업데이트 노트", icon : FileText},
	{path : "/news/erin-note", label : "에린 노트", icon : FileText}
];

const GUILD_SUB_MENUS:GuildSubMenuItem[] = [
	{path : "/guild", label : "길드 정보", icon : Users},
	{path : "/guild/gallery", label : "길드 갤러리", icon : ImageIcon},
	{path : "/guild/board", label : "길드 게시판", icon : MessageSquare}
];

const COMMUNITY_SUB_MENUS:CommunitySubMenuItem[] = [
	{path : "/board", label : "게시판", icon : MessageSquare},
	{path : "/gallery", label : "갤러리", icon : ImageIcon}
];

const Header:React.FC = () => {
	const {user, logout} = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileGameNewsMenuOpen, setMobileGameNewsMenuOpen] = useState(false);
	const [mobileCommunityMenuOpen, setMobileCommunityMenuOpen] = useState(false);
	const [mobileGuildMenuOpen, setMobileGuildMenuOpen] = useState(false);
	const [preferredGuildSlug, setPreferredGuildSlug] = useState<string | null>(null);

	/**
	 * Utility function handleNavigation.
	 */
	const handleNavigation = (path:string):void => {
		if(typeof document !== "undefined"){
			(document.activeElement as HTMLElement | null)?.blur?.();
		}
		navigate(path);
		setMobileMenuOpen(false);
		setMobileGameNewsMenuOpen(false);
		setMobileCommunityMenuOpen(false);
		setMobileGuildMenuOpen(false);
	};

	/**
	 * Utility function handleLogout.
	 */
	const handleLogout = ():void => {
		if(typeof document !== "undefined"){
			(document.activeElement as HTMLElement | null)?.blur?.();
		}
		logout();
		setMobileMenuOpen(false);
		setMobileGameNewsMenuOpen(false);
		setMobileCommunityMenuOpen(false);
		setMobileGuildMenuOpen(false);
		navigate("/");
	};

	/**
	 * Utility function isActive.
	 */
	const isActive = (path:string):boolean => {
		if(path === "/"){
			return location.pathname === "/";
		}
		return location.pathname === path || location.pathname.startsWith(`${path}/`);
	};

	const isGameNewsMenuActive = isActive("/news") || isActive("/events");
	const isCommunityMenuActive = isActive("/board") || isActive("/gallery");
	const isGuildMenuActive = isActive("/guild");
	const displayNickname = user?.nickname || user?.username || "Profile";
	const displayInitial = displayNickname.charAt(0).toUpperCase();

	/**
	 * Utility function resolveGuildMenuPathWithSlug.
	 */
	const resolveGuildMenuPathWithSlug = (path:string, guildSlug:string):string => {
		if(path === "/guild"){
			return `/guild/${guildSlug}`;
		}
		if(path === "/guild/gallery"){
			return `/guild/${guildSlug}/gallery`;
		}
		if(path === "/guild/board"){
			return `/guild/${guildSlug}/board`;
		}
		return path;
	};

	/**
	 * Utility function resolveGuildMenuPath.
	 */
	const resolveGuildMenuPath = (path:string):string => {
		if(!preferredGuildSlug){
			return path;
		}
		return resolveGuildMenuPathWithSlug(path, preferredGuildSlug);
	};

	/**
	 * Utility function async.
	 */
	const fetchPreferredGuildSlug = async():Promise<string | null> => {
		if(!user){
			return null;
		}
		try{
			const dashboard = await guildService.getDashboard();
			let preferredGuildName = dashboard.myApprovedGuild?.guildName?.trim() ?? "";
			if(!preferredGuildName){
				preferredGuildName = dashboard.ownedGuildRequests.find((guild) => guild.status === "APPROVED")?.guildName?.trim() ?? "";
			}
			if(!preferredGuildName && dashboard.myMembership?.guildId != null){
				preferredGuildName = dashboard.approvedGuilds
					.find((guild) => guild.guildId === dashboard.myMembership?.guildId)
					?.guildName?.trim() ?? "";
			}
			if(!preferredGuildName){
				return null;
			}
			const myGuildSlug = toGuildSlug(preferredGuildName);
			if(!myGuildSlug){
				return null;
			}
			return myGuildSlug;
		}catch{
			return null;
		}
	};

	/**
	 * Utility function async.
	 */
	const handleGuildNavigation = async(path:string):Promise<void> => {
		if(preferredGuildSlug){
			handleNavigation(resolveGuildMenuPathWithSlug(path, preferredGuildSlug));
			return;
		}
		const loadedGuildSlug = await fetchPreferredGuildSlug();
		if(loadedGuildSlug){
			setPreferredGuildSlug((current) => current ?? loadedGuildSlug);
			handleNavigation(resolveGuildMenuPathWithSlug(path, loadedGuildSlug));
			return;
		}
		handleNavigation(path);
	};

	useEffect(() => {
		const match = location.pathname.match(/^\/guild\/([^/]+)(?:\/|$)/);
		const candidate = match?.[1]?.trim() ?? "";
		if(!candidate){
			return;
		}
		const lowerCandidate = candidate.toLowerCase();
		if(lowerCandidate === "board" || lowerCandidate === "gallery"){
			return;
		}
		setPreferredGuildSlug(candidate);
	}, [location.pathname]);

	useEffect(() => {
		if(!user){
			setPreferredGuildSlug(null);
			return;
		}
		let cancelled = false;
		/**
		 * Utility function async.
		 */
		const loadPreferredGuildSlug = async() => {
			const loadedGuildSlug = await fetchPreferredGuildSlug();
			if(!cancelled && loadedGuildSlug){
				setPreferredGuildSlug(loadedGuildSlug);
			}
		};
		void loadPreferredGuildSlug();
		return () => {
			cancelled = true;
		};
	}, [user]);

	useEffect(() => {
		setMobileMenuOpen(false);
		setMobileGameNewsMenuOpen(false);
		setMobileCommunityMenuOpen(false);
		setMobileGuildMenuOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		/**
		 * Utility function handleResize.
		 */
		const handleResize = () => {
			if(window.innerWidth > MOBILE_MENU_BREAKPOINT){
				setMobileMenuOpen(false);
				setMobileGameNewsMenuOpen(false);
				setMobileCommunityMenuOpen(false);
				setMobileGuildMenuOpen(false);
			}
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	/**
	 * Utility function renderCommonButtons.
	 */
	const renderCommonButtons = () => (
		<>
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
				className={`nav-btn ${(isActive("/items") || isActive("/item") || isActive("/barter") || isActive("/craft")) ? "active" : ""}`}
				onClick={() => handleNavigation("/items")}
			>
				<Package size={16}/>
				아이템
			</button>
		</>
	);

	/**
	 * Utility function renderCommunitySubmenuButtons.
	 */
	const renderCommunitySubmenuButtons = (buttonClassName:string) => (
		<>
			{COMMUNITY_SUB_MENUS.map((item) => {
				const Icon = item.icon;
				const isItemActive = isActive(item.path);
				return (
					<button
						key={item.path}
						type="button"
						className={`${buttonClassName} ${isItemActive ? "active" : ""}`}
						onClick={() => handleNavigation(item.path)}
					>
						<Icon size={14}/>
						<span>{item.label}</span>
					</button>
				);
			})}
		</>
	);

	/**
	 * Utility function renderGameNewsSubmenuButtons.
	 */
	const renderGameNewsSubmenuButtons = (buttonClassName:string) => (
		<>
			{GAME_NEWS_SUB_MENUS.map((item) => {
				const Icon = item.icon;
				return (
					<button
						key={item.path}
						type="button"
						className={`${buttonClassName} ${isActive(item.path) ? "active" : ""}`}
						onClick={() => handleNavigation(item.path)}
					>
						<Icon size={14}/>
						<span>{item.label}</span>
					</button>
				);
			})}
		</>
	);

	/**
	 * Utility function renderGuildSubmenuButtons.
	 */
	const renderGuildSubmenuButtons = (buttonClassName:string) => (
		<>
			{GUILD_SUB_MENUS.map((item) => {
				const Icon = item.icon;
				const targetPath = resolveGuildMenuPath(item.path);
				return (
					<button
						key={item.path}
						type="button"
						className={`${buttonClassName} ${(isActive(targetPath) || isActive(item.path)) ? "active" : ""}`}
						onClick={() => {
							void handleGuildNavigation(item.path);
						}}
					>
						<Icon size={14}/>
						<span>{item.label}</span>
					</button>
				);
			})}
		</>
	);

	return (
		<header className="header">
			<div className="container">
				<div className="header-content">
					<div className="logo" onClick={() => handleNavigation("/")}>
						<img src="/logo.png" alt="Sexynogi 로고" className="logo-icon"/>
						<span>Sexynogi</span>
					</div>

					<div className="header-right">
						<nav className="nav desktop-nav">
							<div className={`nav-group nav-group-game-news ${isGameNewsMenuActive ? "active" : ""}`}>
								<button
									type="button"
									className={`nav-btn nav-btn-parent ${isGameNewsMenuActive ? "active" : ""}`}
									onClick={() => handleNavigation("/news/notice")}
									aria-haspopup="true"
								>
									<Megaphone size={16}/>
									<span>게임 소식</span>
									<ChevronDown size={14} className="nav-caret"/>
								</button>
								<div className="nav-submenu" role="menu" aria-label="게임 소식 하위 메뉴">
									{renderGameNewsSubmenuButtons("nav-submenu-btn")}
								</div>
							</div>
							<div className={`nav-group nav-group-community ${isCommunityMenuActive ? "active" : ""}`}>
								<button
									type="button"
									className={`nav-btn nav-btn-parent ${isCommunityMenuActive ? "active" : ""}`}
									onClick={() => handleNavigation("/board")}
									aria-haspopup="true"
								>
									<MessageSquare size={16}/>
									<span>커뮤니티</span>
									<ChevronDown size={14} className="nav-caret"/>
								</button>
								<div className="nav-submenu" role="menu" aria-label="커뮤니티 하위 메뉴">
									{renderCommunitySubmenuButtons("nav-submenu-btn")}
								</div>
							</div>
							{renderCommonButtons()}
							<div className={`nav-group nav-group-guild ${isGuildMenuActive ? "active" : ""}`}>
								<button
									type="button"
									className={`nav-btn nav-btn-parent ${isGuildMenuActive ? "active" : ""}`}
									onClick={() => {
										void handleGuildNavigation("/guild");
									}}
									aria-haspopup="true"
								>
									<Users size={16}/>
									<span>길드</span>
									<ChevronDown size={14} className="nav-caret"/>
								</button>
								<div className="nav-submenu" role="menu" aria-label="길드 하위 메뉴">
									{renderGuildSubmenuButtons("nav-submenu-btn")}
								</div>
							</div>
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
							<div className={`mobile-nav-group ${mobileGameNewsMenuOpen ? "open" : ""}`}>
								<button
									type="button"
									className={`nav-btn nav-btn-parent ${isGameNewsMenuActive ? "active" : ""}`}
									onClick={() => setMobileGameNewsMenuOpen((prev) => !prev)}
									aria-expanded={mobileGameNewsMenuOpen}
									aria-controls="mobile-game-news-submenu"
								>
									<Megaphone size={16}/>
									<span>게임 소식</span>
									<ChevronDown size={14} className={`nav-caret ${mobileGameNewsMenuOpen ? "open" : ""}`}/>
								</button>
								<div
									id="mobile-game-news-submenu"
									className={`mobile-nav-submenu ${mobileGameNewsMenuOpen ? "open" : ""}`}
								>
									{renderGameNewsSubmenuButtons("nav-submenu-btn mobile-nav-submenu-btn")}
								</div>
							</div>
							<div className={`mobile-nav-group ${mobileCommunityMenuOpen ? "open" : ""}`}>
								<button
									type="button"
									className={`nav-btn nav-btn-parent ${isCommunityMenuActive ? "active" : ""}`}
									onClick={() => setMobileCommunityMenuOpen((prev) => !prev)}
									aria-expanded={mobileCommunityMenuOpen}
									aria-controls="mobile-community-submenu"
								>
									<MessageSquare size={16}/>
									<span>커뮤니티</span>
									<ChevronDown size={14} className={`nav-caret ${mobileCommunityMenuOpen ? "open" : ""}`}/>
								</button>
								<div
									id="mobile-community-submenu"
									className={`mobile-nav-submenu ${mobileCommunityMenuOpen ? "open" : ""}`}
								>
									{renderCommunitySubmenuButtons("nav-submenu-btn mobile-nav-submenu-btn")}
								</div>
							</div>
							{renderCommonButtons()}
							<div className={`mobile-nav-group ${mobileGuildMenuOpen ? "open" : ""}`}>
								<button
									type="button"
									className={`nav-btn nav-btn-parent ${isGuildMenuActive ? "active" : ""}`}
									onClick={() => setMobileGuildMenuOpen((prev) => !prev)}
									aria-expanded={mobileGuildMenuOpen}
									aria-controls="mobile-guild-submenu"
								>
									<Users size={16}/>
									<span>길드</span>
									<ChevronDown size={14} className={`nav-caret ${mobileGuildMenuOpen ? "open" : ""}`}/>
								</button>
								<div
									id="mobile-guild-submenu"
									className={`mobile-nav-submenu ${mobileGuildMenuOpen ? "open" : ""}`}
								>
									{renderGuildSubmenuButtons("nav-submenu-btn mobile-nav-submenu-btn")}
								</div>
							</div>
						</nav>
					</>
				)}
			</div>
		</header>
	);
};

export default Header;
