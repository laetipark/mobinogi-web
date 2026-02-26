const tryDecode = (value:string):string => {
	try{
		return decodeURIComponent(value);
	}catch{
		return value;
	}
};

export const toItemSlug = (itemName:string):string => {
	return encodeURIComponent(itemName.trim().replace(/\s+/g, "-"));
};

export const fromItemSlug = (slug:string):string => {
	return tryDecode(slug).replace(/-/g, " ").trim();
};

export const toItemDetailPath = (itemName:string):string => {
	return `/items/${toItemSlug(itemName)}/detail`;
};
