import React from "react";
import {useAuth} from "../hooks/use-auth";
import "../styles/kakao-login.css";

interface KakaoLoginProps{
	showTitle?:boolean;
	redirectPath?:string;
}

const KakaoLogin:React.FC<KakaoLoginProps> = ({
	showTitle = true
}) => {
	const {
		user,
		kakaoLogin,
		kakaoLogout,
		isKakaoLoggedIn,
		kakaoLoading,
		kakaoError
	} = useAuth();
	
	// 로그인된 상태일 때 사용자 정보 표시
	if(isKakaoLoggedIn && user){
		return (
			<div className="kakao-login-container logged-in">
				<div className="user-profile">
					<img
						src={user.profileImage || "/default-avatar.png"}
						alt="프로필"
						className="profile-image"
						onError={(e) => {
							(e.target as HTMLImageElement).src = "/default-avatar.png";
						}}
					/>
					<div className="user-info">
						<h3>환영합니다!</h3>
						<p className="nickname">{user.nickname || user.username}님</p>
						{user.email && <p className="email">{user.email}</p>}
						<div className="provider-badge">
							<span className="kakao-badge">카카오 계정</span>
						</div>
					</div>
				</div>
				<button className="logout-btn" onClick={kakaoLogout}>
					로그아웃
				</button>
			</div>
		);
	}
	
	// 로그인하지 않은 상태일 때 로그인 폼 표시
	return (
		<div className="kakao-login-container">
			{showTitle && <h2>Mobinogi 로그인</h2>}
			
			{kakaoError && (
				<div className="error-message">
					<span className="error-icon">⚠️</span>
					{kakaoError}
				</div>
			)}
			
			<button
				className={"kakao-login-btn"}
				onClick={kakaoLogin}
				disabled={kakaoLoading}
			>
				{kakaoLoading ? (
					<div className="loading-content">
						<div className="loading-spinner"></div>
						<span>로그인 중...</span>
					</div>
				) : (
					<div className="login-content">
						<div className="kakao-logo">K</div>
						<span>카카오 로그인</span>
					</div>
				)}
			</button>
			
			<div className="login-description">
				<p>카카오 계정으로 간편하게 로그인하세요</p>
				<div className="features">
					<div className="feature">
						<span className="feature-icon">✓</span>
						<span>별도의 회원가입 절차 없음</span>
					</div>
					<div className="feature">
						<span className="feature-icon">✓</span>
						<span>안전하고 빠른 로그인</span>
					</div>
					<div className="feature">
						<span className="feature-icon">✓</span>
						<span>카카오 계정으로 자동 가입</span>
					</div>
				</div>
			</div>
			
			<div className="divider">
				<span>또는</span>
			</div>
			
			<div className="alternative-login">
				<p>기존 계정이 있으신가요?</p>
				<a href="/login" className="traditional-login-link">
					일반 로그인하기
				</a>
			</div>
		</div>
	);
};

export default KakaoLogin;