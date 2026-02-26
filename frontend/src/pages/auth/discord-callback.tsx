import React, {useEffect, useRef, useState} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import {discordService} from "@/services/discord-service";
import {useAuth} from "@/hooks/use-auth";
import {useSeo} from "@/hooks/use-seo";

const DiscordCallbackPage:React.FC = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const {user, loading, checkLoginStatus} = useAuth();
	useSeo({
		title : "디스코드 연동 처리",
		description : "Sexynogi 디스코드 계정 연동을 처리하고 있습니다.",
		canonicalPath : "/discord-callback",
		noindex : true
	});
	const [error, setError] = useState<string | null>(null);
	const processedRef = useRef(false);

	useEffect(() => {
		// auth 로딩 중이면 대기
		if(loading) return;
		// 이미 처리했으면 스킵
		if(processedRef.current) return;

		const code = searchParams.get("code");
		if(!code){
			setError("인증 코드가 없습니다.");
			return;
		}

		const token = localStorage.getItem("accessToken");
		if(!token || !user){
			navigate("/login", {replace: true});
			return;
		}

		processedRef.current = true;

		discordService.handleCallback(code, token)
			.then(async (res) => {
				if(res.success){
					await checkLoginStatus();
					navigate("/profile", {replace: true});
				}else{
					setError(res.message || "Discord 연동에 실패했습니다.");
				}
			})
			.catch((err) => {
				setError(err.message || "Discord 연동 중 오류가 발생했습니다.");
			});
	}, [loading, user]);

	if(error){
		return (
			<div style={{padding: "40px", textAlign: "center"}}>
				<p>{error}</p>
				<button onClick={() => navigate("/profile")}>프로필로 돌아가기</button>
			</div>
		);
	}

	return (
		<div style={{padding: "40px", textAlign: "center"}}>
			<p>Discord 연동 중...</p>
		</div>
	);
};

export default DiscordCallbackPage;
