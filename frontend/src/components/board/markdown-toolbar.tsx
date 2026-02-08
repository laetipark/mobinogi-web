import React from "react";
import {
	Heading1, Heading2, Heading3,
	Bold, Italic, Strikethrough,
	Quote, Code, FileCode,
	ListOrdered, List, Link, Minus
} from "lucide-react";
import styles from "./markdown-toolbar.module.scss";

interface MarkdownToolbarProps {
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	content: string;
	setContent: (content: string) => void;
}

interface ToolbarAction {
	icon: React.ReactNode;
	title: string;
	action: () => void;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({textareaRef, content, setContent}) => {

	const insertMarkdown = (before: string, after: string, placeholder: string, isLine?: boolean) => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = content.substring(start, end);
		const text = selected || placeholder;

		let newContent: string;
		let cursorStart: number;
		let cursorEnd: number;

		if (isLine) {
			// Line-prefix style (headings, quotes, lists)
			const lineStart = content.lastIndexOf("\n", start - 1) + 1;
			const prefix = before;
			newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
			cursorStart = start + prefix.length;
			cursorEnd = end + prefix.length;
		} else if (selected) {
			// Wrap selected text
			newContent = content.substring(0, start) + before + selected + after + content.substring(end);
			cursorStart = start + before.length;
			cursorEnd = cursorStart + selected.length;
		} else {
			// Insert with placeholder
			newContent = content.substring(0, start) + before + text + after + content.substring(end);
			cursorStart = start + before.length;
			cursorEnd = cursorStart + text.length;
		}

		setContent(newContent);

		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(cursorStart, cursorEnd);
		}, 0);
	};

	const insertBlock = (before: string, after: string, placeholder: string) => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = content.substring(start, end) || placeholder;

		const needsNewlineBefore = start > 0 && content[start - 1] !== "\n";
		const needsNewlineAfter = end < content.length && content[end] !== "\n";

		const prefix = needsNewlineBefore ? "\n" : "";
		const suffix = needsNewlineAfter ? "\n" : "";

		const inserted = prefix + before + selected + after + suffix;
		const newContent = content.substring(0, start) + inserted + content.substring(end);

		const selectStart = start + prefix.length + before.length;
		const selectEnd = selectStart + selected.length;

		setContent(newContent);

		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(selectStart, selectEnd);
		}, 0);
	};

	const insertLink = () => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = content.substring(start, end);

		const linkText = selected || "링크 텍스트";
		const markdown = `[${linkText}](url)`;

		const newContent = content.substring(0, start) + markdown + content.substring(end);
		setContent(newContent);

		setTimeout(() => {
			textarea.focus();
			// Select "url" part for easy replacement
			const urlStart = start + linkText.length + 3;
			textarea.setSelectionRange(urlStart, urlStart + 3);
		}, 0);
	};

	const insertHorizontalRule = () => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const needsNewline = start > 0 && content[start - 1] !== "\n";
		const rule = (needsNewline ? "\n" : "") + "---\n";
		const newContent = content.substring(0, start) + rule + content.substring(start);

		const newPos = start + rule.length;
		setContent(newContent);

		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(newPos, newPos);
		}, 0);
	};

	const groups: ToolbarAction[][] = [
		[
			{icon: <Heading1 size={16}/>, title: "제목 1", action: () => insertMarkdown("# ", "", "제목", true)},
			{icon: <Heading2 size={16}/>, title: "제목 2", action: () => insertMarkdown("## ", "", "제목", true)},
			{icon: <Heading3 size={16}/>, title: "제목 3", action: () => insertMarkdown("### ", "", "제목", true)},
		],
		[
			{icon: <Bold size={16}/>, title: "굵게", action: () => insertMarkdown("**", "**", "굵은 텍스트")},
			{icon: <Italic size={16}/>, title: "기울임", action: () => insertMarkdown("*", "*", "기울임 텍스트")},
			{icon: <Strikethrough size={16}/>, title: "취소선", action: () => insertMarkdown("~~", "~~", "취소선 텍스트")},
		],
		[
			{icon: <Quote size={16}/>, title: "인용", action: () => insertMarkdown("> ", "", "인용문", true)},
			{icon: <Code size={16}/>, title: "인라인 코드", action: () => insertMarkdown("`", "`", "코드")},
			{icon: <FileCode size={16}/>, title: "코드 블록", action: () => insertBlock("```\n", "\n```", "코드 블록")},
		],
		[
			{icon: <ListOrdered size={16}/>, title: "순서 목록", action: () => insertMarkdown("1. ", "", "항목", true)},
			{icon: <List size={16}/>, title: "비순서 목록", action: () => insertMarkdown("- ", "", "항목", true)},
		],
		[
			{icon: <Link size={16}/>, title: "링크", action: () => insertLink()},
			{icon: <Minus size={16}/>, title: "구분선", action: () => insertHorizontalRule()},
		],
	];

	return (
		<div className={styles.toolbar}>
			{groups.map((group, gi) => (
				<React.Fragment key={gi}>
					{gi > 0 && <span className={styles.divider}/>}
					{group.map((item, ii) => (
						<button
							key={ii}
							type="button"
							className={styles.toolBtn}
							title={item.title}
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
