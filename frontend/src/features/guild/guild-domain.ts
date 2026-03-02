import type {GuildRole} from "@/types";

const ROLE_MEMBER:GuildRole = 0;
const ROLE_SUBMASTER:GuildRole = 1;
const ROLE_MASTER:GuildRole = 2;

const GUILD_ROLE_LABELS:Record<GuildRole, string> = {
	[ROLE_MEMBER] : "길드원",
	[ROLE_SUBMASTER] : "부마스터",
	[ROLE_MASTER] : "마스터"
};

export const GUILD_SERVER_OPTIONS:{id:number; name:string}[] = [
	{id : 1, name : "데이안"},
	{id : 2, name : "아이라"},
	{id : 3, name : "던컨"},
	{id : 4, name : "알리사"},
	{id : 5, name : "메이븐"},
	{id : 6, name : "라사"},
	{id : 7, name : "칼릭스"}
];

/**
 * Utility function normalizeGuildRole.
 */
export const normalizeGuildRole = (role:unknown):GuildRole => {
	const value = Number(role);
	if(value === ROLE_SUBMASTER || value === ROLE_MASTER){
		return value;
	}
	return ROLE_MEMBER;
};

/**
 * Utility function getGuildRoleLabel.
 */
export const getGuildRoleLabel = (role:unknown):string => GUILD_ROLE_LABELS[normalizeGuildRole(role)];

/**
 * Utility function getGuildServerName.
 */
export const getGuildServerName = (serverId?:number | null):string => {
	if(serverId == null){
		return "-";
	}
	return GUILD_SERVER_OPTIONS.find((server) => server.id === serverId)?.name ?? `서버 ${serverId}`;
};

/**
 * Utility function formatGuildDateTime.
 */
export const formatGuildDateTime = (value?:string | null):string => {
	if(!value){
		return "-";
	}
	const date = new Date(value);
	if(Number.isNaN(date.getTime())){
		return value;
	}
	return date.toLocaleString();
};

/**
 * Utility function toGuildSlug.
 */
export const toGuildSlug = (guildName:string):string => {
	return guildName
		.trim()
		.toLowerCase()
		.replace(/[/?#%]/g, "-")
		.replace(/\s+/g, "-");
};
