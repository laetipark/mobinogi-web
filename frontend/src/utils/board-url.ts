export const toBoardSlug = (value:string):string => {
	return value
		.trim()
		.replace(/[^\p{L}\p{N}]+/gu, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
};

export const createBoardPostPath = (title:string):string => {
	const slug = toBoardSlug(title);
	if(!slug){
		return "/board";
	}
	return `/board/${slug}`;
};
