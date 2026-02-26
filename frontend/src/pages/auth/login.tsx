import React from "react";
import KakaoLogin from "@/components/auth/kakao-login";
import {useSeo} from "@/hooks/use-seo";

const LoginPage:React.FC = () => {
	useSeo({
		title : "로그인",
		description : "Sexynogi에 로그인하고 프로필 및 개인 기능을 동기화하세요.",
		canonicalPath : "/login",
		noindex : true
	});

	return (
		<div className="auth-page">
			<KakaoLogin showTitle={true}/>
		</div>
	);
};

export default LoginPage;
