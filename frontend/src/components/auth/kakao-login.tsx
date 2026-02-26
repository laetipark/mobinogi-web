import React from "react";
import type {KakaoLoginProps} from "@/types/ui";
import {useAuth} from "@/hooks/use-auth";
import styles from "./kakao-login.module.scss";

const KakaoLogin:React.FC<KakaoLoginProps> = ({showTitle = true}) => {
	const {
		user,
		kakaoLogin,
		kakaoLogout,
		isKakaoLoggedIn,
		kakaoLoading,
		kakaoError
	} = useAuth();

	if(isKakaoLoggedIn && user){
		return (
			<div className={`${styles.kakaoLoginContainer} ${styles.loggedIn}`}>
				<div className={styles.userProfile}>
					<img
						src={user.profileImage || "/default-avatar.png"}
						alt="프로필 이미지"
						className={styles.profileImage}
						onError={(e) => {
							(e.target as HTMLImageElement).src = "/default-avatar.png";
						}}
					/>
					<div className={styles.userInfo}>
						<h3>로그인 완료</h3>
						<p className={styles.nickname}>{user.nickname || user.username}</p>
						{user.email && <p className={styles.email}>{user.email}</p>}
						<div className={styles.providerBadge}>
							<span className={styles.kakaoBadge}>카카오 연동</span>
						</div>
					</div>
				</div>
				<button className={styles.logoutBtn} onClick={kakaoLogout}>
					로그아웃
				</button>
			</div>
		);
	}

	return (
		<div className={styles.kakaoLoginContainer}>
			{showTitle && <h2>Sexynogi 로그인</h2>}

			{kakaoError && (
				<div className={styles.errorMessage}>
					<span className={styles.errorIcon}>!</span>
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
						<div className={styles.loadingSpinner}/>
						<span>로그인 중...</span>
					</div>
				) : (
					<div className={styles.loginContent}>
						<div className={styles.kakaoLogo}>K</div>
						<span>카카오로 로그인</span>
					</div>
				)}
			</button>

			<div className={styles.loginDescription}>
				<p>카카오 계정으로 빠르게 로그인할 수 있어요.</p>
				<div className={styles.features}>
					<div className={styles.feature}>
						<span className={styles.featureIcon}>-</span>
						<span>프로필 및 개인 기능 동기화</span>
					</div>
					<div className={styles.feature}>
						<span className={styles.featureIcon}>-</span>
						<span>게시판 작성과 댓글 기능 사용</span>
					</div>
					<div className={styles.feature}>
						<span className={styles.featureIcon}>-</span>
						<span>디스코드 연동으로 편의 기능 제공</span>
					</div>
				</div>
			</div>

			<div className={styles.divider}>
				<span>또는</span>
			</div>

			<div className={styles.alternativeLogin}>
				<p>문제가 있다면 일반 로그인 페이지로 이동해 주세요.</p>
				<a href="/login" className={styles.traditionalLoginLink}>
					일반 로그인으로 이동
				</a>
			</div>
		</div>
	);
};

export default KakaoLogin;
