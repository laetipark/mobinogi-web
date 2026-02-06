import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "@/hooks/use-auth";
import styles from "./register-nickname.module.scss";

const RegisterNicknamePage:React.FC = () => {
	const navigate = useNavigate();
	const {pendingKakaoUser, completeKakaoRegistration, kakaoLoading, kakaoError} = useAuth();
	const [nickname, setNickname] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// 대기 중인 카카오 사용자 정보가 없으면 로그인 페이지로 이동
		if(!pendingKakaoUser){
			navigate("/login");
		}
	}, [pendingKakaoUser, navigate]);

	const handleSubmit = async(e:React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if(!nickname.trim()){
			setError("닉네임을 입력해주세요.");
			return;
		}

		if(nickname.length < 2 || nickname.length > 20){
			setError("닉네임은 2~20자 사이로 입력해주세요.");
			return;
		}

		try{
			await completeKakaoRegistration(nickname);
			navigate("/");
		}catch(err:any){
			setError(err.message || "회원가입 중 오류가 발생했습니다.");
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
					Mobinogi에서 사용할 닉네임을 입력해주세요.
				</p>

				{pendingKakaoUser.profileImage && (
					<div className={styles.profilePreview}>
						<img
							src={pendingKakaoUser.profileImage}
							alt="프로필"
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
							placeholder="닉네임을 입력하세요"
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
						{kakaoLoading ? "가입 중..." : "가입 완료"}
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
