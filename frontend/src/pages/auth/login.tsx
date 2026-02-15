import React from "react";
import KakaoLogin from "@/components/auth/kakao-login";

const LoginPage:React.FC = () => {
	return (
		<div className="auth-page">
			<KakaoLogin showTitle={true}/>
		</div>
	);
};

export default LoginPage;
