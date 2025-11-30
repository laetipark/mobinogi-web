import React from "react";
import {useAuth} from "@/hooks/use-auth";
import styles from "@/assets/styles/kakao-login.module.scss";

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
			<div className={`${styles.kakaoLoginContainer} ${styles.loggedIn}`}>
				<div className={styles.userProfile}>
					<img
						src={user.profileImage || "/default-avatar.png"}
						alt="프로필"
						className={styles.profileImage}
						onError={(e) => {
							(e.target as HTMLImageElement).src = "/default-avatar.png";
						}}
					/>
					<div className={styles.userInfo}>
						<h3>환영합니다!</h3>
						<p className={styles.nickname}>{user.nickname || user.username}님</p>
						{user.email && <p className={styles.email}>{user.email}</p>}
						<div className={styles.providerBadge}>
							<span className={styles.kakaoBadge}>카카오 계정</span>
						</div>
					</div>
				</div>
				<button className={styles.logoutBtn} onClick={kakaoLogout}>
					로그아웃
				</button>
			</div>
		);
	}
	
	// 로그인하지 않은 상태일 때 로그인 폼 표시
	return (
		<div className={styles.kakaoLoginContainer}>
			{showTitle && <h2>Mobinogi 로그인</h2>}
			
			{kakaoError && (
				<div className={styles.errorMessage}>
					<span className={styles.errorIcon}>⚠️</span>
					{kakaoError}
				</div>
			)}
			
			<button
				className={styles.kakaoLoginBtn}
				onClick={kakaoLogin}
				disabled={kakaoLoading}
			>
				{kakaoLoading ? (
					<div className={styles.loadingContent}>
						<div className={styles.loadingSpinner}></div>
						<span>로그인 중...</span>
					</div>
				) : (
					<div className={styles.loginContent}>
						<div className={styles.kakaoLogo}>K</div>
						<span>카카오 로그인</span>
					</div>
				)}
			</button>
			
			<div className={styles.loginDescription}>
				<p>카카오 계정으로 간편하게 로그인하세요</p>
				<div className={styles.features}>
					<div className={styles.feature}>
						<span className={styles.featureIcon}>✓</span>
						<span>별도의 회원가입 절차 없음</span>
					</div>
					<div className={styles.feature}>
						<span className={styles.featureIcon}>✓</span>
						<span>안전하고 빠른 로그인</span>
					</div>
					<div className={styles.feature}>
						<span className={styles.featureIcon}>✓</span>
						<span>카카오 계정으로 자동 가입</span>
					</div>
				</div>
			</div>
			
			<div className={styles.divider}>
				<span>또는</span>
			</div>
			
			<div className={styles.alternativeLogin}>
				<p>기존 계정이 있으신가요?</p>
				<a href="/login" className={styles.traditionalLoginLink}>
					일반 로그인하기
				</a>
			</div>
		</div>
	);
};

export default KakaoLogin;