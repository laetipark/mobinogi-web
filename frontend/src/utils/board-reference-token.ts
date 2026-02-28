export type BoardReferenceTokenType = "item" | "barter" | "craft";

export type BoardReferenceToken = {
	type:BoardReferenceTokenType;
	fields:Record<string, string>;
};

const LANGUAGE_BY_TYPE:Record<BoardReferenceTokenType, string> = {
	item : "mbg-item",
	barter : "mbg-barter",
	craft : "mbg-craft"
};

const TYPE_BY_LANGUAGE:Record<string, BoardReferenceTokenType> = {
	"mbg-item" : "item",
	"mbg-barter" : "barter",
	"mbg-craft" : "craft"
};

const toSingleLine = (value:string):string => value.replace(/\r?\n+/g, " ").trim();

export const serializeBoardReferenceToken = (
	type:BoardReferenceTokenType,
	fields:Record<string, string | null | undefined>
):string => {
	const language = LANGUAGE_BY_TYPE[type];
	const serializedFields = Object.entries(fields)
		.map(([key, value]) => [key.trim(), toSingleLine(value ?? "")] as const)
		.filter(([key, value]) => Boolean(key) && Boolean(value))
		.map(([key, value]) => `${key}=${value}`);

	const body = serializedFields.join("\n");
	return `\`\`\`${language}\n${body}\n\`\`\``;
};

export const parseBoardReferenceToken = (
	className:string | undefined,
	rawValue:string
):BoardReferenceToken | null => {
	const match = /(?:^|\s)language-([^\s]+)/.exec(className ?? "");
	const language = match?.[1]?.trim().toLowerCase() ?? "";
	const type = TYPE_BY_LANGUAGE[language];
	if(!type){
		return null;
	}

	const fields:Record<string, string> = {};
	const lines = rawValue.replace(/\r/g, "").split("\n");
	for(const line of lines){
		const trimmed = line.trim();
		if(!trimmed){
			continue;
		}
		const separatorIndex = trimmed.indexOf("=");
		if(separatorIndex <= 0){
			continue;
		}
		const key = trimmed.slice(0, separatorIndex).trim();
		const value = trimmed.slice(separatorIndex + 1).trim();
		if(!key || !value){
			continue;
		}
		fields[key] = value;
	}

	if(Object.keys(fields).length === 0){
		return null;
	}

	return {type, fields};
};
