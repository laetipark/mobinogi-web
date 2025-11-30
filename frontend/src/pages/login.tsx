import React from "react";
import KakaoLogin from "../components/kakao-login";

const LoginPage:React.FC = () => {
	return (
		<div style={{display : "flex", justifyContent : "center", marginTop : "50px"}}>
			<KakaoLogin showTitle={true}/>
		</div>
	);
};

export default LoginPage;
