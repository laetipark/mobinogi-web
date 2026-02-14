import React from "react";
import {useAuth} from "@/hooks";
import {Navigate} from "react-router-dom";
import CharacterManager from "../../components/user/character-manager";
import styles from "./characters.module.scss";

const CharactersPage:React.FC = () => {
	const {user} = useAuth();
	
	if(!user){
		return <Navigate to="/login" replace/>;
	}
	
	return (
		<div className={styles.charactersPage}>
			<div className={styles.container}>
				<CharacterManager/>
			</div>
		</div>
	);
};

export default CharactersPage;
