import React from "react";

interface LoadingScreenProps{
	message?:string;
}

const LoadingScreen:React.FC<LoadingScreenProps> = ({message = "Loading..."}) => {
	return (
		<div className="loading-screen">
			<div className="loading-spinner"></div>
			<p>{message}</p>
		</div>
	);
};

export default LoadingScreen;
