import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "@/hooks/use-auth";
import {useSeo} from "@/hooks/use-seo";
import styles from "./register-nickname.module.scss";

const RegisterNicknamePage:React.FC = () => {
	const navigate = useNavigate();
	const {pendingKakaoUser, completeKakaoRegistration, kakaoLoading, kakaoError} = useAuth();

	useSeo({
		title : "닉네임 등록",
		description : "Sexynogi 가입을 완료하려면 사용할 닉네임을 설정하세요.",
		canonicalPath : "/register/nickname",
		noindex : true
	});

	const [nickname, setNickname] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if(!pendingKakaoUser){
			navigate("/login");
		}
	}, [pendingKakaoUser, navigate]);

	/**
	 * Utility function async.
	 */
	const handleSubmit = async(e:React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if(!nickname.trim()){
			setError("닉네임을 입력해 주세요.");
			return;
		}

		if(nickname.length < 2 || nickname.length > 20){
			setError("닉네임은 2~20자 사이로 입력해 주세요.");
			return;
		}

		try{
			await completeKakaoRegistration(nickname);
			navigate("/");
		}catch(err:any){
			setError(err.message || "닉네임 등록 중 오류가 발생했습니다.");
		}
	};

	if(!pendingKakaoUser){
		return null;
	}

	return (
		<div className={styles.registerPage}>
			<div className={styles.registerContainer}>
				<h2>닉네임 설정</h2>
				<p className={styles.description}>
					Sexynogi에서 사용할 닉네임을 입력해 주세요.
				</p>

				{pendingKakaoUser.profileImage && (
					<div className={styles.profilePreview}>
						<img
							src={pendingKakaoUser.profileImage}
							alt="프로필 이미지"
							onError={(e) => {
								(e.target as HTMLImageElement).style.display = "none";
							}}
						/>
					</div>
				)}

				<form onSubmit={handleSubmit} className={styles.form}>
					<div className={styles.inputGroup}>
						<label htmlFor="nickname">닉네임</label>
						<input
							type="text"
							id="nickname"
							value={nickname}
							onChange={(e) => setNickname(e.target.value)}
							placeholder="닉네임을 입력해 주세요"
							maxLength={20}
							autoFocus
						/>
						<span className={styles.charCount}>{nickname.length}/20</span>
					</div>

					{(error || kakaoError) && (
						<div className={styles.errorMessage}>
							{error || kakaoError}
						</div>
					)}

					<button
						type="submit"
						className={styles.submitBtn}
						disabled={kakaoLoading}
					>
						{kakaoLoading ? "등록 중..." : "등록 완료"}
					</button>
				</form>

				<button
					className={styles.cancelBtn}
					onClick={() => navigate("/login")}
				>
					취소
				</button>
			</div>
		</div>
	);
};

export default RegisterNicknamePage;
