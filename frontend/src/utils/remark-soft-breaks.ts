type MarkdownNode = {
	type?:string;
	value?:string;
	children?:MarkdownNode[];
};

/**
 * Utility function shouldSkipChildren.
 */
const shouldSkipChildren = (nodeType?:string):boolean => {
	return nodeType === "code" || nodeType === "inlineCode";
};

/**
 * Utility function splitTextWithBreaks.
 */
const splitTextWithBreaks = (value:string):MarkdownNode[] => {
	const parts = value.split("\n");
	if(parts.length <= 1){
		return [{type : "text", value}];
	}

	const output:MarkdownNode[] = [];
	for(let i = 0; i < parts.length; i += 1){
		const part = parts[i];
		if(part.length > 0){
			output.push({type : "text", value : part});
		}
		if(i < parts.length - 1){
			output.push({type : "break"});
		}
	}

	if(output.length === 0){
		output.push({type : "text", value : ""});
	}

	return output;
};

/**
 * Utility function transformNode.
 */
const transformNode = (node:MarkdownNode) => {
	if(!Array.isArray(node.children) || shouldSkipChildren(node.type)){
		return;
	}

	for(let index = 0; index < node.children.length; index += 1){
		const child = node.children[index];
		if(child?.type === "text" && typeof child.value === "string" && child.value.includes("\n")){
			const replacement = splitTextWithBreaks(child.value);
			node.children.splice(index, 1, ...replacement);
			index += replacement.length - 1;
			continue;
		}

		if(child){
			transformNode(child);
		}
	}
};

/**
 * Utility function remarkSoftBreaks.
 */
export const remarkSoftBreaks = () => {
	return (tree:MarkdownNode) => {
		transformNode(tree);
		return tree;
	};
};
