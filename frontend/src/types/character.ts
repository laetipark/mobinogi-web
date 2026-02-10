export interface UserCharacter{
	characterId:number;
	userId:number;
	characterName:string;
	displayOrder?:number;
	serverId?:number;
	serverName?:string;
	classId?:number;
	className?:string;
	createdAt:string;
	userPower?:number;
	userVitality?:number;
	userAttractiveness?:number;
}

export interface UserCharacterRequest{
	characterName:string;
	serverId?:number;
	classId?:number;
}

export interface GameMonster{
	monsterId:number;
	regionId:number;
	regionName:string | null;
	monsterType:string;
	monsterDifficulty:string;
	monsterName:string;
}
