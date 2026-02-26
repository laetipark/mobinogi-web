import React, {useCallback, useEffect, useMemo} from "react";
import type {MarkdownToolbarProps, ToolbarAction} from "@/types/ui";
import {
	Heading1, Heading2, Heading3,
	Bold, Italic, Strikethrough,
	Quote, Code, FileCode,
	ListOrdered, List, Link, Minus
} from "lucide-react";
import styles from "./markdown-toolbar.module.scss";

type CaretState = {
	start:number;
	end:number;
	scrollTop:number;
	scrollLeft:number;
};

const focusWithoutScroll = (textarea:HTMLTextAreaElement) => {
	try{
		textarea.focus({preventScroll : true});
	}catch{
		textarea.focus();
	}
};

const restoreCaret = (
	textarea:HTMLTextAreaElement,
	nextStart:number,
	nextEnd:number,
	scrollTop:number,
	scrollLeft:number
) => {
	window.requestAnimationFrame(() => {
		focusWithoutScroll(textarea);
		textarea.setSelectionRange(nextStart, nextEnd);
		textarea.scrollTop = scrollTop;
		textarea.scrollLeft = scrollLeft;
	});
};

const MarkdownToolbar:React.FC<MarkdownToolbarProps> = ({textareaRef, content, setContent}) => {

	const getCaretState = useCallback(():CaretState | null => {
		const textarea = textareaRef.current;
		if(!textarea){
			return null;
		}
		return {
			start : textarea.selectionStart,
			end : textarea.selectionEnd,
			scrollTop : textarea.scrollTop,
			scrollLeft : textarea.scrollLeft
		};
	}, [textareaRef]);

	const applyContent = useCallback((
		nextContent:string,
		nextStart:number,
		nextEnd:number,
		caretState:CaretState
	) => {
		const textarea = textareaRef.current;
		setContent(nextContent);
		if(!textarea){
			return;
		}
		restoreCaret(
			textarea,
			nextStart,
			nextEnd,
			caretState.scrollTop,
			caretState.scrollLeft
		);
	}, [setContent, textareaRef]);

	const insertMarkdown = useCallback((
		before:string,
		after:string,
		placeholder:string,
		isLine:boolean = false
	) => {
		const caretState = getCaretState();
		if(!caretState){
			return;
		}

		const selected = content.substring(caretState.start, caretState.end);
		const text = selected || placeholder;

		let nextContent:string;
		let nextStart:number;
		let nextEnd:number;

		if(isLine){
			const lineStart = content.lastIndexOf("\n", caretState.start - 1) + 1;
			nextContent = content.substring(0, lineStart) + before + content.substring(lineStart);
			nextStart = caretState.start + before.length;
			nextEnd = caretState.end + before.length;
		}else if(selected){
			nextContent = content.substring(0, caretState.start) + before + selected + after + content.substring(caretState.end);
			nextStart = caretState.start + before.length;
			nextEnd = nextStart + selected.length;
		}else{
			nextContent = content.substring(0, caretState.start) + before + text + after + content.substring(caretState.end);
			nextStart = caretState.start + before.length;
			nextEnd = nextStart + text.length;
		}

		applyContent(nextContent, nextStart, nextEnd, caretState);
	}, [applyContent, content, getCaretState]);

	const insertBlock = useCallback((before:string, after:string, placeholder:string) => {
		const caretState = getCaretState();
		if(!caretState){
			return;
		}

		const selected = content.substring(caretState.start, caretState.end) || placeholder;
		const needsNewlineBefore = caretState.start > 0 && content[caretState.start - 1] !== "\n";
		const needsNewlineAfter = caretState.end < content.length && content[caretState.end] !== "\n";

		const prefix = needsNewlineBefore ? "\n" : "";
		const suffix = needsNewlineAfter ? "\n" : "";
		const inserted = prefix + before + selected + after + suffix;
		const nextContent = content.substring(0, caretState.start) + inserted + content.substring(caretState.end);
		const nextStart = caretState.start + prefix.length + before.length;
		const nextEnd = nextStart + selected.length;

		applyContent(nextContent, nextStart, nextEnd, caretState);
	}, [applyContent, content, getCaretState]);

	const insertLink = useCallback(() => {
		const caretState = getCaretState();
		if(!caretState){
			return;
		}

		const selected = content.substring(caretState.start, caretState.end);
		const linkText = selected || "링크 텍스트";
		const markdown = `[${linkText}](url)`;
		const nextContent = content.substring(0, caretState.start) + markdown + content.substring(caretState.end);
		const urlStart = caretState.start + linkText.length + 3;
		applyContent(nextContent, urlStart, urlStart + 3, caretState);
	}, [applyContent, content, getCaretState]);

	const insertHorizontalRule = useCallback(() => {
		const caretState = getCaretState();
		if(!caretState){
			return;
		}

		const needsNewline = caretState.start > 0 && content[caretState.start - 1] !== "\n";
		const rule = `${needsNewline ? "\n" : ""}---\n`;
		const nextContent = content.substring(0, caretState.start) + rule + content.substring(caretState.start);
		const nextPos = caretState.start + rule.length;
		applyContent(nextContent, nextPos, nextPos, caretState);
	}, [applyContent, content, getCaretState]);

	const actionMap = useMemo(() => ({
		h1 : () => insertMarkdown("# ", "", "제목", true),
		h2 : () => insertMarkdown("## ", "", "제목", true),
		h3 : () => insertMarkdown("### ", "", "제목", true),
		bold : () => insertMarkdown("**", "**", "굵은 텍스트"),
		italic : () => insertMarkdown("*", "*", "기울임 텍스트"),
		strike : () => insertMarkdown("~~", "~~", "취소선 텍스트"),
		quote : () => insertMarkdown("> ", "", "인용문", true),
		inlineCode : () => insertMarkdown("`", "`", "코드"),
		codeBlock : () => insertBlock("```\n", "\n```", "코드 블록"),
		orderedList : () => insertMarkdown("1. ", "", "항목", true),
		unorderedList : () => insertMarkdown("- ", "", "항목", true),
		link : () => insertLink(),
		rule : () => insertHorizontalRule()
	}), [insertBlock, insertHorizontalRule, insertLink, insertMarkdown]);

	useEffect(() => {
		const textarea = textareaRef.current;
		if(!textarea){
			return;
		}

		const onKeyDown = (event:KeyboardEvent) => {
			const isModifier = event.ctrlKey || event.metaKey;
			if(!isModifier){
				return;
			}

			const key = event.key.toLowerCase();

			if(!event.shiftKey && !event.altKey){
				if(key === "b"){
					event.preventDefault();
					actionMap.bold();
					return;
				}
				if(key === "i"){
					event.preventDefault();
					actionMap.italic();
					return;
				}
				if(key === "k"){
					event.preventDefault();
					actionMap.link();
					return;
				}
				if(key === "e"){
					event.preventDefault();
					actionMap.inlineCode();
					return;
				}
				if(key === "1"){
					event.preventDefault();
					actionMap.h1();
					return;
				}
				if(key === "2"){
					event.preventDefault();
					actionMap.h2();
					return;
				}
				if(key === "3"){
					event.preventDefault();
					actionMap.h3();
					return;
				}
			}

			if(event.shiftKey && !event.altKey){
				if(key === "x"){
					event.preventDefault();
					actionMap.strike();
					return;
				}
				if(key === "7"){
					event.preventDefault();
					actionMap.orderedList();
					return;
				}
				if(key === "8"){
					event.preventDefault();
					actionMap.unorderedList();
					return;
				}
				if(key === "c"){
					event.preventDefault();
					actionMap.codeBlock();
					return;
				}
				if(key === "h"){
					event.preventDefault();
					actionMap.rule();
					return;
				}
			}

			if(event.shiftKey && event.altKey && key === "."){
				event.preventDefault();
				actionMap.quote();
			}
		};

		textarea.addEventListener("keydown", onKeyDown);
		return () => {
			textarea.removeEventListener("keydown", onKeyDown);
		};
	}, [actionMap, textareaRef]);

	const groups:ToolbarAction[][] = [
		[
			{icon : <Heading1 size={16}/>, title : "제목 1 (Ctrl+1)", action : actionMap.h1},
			{icon : <Heading2 size={16}/>, title : "제목 2 (Ctrl+2)", action : actionMap.h2},
			{icon : <Heading3 size={16}/>, title : "제목 3 (Ctrl+3)", action : actionMap.h3}
		],
		[
			{icon : <Bold size={16}/>, title : "굵게 (Ctrl+B)", action : actionMap.bold},
			{icon : <Italic size={16}/>, title : "기울임 (Ctrl+I)", action : actionMap.italic},
			{icon : <Strikethrough size={16}/>, title : "취소선 (Ctrl+Shift+X)", action : actionMap.strike}
		],
		[
			{icon : <Quote size={16}/>, title : "인용 (Ctrl+Shift+Alt+.)", action : actionMap.quote},
			{icon : <Code size={16}/>, title : "인라인 코드 (Ctrl+E)", action : actionMap.inlineCode},
			{icon : <FileCode size={16}/>, title : "코드 블록 (Ctrl+Shift+C)", action : actionMap.codeBlock}
		],
		[
			{icon : <ListOrdered size={16}/>, title : "순서 목록 (Ctrl+Shift+7)", action : actionMap.orderedList},
			{icon : <List size={16}/>, title : "비순서 목록 (Ctrl+Shift+8)", action : actionMap.unorderedList}
		],
		[
			{icon : <Link size={16}/>, title : "링크 (Ctrl+K)", action : actionMap.link},
			{icon : <Minus size={16}/>, title : "구분선 (Ctrl+Shift+H)", action : actionMap.rule}
		]
	];

	return (
		<div className={styles.toolbar}>
			{groups.map((group, groupIndex) => (
				<React.Fragment key={groupIndex}>
					{groupIndex > 0 && <span className={styles.divider}/>}
					{group.map((item, itemIndex) => (
						<button
							key={itemIndex}
							type="button"
							className={styles.toolBtn}
							title={item.title}
							aria-label={item.title}
							onMouseDown={(event) => event.preventDefault()}
							onClick={item.action}
						>
							{item.icon}
						</button>
					))}
				</React.Fragment>
			))}
		</div>
	);
};

export default MarkdownToolbar;
