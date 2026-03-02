import React, {useState, useEffect, useRef, useCallback} from "react";
import {useNavigate, useParams} from "react-router-dom";
import ReactMarkdown, {type Components} from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type {
	BoardCategory, BoardPostCreateRequest, BoardPostUpdateRequest, GameItemSummary, LifeBarter, LifeCraft
} from "@/types";
import {boardService} from "@/services/board-service";
import GameItemService from "@/services/game-item-service";
import {uploadService} from "@/services/upload-service";
import {useAuth} from "@/hooks/use-auth";
import {useSeo} from "@/hooks/use-seo";
import {createBoardPostPath} from "@/utils/board-url";
import {toItemDetailPath} from "@/utils";
import {parseBoardReferenceToken, serializeBoardReferenceToken} from "@/utils/board-reference-token";
import {remarkSoftBreaks} from "@/utils/remark-soft-breaks";
import {ImagePlus, Search, Package, ArrowLeftRight, Hammer, X} from "lucide-react";
import MarkdownToolbar from "@/components/board/markdown-toolbar";
import styles from "./board-write.module.scss";

/**
 * Utility function renderReferenceTokenCard.
 */
const renderReferenceTokenCard = (className:string | undefined, rawValue:string) => {
	const token = parseBoardReferenceToken(className, rawValue);
	if(!token){
		return null;
	}

	const itemUrl = token.fields.itemUrl || token.fields.rewardUrl || token.fields.productUrl || "";
	const itemName = token.fields.itemName || token.fields.rewardName || token.fields.productName || "-";
	const ingredientName = token.fields.ingredientName || token.fields.exchangeName || "-";
	const ingredientUrl = token.fields.ingredientUrl || token.fields.exchangeUrl || "";
	const cardTitle = token.type === "item"
		? "아이템 정보"
		: token.type === "barter"
			? "물물교환 정보"
			: "제작 정보";

	const typeLabel = token.type === "item"
		? "ITEM"
		: token.type === "barter"
			? "BARTER"
			: "CRAFT";

	/**
	 * Utility function renderLinkOrText.
	 */
	const renderLinkOrText = (label:string, url?:string) => {
		/**
		 * Utility function normalizedLabel.
		 */
		const normalizedLabel = (label || "-").trim() || "-";
		/**
		 * Utility function normalizedUrl.
		 */
		const normalizedUrl = (url || "").trim();
		if(!normalizedUrl){
			return <span>{normalizedLabel}</span>;
		}
		return <a href={normalizedUrl}>{normalizedLabel}</a>;
	};

	return (
		<div className={`${styles.referenceCard} ${styles[`referenceCard_${token.type}`]}`}>
			<div className={styles.referenceCardHeader}>
				<strong>{cardTitle}</strong>
				<span>{typeLabel}</span>
			</div>
			<div className={styles.referenceCardRows}>
				<div className={styles.referenceCardRow}>
					<span className={styles.referenceCardKey}>{token.type === "barter" ? "획득 아이템" : "아이템"}</span>
					<span className={styles.referenceCardValue}>{renderLinkOrText(itemName, itemUrl)}</span>
				</div>
				{token.type !== "item" && (
					<div className={styles.referenceCardRow}>
						<span className={styles.referenceCardKey}>{token.type === "barter" ? "교환 아이템" : "재료"}</span>
						<span className={styles.referenceCardValue}>{renderLinkOrText(ingredientName, ingredientUrl)}</span>
					</div>
				)}
				{token.fields.category && (
					<div className={styles.referenceCardRow}>
						<span className={styles.referenceCardKey}>분류</span>
						<span className={styles.referenceCardValue}>{token.fields.category}</span>
					</div>
				)}
				{token.fields.rarity && (
					<div className={styles.referenceCardRow}>
						<span className={styles.referenceCardKey}>등급</span>
						<span className={styles.referenceCardValue}>{token.fields.rarity}</span>
					</div>
				)}
				{token.type === "barter" && (
					<>
						<div className={styles.referenceCardRow}>
							<span className={styles.referenceCardKey}>지역/NPC</span>
							<span className={styles.referenceCardValue}>{`${token.fields.region || "-"} / ${token.fields.npc || "-"}`}</span>
						</div>
						<div className={styles.referenceCardRow}>
							<span className={styles.referenceCardKey}>횟수/보상</span>
							<span className={styles.referenceCardValue}>
								{`최대 ${token.fields.maxTrades || "-"}회, 1회 x${token.fields.rewardPerTrade || "-"}`}
							</span>
						</div>
					</>
				)}
				{token.type === "craft" && (
					<div className={styles.referenceCardRow}>
						<span className={styles.referenceCardKey}>레벨/시간</span>
						<span className={styles.referenceCardValue}>
							{`${token.fields.level || "-"} / ${token.fields.time || "-"}`}
						</span>
					</div>
				)}
				{token.fields.source && (
					<div className={styles.referenceCardRow}>
						<span className={styles.referenceCardKey}>출처</span>
						<span className={styles.referenceCardValue}>{token.fields.source}</span>
					</div>
				)}
			</div>
		</div>
	);
};

const markdownComponents:Components = {
	table: ({children, ...props}) => (
		<div className={styles.tableWrapper}>
			<table {...props}>{children}</table>
		</div>
	),
	pre: ({children, ...props}) => {
		const child = React.Children.toArray(children)[0];
		if(React.isValidElement(child)){
			/**
			 * Utility function className.
			 */
			const className = (child.props as {className?:string}).className;
			const rawValue = String((child.props as {children?:React.ReactNode}).children ?? "").trim();
			const referenceCard = renderReferenceTokenCard(className, rawValue);
			if(referenceCard){
				return referenceCard;
			}
		}
		return <pre {...props}>{children}</pre>;
	}
};

/**
 * Constant markdownRehypePlugins.
 */
const markdownRehypePlugins = [rehypeRaw, rehypeSanitize];
/**
 * Constant markdownRemarkPlugins.
 */
const markdownRemarkPlugins = [remarkGfm, remarkSoftBreaks];
type ReferenceTab = "item" | "barter" | "craft";

/**
 * Constant MAX_REFERENCE_RESULTS.
 */
const MAX_REFERENCE_RESULTS = 8;

/**
 * Utility function toSingleLine.
 */
const toSingleLine = (value:string | null | undefined):string => (value ?? "").replace(/\s+/g, " ").trim();

/**
 * Utility function toSafeInteger.
 */
const toSafeInteger = (value:number | string | null | undefined):number => {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
};

/**
 * Utility function toDisplayValue.
 */
const toDisplayValue = (value:string | null | undefined, fallback:string = "-"):string => {
	const normalized = toSingleLine(value);
	return normalized || fallback;
};

/**
 * Utility function formatProcessingTime.
 */
const formatProcessingTime = (processingTime:number | null | undefined):string => {
	if(processingTime === null || processingTime === undefined){
		return "-";
	}
	const minutes = Math.floor(processingTime / 60);
	const seconds = processingTime % 60;
	if(minutes <= 0){
		return `${seconds}초`;
	}
	if(seconds === 0){
		return `${minutes}분`;
	}
	return `${minutes}분 ${seconds}초`;
};

/**
 * Utility function toItemNameAndUrl.
 */
const toItemNameAndUrl = (itemName:string | null | undefined):{name:string; url:string} => {
	const normalized = toSingleLine(itemName);
	if(!normalized){
		return {name : "-", url : ""};
	}
	return {
		name : normalized,
		url : toItemDetailPath(normalized)
	};
};

/**
 * Utility function buildItemReferenceMarkdown.
 */
const buildItemReferenceMarkdown = (item:GameItemSummary):string => {
	const category = [
		toSingleLine(item.itemMainMenu ?? ""),
		toSingleLine(item.itemSubMenu ?? ""),
		toSingleLine(item.itemType)
	].filter(Boolean).join(" > ") || "-";
	const source = toSingleLine(item.itemSource ?? "") || "-";
	const itemInfo = toItemNameAndUrl(item.itemName);

	return serializeBoardReferenceToken("item", {
		itemName : itemInfo.name,
		itemUrl : itemInfo.url,
		category,
		rarity : toSingleLine(item.itemRarity) || "-",
		source
	});
};

/**
 * Utility function buildBarterReferenceMarkdown.
 */
const buildBarterReferenceMarkdown = (barter:LifeBarter):string => {
	const rewardPerTrade = toSafeInteger(barter.itemWeight);
	const maxTrades = toSafeInteger(barter.barterQty);
	const exchangeCost = toSafeInteger(barter.exchangeCost);
	const regionName = toSingleLine(barter.gameRegion?.regionName) || "-";
	const npcName = toSingleLine(barter.gameNpc?.npcName) || "-";
	const rewardInfo = toItemNameAndUrl(barter.gameItem?.itemName);
	const exchangeInfo = toItemNameAndUrl(barter.exchangeItem?.itemName);

	return serializeBoardReferenceToken("barter", {
		rewardName : rewardInfo.name,
		rewardUrl : rewardInfo.url,
		exchangeName : exchangeInfo.name,
		exchangeUrl : exchangeInfo.url,
		region : regionName,
		npc : npcName,
		cost : String(exchangeCost),
		maxTrades : String(maxTrades),
		rewardPerTrade : String(rewardPerTrade)
	});
};

/**
 * Utility function buildCraftReferenceMarkdown.
 */
const buildCraftReferenceMarkdown = (craft:LifeCraft):string => {
	const craftType = toSingleLine(craft.craftType) || "-";
	const craftName = toSingleLine(craft.craftName) || "-";
	const itemName = toSingleLine(craft.itemName || craft.gameItem?.itemName || "");
	const ingredientName = toSingleLine(craft.ingredientName || craft.ingredientItem?.itemName || "");
	const ingredientCost = toSafeInteger(craft.craftIngredientCost);
	const level = craft.craftableLevel === null || craft.craftableLevel === undefined ? "-" : String(craft.craftableLevel);
	const productInfo = toItemNameAndUrl(itemName);
	const ingredientInfo = toItemNameAndUrl(ingredientName);

	return serializeBoardReferenceToken("craft", {
		productName : productInfo.name,
		productUrl : productInfo.url,
		ingredientName : ingredientInfo.name,
		ingredientUrl : ingredientInfo.url,
		ingredientCost : String(ingredientCost),
		category : `${craftType} > ${craftName}`,
		level,
		time : formatProcessingTime(craft.processingTime)
	});
};

const BoardWritePage:React.FC = () => {
	const {postId} = useParams<{postId:string}>();
	const navigate = useNavigate();
	const {user} = useAuth();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const referencePanelRef = useRef<HTMLDivElement>(null);
	const referencePanelTriggerRef = useRef<HTMLButtonElement>(null);

	const [categories, setCategories] = useState<BoardCategory[]>([]);
	const [categoryId, setCategoryId] = useState<number | null>(null);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [isWiki, setIsWiki] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showPreview, setShowPreview] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);
	const [referenceTab, setReferenceTab] = useState<ReferenceTab>("item");
	const [referenceKeyword, setReferenceKeyword] = useState("");
	const [referenceLoading, setReferenceLoading] = useState(false);
	const [referenceError, setReferenceError] = useState<string | null>(null);
	const [itemReferenceResults, setItemReferenceResults] = useState<GameItemSummary[]>([]);
	const [barterReferenceResults, setBarterReferenceResults] = useState<LifeBarter[]>([]);
	const [craftReferenceResults, setCraftReferenceResults] = useState<LifeCraft[]>([]);
	const [referencePanelOpen, setReferencePanelOpen] = useState(false);

	const isEditMode = !!postId;

	useSeo({
		title : isEditMode ? "게시글 수정" : "게시글 작성",
		description : isEditMode ? "게시판 글을 수정하는 페이지입니다." : "새 게시판 글을 작성하는 페이지입니다.",
		canonicalPath : isEditMode ? `/board/edit/${postId}` : "/board/write",
		noindex : true
	});

	useEffect(() => {
		if(!user){
			alert("로그인이 필요합니다.");
			navigate("/login");
			return;
		}
		loadCategories();
		if(isEditMode) loadPost();
	}, []);

	/**
	 * Utility function async.
	 */
	const loadCategories = async () => {
		try{
			const data = await boardService.getCategories();
			setCategories(data);
			if(data.length > 0 && !categoryId && !isEditMode){
				setCategoryId(data[0].categoryId);
			}
		}catch(err){
			console.error("카테고리 로드 실패:", err);
		}
	};

	/**
	 * Utility function async.
	 */
	const loadPost = async () => {
		try{
			const post = await boardService.getPost(parseInt(postId!));
			if(!post.isWiki && post.userId !== (user?.userId ?? user?.id)){
				alert("수정 권한이 없습니다.");
				navigate("/board");
				return;
			}

			setCategoryId(post.categoryId);
			setIsWiki(!!post.isWiki);
			setTitle(post.title);
			setContent(post.content);
		}catch(err:any){
			alert(err.message || "게시글을 불러오는데 실패했습니다.");
			navigate("/board");
		}
	};

	const insertAtCursor = useCallback((insertText:string, ensureBlockSpacing:boolean = false) => {
		const textarea = textareaRef.current;
		const normalizedInsertText = ensureBlockSpacing ? insertText.trim() : insertText;
		if(!textarea){
			setContent((prev) => {
				const base = prev ?? "";
				if(!ensureBlockSpacing){
					return `${base}${normalizedInsertText}`;
				}
				const trimmedBase = base.replace(/\s*$/, "");
				return trimmedBase
					? `${trimmedBase}\n\n${normalizedInsertText}\n`
					: `${normalizedInsertText}\n`;
			});
			return;
		}
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		let textToInsert = normalizedInsertText;
		if(ensureBlockSpacing){
			const prevChar = start > 0 ? content[start - 1] : "";
			const prevPrevChar = start > 1 ? content[start - 2] : "";
			const nextChar = end < content.length ? content[end] : "";
			const prefix = prevChar === ""
				? ""
				: prevChar === "\n"
					? (prevPrevChar === "\n" ? "" : "\n")
					: "\n\n";
			const suffix = nextChar === ""
				? "\n"
				: nextChar === "\n"
					? "\n"
					: "\n\n";
			textToInsert = `${prefix}${normalizedInsertText}${suffix}`;
		}
		const newContent = content.substring(0, start) + textToInsert + content.substring(end);
		setContent(newContent);

		setTimeout(() => {
			textarea.focus();
			const newPos = start + textToInsert.length;
			textarea.setSelectionRange(newPos, newPos);
		}, 0);
	}, [content]);

	const insertImageMarkdown = useCallback((url:string) => {
		insertAtCursor(`![이미지](${url})`);
	}, [insertAtCursor]);

	const insertReferenceMarkdown = useCallback((markdown:string) => {
		insertAtCursor(markdown, true);
	}, [insertAtCursor]);

	const handleImageUpload = useCallback(async(file:File) => {
		setUploadProgress(0);
		try{
			const result = await uploadService.uploadImage(file, "board", (progress) => {
				setUploadProgress(progress);
			});
			if(result.success && result.url){
				insertImageMarkdown(result.url);
			}else{
				setError(result.message || "이미지 업로드에 실패했습니다.");
			}
		}catch(err:any){
			setError("이미지 업로드에 실패했습니다.");
		}finally{
			setUploadProgress(null);
		}
	}, [insertImageMarkdown]);

	/**
	 * Utility function handleFileSelect.
	 */
	const handleFileSelect = (e:React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if(file) handleImageUpload(file);
		e.target.value = "";
	};

	const handleDrop = useCallback((e:React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if(file && file.type.startsWith("image/")){
			handleImageUpload(file);
		}
	}, [handleImageUpload]);

	/**
	 * Utility function handleDragOver.
	 */
	const handleDragOver = (e:React.DragEvent) => {
		e.preventDefault();
	};

	const handlePaste = useCallback((e:React.ClipboardEvent) => {
		const items = e.clipboardData.items;
		for(let i = 0; i < items.length; i++){
			if(items[i].type.startsWith("image/")){
				e.preventDefault();
				const file = items[i].getAsFile();
				if(file) handleImageUpload(file);
				return;
			}
		}
	}, [handleImageUpload]);

	const handleSearchReference = useCallback(async() => {
		const keyword = referenceKeyword.trim();
		if(!keyword){
			setReferenceError(null);
			setItemReferenceResults([]);
			setBarterReferenceResults([]);
			setCraftReferenceResults([]);
			return;
		}

		setReferenceLoading(true);
		setReferenceError(null);

		try{
			if(referenceTab === "item"){
				const response = await GameItemService.getGameItems({
					page : 0,
					size : MAX_REFERENCE_RESULTS,
					sortBy : "itemRarity",
					sortDir : "desc",
					keyword
				});
				const deduped = Array.from(
					new Map(response.content.map((item) => [item.itemId, item])).values()
				).slice(0, MAX_REFERENCE_RESULTS);
				setItemReferenceResults(deduped);
			}else if(referenceTab === "barter"){
				const response = await GameItemService.getBarters({
					page : 0,
					size : MAX_REFERENCE_RESULTS,
					sortBy : "regionId",
					sortDir : "asc",
					keyword
				});
				const deduped = Array.from(
					new Map(response.content.map((barter) => [`${barter.barterId}-${barter.itemId}-${barter.exchangeId}`, barter])).values()
				).slice(0, MAX_REFERENCE_RESULTS);
				setBarterReferenceResults(deduped);
			}else{
				const response = await GameItemService.getCrafts({
					page : 0,
					size : MAX_REFERENCE_RESULTS,
					sortBy : "craftType",
					sortDir : "asc",
					keyword
				});
				const deduped = Array.from(
					new Map(response.content.map((craft) => [`${craft.craftId}-${craft.craftSubId}-${craft.itemId}`, craft])).values()
				).slice(0, MAX_REFERENCE_RESULTS);
				setCraftReferenceResults(deduped);
			}
		}catch(error){
			console.error("참조 데이터 검색 실패:", error);
			setReferenceError("검색에 실패했습니다. 잠시 후 다시 시도해주세요.");
		}finally{
			setReferenceLoading(false);
		}
	}, [referenceKeyword, referenceTab]);

	/**
	 * Utility function handleReferenceKeywordKeyDown.
	 */
	const handleReferenceKeywordKeyDown = (e:React.KeyboardEvent<HTMLInputElement>) => {
		if(e.key === "Enter"){
			e.preventDefault();
			void handleSearchReference();
		}
	};

	useEffect(() => {
		if(!referencePanelOpen){
			return;
		}

		const keyword = referenceKeyword.trim();
		if(!keyword){
			setReferenceError(null);
			setItemReferenceResults([]);
			setBarterReferenceResults([]);
			setCraftReferenceResults([]);
			setReferenceLoading(false);
			return;
		}

		const timer = window.setTimeout(() => {
			void handleSearchReference();
		}, 300);
		return () => window.clearTimeout(timer);
	}, [referenceKeyword, referenceTab, referencePanelOpen, handleSearchReference]);

	useEffect(() => {
		if(showPreview){
			setReferencePanelOpen(false);
		}
	}, [showPreview]);

	useEffect(() => {
		if(!referencePanelOpen){
			return;
		}

		/**
		 * Utility function handlePointerDown.
		 */
		const handlePointerDown = (event:PointerEvent) => {
			const target = event.target as Node | null;
			if(!target){
				return;
			}
			if(referencePanelRef.current?.contains(target)){
				return;
			}
			if(referencePanelTriggerRef.current?.contains(target)){
				return;
			}
			setReferencePanelOpen(false);
		};

		/**
		 * Utility function handleEsc.
		 */
		const handleEsc = (event:KeyboardEvent) => {
			if(event.key === "Escape"){
				setReferencePanelOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleEsc);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleEsc);
		};
	}, [referencePanelOpen]);

	/**
	 * Utility function async.
	 */
	const handleSubmit = async (e:React.FormEvent) => {
		e.preventDefault();
		if(!title.trim()){
			alert("제목을 입력하세요.");
			return;
		}
		if(!content.trim()){
			alert("내용을 입력하세요.");
			return;
		}

		try{
			setLoading(true);
			setError(null);

			if(isEditMode){
				const request:BoardPostUpdateRequest = {
					categoryId, title: title.trim(), content: content.trim(), isWiki
				};
				const updatedPost = await boardService.updatePost(parseInt(postId!), request);
				navigate(createBoardPostPath(updatedPost.title), {state : {postId : updatedPost.postId}});
			}else{
				const request:BoardPostCreateRequest = {
					categoryId, title: title.trim(), content: content.trim(), isWiki
				};
				const newPost = await boardService.createPost(request);
				navigate(createBoardPostPath(newPost.title), {state : {postId : newPost.postId}});
			}
		}catch(err:any){
			setError(err.message || "게시글 저장에 실패했습니다.");
		}finally{
			setLoading(false);
		}
	};

	const activeReferenceResultCount = referenceTab === "item"
		? itemReferenceResults.length
		: referenceTab === "barter"
			? barterReferenceResults.length
			: craftReferenceResults.length;
	const referencePanelDescription = referencePanelOpen
		? `검색 결과 ${activeReferenceResultCount}건`
		: "아이템, 물물교환, 제작 정보를 본문에 삽입";

	return (
		<div className={styles.boardPage}>
			<div className={styles.container}>
				<div className={styles.header}>
					<button onClick={() => navigate(-1)} className={styles.backBtn}>취소</button>
					<h2 className={styles.pageTitle}>{isEditMode ? "게시글 수정" : "게시글 작성"}</h2>
				</div>

				{error && <div className={styles.error}>{error}</div>}

				<form onSubmit={handleSubmit} className={styles.form}>
					<div className={styles.formGroup}>
						<label>카테고리</label>
						<select
							value={categoryId || ""}
							onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
							className={styles.select}
						>
							<option value="">선택 안함</option>
							{categories.map(cat => (
								<option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>
							))}
						</select>
					</div>

					<label className={styles.wikiToggle}>
						<input
							type="checkbox"
							checked={isWiki}
							onChange={(e) => setIsWiki(e.target.checked)}
						/>
						<span>위키로 등록</span>
					</label>

					<div className={styles.formGroup}>
						<label>제목</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="제목을 입력하세요"
							className={styles.input}
							maxLength={200}
						/>
					</div>

					<div className={styles.formGroup}>
						<div className={styles.contentHeader}>
							<label>내용</label>
							<div className={styles.contentActions}>
								{!showPreview && (
									<>
										<input
											ref={fileInputRef}
											type="file"
											accept="image/jpeg,image/png,image/gif,image/webp"
											onChange={handleFileSelect}
											className={styles.fileInput}
										/>
										<button
											type="button"
											className={styles.uploadBtn}
											onClick={() => fileInputRef.current?.click()}
											disabled={uploadProgress !== null}
										>
											<ImagePlus size={16}/>
											이미지
										</button>
									</>
								)}
								<div className={styles.tabToggle}>
									<button
										type="button"
										className={`${styles.toggleBtn} ${!showPreview ? styles.active : ""}`}
										onClick={() => setShowPreview(false)}
									>
										편집
									</button>
									<button
										type="button"
										className={`${styles.toggleBtn} ${showPreview ? styles.active : ""}`}
										onClick={() => setShowPreview(true)}
									>
										미리보기
									</button>
								</div>
							</div>
						</div>

						{uploadProgress !== null && (
							<div className={styles.progressBar}>
								<div className={styles.progressFill} style={{width: `${uploadProgress}%`}}/>
							</div>
						)}

						{showPreview ? (
							<div className={styles.preview}>
								{content.trim() ? (
									<ReactMarkdown
										remarkPlugins={markdownRemarkPlugins}
										rehypePlugins={markdownRehypePlugins}
										components={markdownComponents}
									>
										{content}
									</ReactMarkdown>
								) : (
									<span className={styles.previewEmpty}>내용을 입력하면 미리보기가 표시됩니다.</span>
								)}
							</div>
						) : (
							<div className={styles.editorWrap}>
								<MarkdownToolbar
									textareaRef={textareaRef}
									content={content}
									setContent={setContent}
									floatingAction={{
										icon : <Search size={16}/>,
										title : "참조 패널",
										action : () => setReferencePanelOpen((prev) => !prev),
										active : referencePanelOpen,
										buttonRef : referencePanelTriggerRef
									}}
								/>
								{referencePanelOpen && (
									<div className={styles.referenceFloatingLayer}>
										<div className={styles.referencePanel} ref={referencePanelRef}>
											<div className={styles.referenceHeader}>
												<div className={styles.referenceHeaderText}>
													<strong>참조 패널</strong>
													<span>{referencePanelDescription}</span>
												</div>
												<button
													type="button"
													className={styles.referencePanelCloseBtn}
													onClick={() => setReferencePanelOpen(false)}
													aria-label="참조 패널 닫기"
												>
													<X size={14}/>
												</button>
											</div>
											<div className={styles.referenceControls}>
												<div className={styles.referenceTabs}>
													<button
														type="button"
														className={`${styles.referenceTabBtn} ${referenceTab === "item" ? styles.active : ""}`}
														onClick={() => setReferenceTab("item")}
													>
														<Package size={14}/>
														아이템
													</button>
													<button
														type="button"
														className={`${styles.referenceTabBtn} ${referenceTab === "barter" ? styles.active : ""}`}
														onClick={() => setReferenceTab("barter")}
													>
														<ArrowLeftRight size={14}/>
														물물교환
													</button>
													<button
														type="button"
														className={`${styles.referenceTabBtn} ${referenceTab === "craft" ? styles.active : ""}`}
														onClick={() => setReferenceTab("craft")}
													>
														<Hammer size={14}/>
														제작
													</button>
												</div>
												<div className={styles.referenceSearch}>
													<input
														type="text"
														value={referenceKeyword}
														onChange={(e) => setReferenceKeyword(e.target.value)}
														onKeyDown={handleReferenceKeywordKeyDown}
														placeholder="검색어를 입력하세요"
														className={styles.referenceInput}
													/>
													<button
														type="button"
														className={styles.referenceSearchBtn}
														onClick={() => void handleSearchReference()}
														disabled={referenceLoading}
													>
														<Search size={14}/>
														검색
													</button>
												</div>
											</div>

											{referenceError && <div className={styles.referenceError}>{referenceError}</div>}
											{referenceLoading && <div className={styles.referenceLoading}>검색 중입니다...</div>}
											{!referenceLoading && !referenceError && referenceKeyword.trim() && activeReferenceResultCount === 0 && (
												<div className={styles.referenceEmpty}>검색 결과가 없습니다.</div>
											)}

											{!referenceLoading && !referenceError && activeReferenceResultCount > 0 && (
												<div className={styles.referenceResults}>
													{referenceTab === "item" && itemReferenceResults.map((item) => (
														<div key={item.itemId} className={styles.referenceResultCard}>
															<div className={styles.referenceResultTitleRow}>
																<Package size={14}/>
																<strong>{toDisplayValue(item.itemName)}</strong>
															</div>
															<div className={styles.referenceResultMeta}>
																<span>
																	{[
																		toDisplayValue(item.itemMainMenu, ""),
																		toDisplayValue(item.itemSubMenu, ""),
																		toDisplayValue(item.itemType, "")
																	].filter(Boolean).join(" > ") || "-"}
																</span>
																<span>{`등급 ${toDisplayValue(item.itemRarity)} · ${toDisplayValue(item.itemSource)}`}</span>
															</div>
															<button
																type="button"
																className={styles.referenceInsertBtn}
																onClick={() => insertReferenceMarkdown(buildItemReferenceMarkdown(item))}
															>
																본문에 삽입
															</button>
														</div>
													))}
													{referenceTab === "barter" && barterReferenceResults.map((barter) => (
														<div
															key={`${barter.barterId}-${barter.itemId}-${barter.exchangeId}`}
															className={styles.referenceResultCard}
														>
															<div className={styles.referenceResultTitleRow}>
																<ArrowLeftRight size={14}/>
																<strong>{`${toDisplayValue(barter.gameItem?.itemName)} ↔ ${toDisplayValue(barter.exchangeItem?.itemName)}`}</strong>
															</div>
															<div className={styles.referenceResultMeta}>
																<span>{`${toDisplayValue(barter.gameRegion?.regionName)} / ${toDisplayValue(barter.gameNpc?.npcName)}`}</span>
																<span>
																	{`교환 ${toSafeInteger(barter.exchangeCost)}개 · 최대 ${toSafeInteger(barter.barterQty)}회 · 1회 보상 x${toSafeInteger(barter.itemWeight)}`}
																</span>
															</div>
															<button
																type="button"
																className={styles.referenceInsertBtn}
																onClick={() => insertReferenceMarkdown(buildBarterReferenceMarkdown(barter))}
															>
																본문에 삽입
															</button>
														</div>
													))}
													{referenceTab === "craft" && craftReferenceResults.map((craft) => (
														<div
															key={`${craft.craftId}-${craft.craftSubId}-${craft.itemId}`}
															className={styles.referenceResultCard}
														>
															<div className={styles.referenceResultTitleRow}>
																<Hammer size={14}/>
																<strong>{toDisplayValue(craft.itemName || craft.gameItem?.itemName)}</strong>
															</div>
															<div className={styles.referenceResultMeta}>
																<span>{`${toDisplayValue(craft.craftType)} > ${toDisplayValue(craft.craftName)}`}</span>
																<span>{`재료 ${toDisplayValue(craft.ingredientName || craft.ingredientItem?.itemName)} x${toSafeInteger(craft.craftIngredientCost)}`}</span>
																<span>{`요구 레벨 ${craft.craftableLevel ?? "-"} · 제작 ${formatProcessingTime(craft.processingTime)}`}</span>
															</div>
															<button
																type="button"
																className={styles.referenceInsertBtn}
																onClick={() => insertReferenceMarkdown(buildCraftReferenceMarkdown(craft))}
															>
																본문에 삽입
															</button>
														</div>
													))}
												</div>
											)}
										</div>
									</div>
								)}
								<textarea
									ref={textareaRef}
									value={content}
									onChange={(e) => setContent(e.target.value)}
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									onPaste={handlePaste}
									placeholder="마크다운 형식으로 작성할 수 있습니다.&#10;&#10;# 제목&#10;**굵게** *기울임*&#10;- 목록&#10;![이미지](url)&#10;[링크](url)&#10;&#10;이미지를 드래그하거나 붙여넣기(Ctrl+V)할 수 있습니다."
									className={styles.textarea}
									rows={15}
								/>
							</div>
						)}
					</div>

					<button type="submit" disabled={loading} className={styles.submitBtn}>
						{loading ? "저장 중..." : isEditMode ? "수정" : "작성"}
					</button>
				</form>
			</div>
		</div>
	);
};

export default BoardWritePage;
