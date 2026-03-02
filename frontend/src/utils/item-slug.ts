/**
 * Utility function tryDecode.
 */
const tryDecode = (value:string):string => {
	try{
		return decodeURIComponent(value);
	}catch{
		return value;
	}
};

/**
 * Utility function toItemSlug.
 */
export const toItemSlug = (itemName:string):string => {
	return encodeURIComponent(itemName.trim().replace(/\s+/g, "-"));
};

/**
 * Utility function fromItemSlug.
 */
export const fromItemSlug = (slug:string):string => {
	return tryDecode(slug).replace(/-/g, " ").trim();
};

/**
 * Utility function toItemDetailPath.
 */
export const toItemDetailPath = (itemName:string):string => {
	return `/items/${toItemSlug(itemName)}/detail`;
};
