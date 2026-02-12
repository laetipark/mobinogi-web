import React from "react";
import {useAuth} from "@/hooks";
import {Navigate} from "react-router-dom";
import CharacterManager from "../../components/user/character-manager";

const CharactersPage:React.FC = () => {
	const {user} = useAuth();
	
	if(!user){
		return <Navigate to="/login" replace/>;
	}
	
	return (
		<div style={{padding : "2rem"}}>
			<CharacterManager/>
		</div>
	);
};

export default CharactersPage;
