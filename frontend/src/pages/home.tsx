import React from "react";
import {useNavigate} from "react-router-dom";
import {ChevronRight, Shield, Users, Settings, Gamepad2, Zap, BarChart3} from "lucide-react";
import {useAuth} from "../hooks/use-auth.ts";
import GuildManagementPage from "@/pages/guild-management.tsx";

const HomePage:React.FC = () => {
	const {user} = useAuth();
	const navigate = useNavigate();
	
	return (
		<div className="page">
			<GuildManagementPage>
			
			</GuildManagementPage>
			<div className="hero">
				<div className="hero-content">
					<div className="hero-badge">
						<Gamepad2 size={20}/>
						Controller Management System
					</div>
					<h1 className="hero-title">
						Manage Your <span className="gradient-text">Game Controllers</span> with Precision
					</h1>
					<p className="hero-description">
						Advanced controller information system designed for gamers and developers.
						Track, monitor, and optimize your gaming peripherals with real-time analytics.
					</p>
					{!user && (
						<div className="hero-actions">
							<button
								className="btn primary large"
								onClick={() => navigate("/register")}
							>
								Get Started
								<ChevronRight size={20}/>
							</button>
							<button
								className="btn secondary large"
								onClick={() => navigate("/login")}
							>
								Learn More
							</button>
						</div>
					)}
					{user && (
						<div className="hero-actions">
							<button
								className="btn primary large"
								onClick={() => navigate("/controllers")}
							>
								View Dashboard
								<ChevronRight size={20}/>
							</button>
						</div>
					)}
				</div>
				<div className="hero-visual">
					<div className="floating-card">
						<div className="card-header">
							<div className="status-dot active"></div>
							<span>Live Controller Status</span>
						</div>
						<div className="controller-preview">
							<Gamepad2 size={48}/>
							<div className="controller-info">
								<div className="info-row">
									<span>Model</span>
									<span>Xbox Elite Series 2</span>
								</div>
								<div className="info-row">
									<span>Battery</span>
									<span>89%</span>
								</div>
								<div className="info-row">
									<span>Connection</span>
									<span>Wireless</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			<div className="features">
				<div className="container">
					<div className="features-header">
						<h2>Powerful Features for Serious Gamers</h2>
						<p>Everything you need to monitor, optimize, and maintain your gaming controllers</p>
					</div>
					<div className="feature-grid">
						<div className="feature-card">
							<div className="feature-icon">
								<Shield size={24}/>
							</div>
							<h3>Secure Access</h3>
							<p>Enterprise-grade security for your controller data with encrypted storage and secure
								authentication.</p>
						</div>
						<div className="feature-card">
							<div className="feature-icon">
								<Users size={24}/>
							</div>
							<h3>Multi-User Support</h3>
							<p>Team collaboration and shared controller management for gaming teams and
								organizations.</p>
						</div>
						<div className="feature-card">
							<div className="feature-icon">
								<Settings size={24}/>
							</div>
							<h3>Advanced Settings</h3>
							<p>Fine-tune controller configurations, sensitivity settings, and performance
								optimization.</p>
						</div>
						<div className="feature-card">
							<div className="feature-icon">
								<Zap size={24}/>
							</div>
							<h3>Real-time Monitoring</h3>
							<p>Live tracking of battery levels, connection status, and performance metrics.</p>
						</div>
						<div className="feature-card">
							<div className="feature-icon">
								<BarChart3 size={24}/>
							</div>
							<h3>Analytics Dashboard</h3>
							<p>Comprehensive usage statistics and insights to optimize your gaming experience.</p>
						</div>
						<div className="feature-card">
							<div className="feature-icon">
								<Gamepad2 size={24}/>
							</div>
							<h3>Multi-Platform Support</h3>
							<p>Support for Xbox, PlayStation, Nintendo, and PC controllers.</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default HomePage;
