import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Calendar, Eye, Heart, ImagePlus, LayoutGrid, List, Pencil, Search, Tag, Trash2, X} from "lucide-react";
import {photoBoardService} from "@/services/photo-board-service";
import {uploadService} from "@/services/upload-service";
import {useAuth} from "@/hooks/use-auth";
import {useSeo} from "@/hooks/use-seo";
import type {PhotoBoardPost} from "@/types";
import styles from "./photo-board.module.scss";

type ViewMode = "board" | "portfolio";
const GALLERY_VIEW_MODE_STORAGE_KEY = "gallery:view-mode";
const LEGACY_PHOTO_VIEW_MODE_STORAGE_KEY = "photo-board:view-mode";
const DISCORD_GALLERY_TAG = "디스코드";

const PhotoBoardPage:React.FC = () => {
	const {user} = useAuth();
	useSeo({
        title : "갤러리",
        description : "Sexynogi 커뮤니티 이미지 갤러리입니다.",
		canonicalPath : "/gallery"
	});
	const fileInputRef = useRef<HTMLInputElement>(null);
	const editFileInputRef = useRef<HTMLInputElement>(null);
	const pageDragCounterRef = useRef(0);
	const [isCreateDragOver, setIsCreateDragOver] = useState(false);
	const [isEditDragOver, setIsEditDragOver] = useState(false);
	const [isPageDragOver, setIsPageDragOver] = useState(false);

	const [viewMode, setViewMode] = useState<ViewMode>(() => {
		if(typeof window === "undefined"){
			return "portfolio";
		}
		const saved = localStorage.getItem(GALLERY_VIEW_MODE_STORAGE_KEY) || localStorage.getItem(LEGACY_PHOTO_VIEW_MODE_STORAGE_KEY);
		if(saved === "portfolio" || saved === "gallery"){
			return "portfolio";
		}
		if(saved === "board" || saved === "list"){
			return "board";
		}
		return "portfolio";
	});
	const [searchKeyword, setSearchKeyword] = useState("");
	const [selectedTag, setSelectedTag] = useState<string>("ALL");
	const [posts, setPosts] = useState<PhotoBoardPost[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [showCreateModal, setShowCreateModal] = useState(false);

	const [formTitle, setFormTitle] = useState("");
	const [formImageUrl, setFormImageUrl] = useState("");
	const [formDescription, setFormDescription] = useState("");
	const [formTags, setFormTags] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);

	const [selectedPost, setSelectedPost] = useState<PhotoBoardPost | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [editImageUrl, setEditImageUrl] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editTags, setEditTags] = useState("");
	const [editSubmitting, setEditSubmitting] = useState(false);
	const [editUploadProgress, setEditUploadProgress] = useState<number | null>(null);
	const [likeLoadingIds, setLikeLoadingIds] = useState<Set<number>>(new Set());

	const currentUserId = user?.id ?? user?.userId ?? null;

	const isExternalPost = (post:PhotoBoardPost):boolean =>
		post.sourceType === "DISCORD" || Boolean(post.externalUrl);

	const isDiscordPost = (post:PhotoBoardPost):boolean =>
		post.sourceType === "DISCORD";

	const normalizeDiscordFallbackTitle = (title:string):string => {
		const trimmedTitle = title.trim();
		if(!trimmedTitle){
			return "이미지";
		}
		if(/^image$/i.test(trimmedTitle)){
			return "이미지";
		}
		return trimmedTitle.replace(/\s+image$/i, " 이미지");
	};

	const inferDiscordAuthorFromTitle = (title:string):string | null => {
		const match = title.trim().match(/^(.+)\simage$/i);
		const inferred = match?.[1]?.trim();
		return inferred || null;
	};

	const getDisplayTitle = (post:PhotoBoardPost):string => {
		if(!isDiscordPost(post)){
			return post.title;
		}
		return normalizeDiscordFallbackTitle(post.title);
	};

	const getDisplayTags = (post:PhotoBoardPost):string[] => {
		if(isDiscordPost(post)){
			return [DISCORD_GALLERY_TAG];
		}
		return post.tags;
	};

	const getAuthorName = (post:PhotoBoardPost):string => {
		const authorNickname = post.authorNickname?.trim();
		if(authorNickname){
			return authorNickname;
		}
		const externalAuthor = post.externalAuthor?.trim();
		if(externalAuthor){
			if(isDiscordPost(post) && /^\d{17,20}$/.test(externalAuthor)){
				const inferredAuthor = inferDiscordAuthorFromTitle(post.title);
				if(inferredAuthor){
					return inferredAuthor;
				}
			}
			return externalAuthor;
		}
		if(isDiscordPost(post)){
			const inferredAuthor = inferDiscordAuthorFromTitle(post.title);
			if(inferredAuthor){
				return inferredAuthor;
			}
		}
		return "익명";
	};

	const getPostKey = (post:PhotoBoardPost):string =>
		post.photoPostId !== null
			? `photo-${post.photoPostId}`
			: `external-${post.externalUrl ?? post.title}-${post.createdAt}`;

	const loadPosts = useCallback(async() => {
		try{
			setLoading(true);
			setError(null);
			const isDiscordTagFilter = selectedTag === DISCORD_GALLERY_TAG;
			const requestPage = isDiscordTagFilter ? 0 : currentPage;
			const requestSize = isDiscordTagFilter ? 100 : 20;
			const requestTag = isDiscordTagFilter ? null : selectedTag;
			const pageData = await photoBoardService.getPosts(requestPage, requestSize, searchKeyword || null, requestTag);
			const normalizedPosts = pageData.content.map((post) => ({
				...post,
				tags : getDisplayTags(post)
			}));
			const displayedPosts = isDiscordTagFilter
				? normalizedPosts.filter((post) => isDiscordPost(post))
				: normalizedPosts;
			setPosts(displayedPosts);
			setTotalPages(isDiscordTagFilter ? 1 : pageData.totalPages);
		}catch(err){
			console.error("??彛?野껊슣?녷묾? 嚥≪뮆諭???쎈솭:", err);
			setError("??彛?野껊슣?녷묾????븍뜄???? 筌륁궢六??щ빍??");
		}finally{
			setLoading(false);
		}
	}, [currentPage, searchKeyword, selectedTag]);

	useEffect(() => {
		loadPosts();
	}, [loadPosts]);

	useEffect(() => {
		localStorage.setItem(GALLERY_VIEW_MODE_STORAGE_KEY, viewMode);
	}, [viewMode]);

	const allTags = useMemo(() => {
		const tags = new Set<string>();
		posts.forEach((post) => post.tags.forEach((tag) => tags.add(tag)));
		return ["ALL", ...Array.from(tags)];
	}, [posts]);

	const handleKeywordChange = (value:string) => {
		setCurrentPage(0);
		setSearchKeyword(value);
	};

	const handleTagChange = (tag:string) => {
		setCurrentPage(0);
		setSelectedTag(tag);
	};

	const hasFilePayload = (event:{dataTransfer:DataTransfer | null}) =>
		Boolean(event.dataTransfer && Array.from(event.dataTransfer.types || []).includes("Files"));

	const handleImageUpload = async(file:File) => {
		try{
			setUploadProgress(0);
			const result = await uploadService.uploadTempImage(file, "board", (progress) => setUploadProgress(progress));
			if(result.success && result.url){
				setFormImageUrl(result.url);
				setShowCreateModal(true);
				return;
			}
			alert(result.message || "???筌왖 ??낆쨮??뽯퓠 ??쎈솭??됰뮸??덈뼄.");
		}catch(err:any){
			alert(err?.message || "???筌왖 ??낆쨮??뽯퓠 ??쎈솭??됰뮸??덈뼄.");
		}finally{
			setUploadProgress(null);
		}
	};

	const handleCreateModalOpenByFile = () => {
		if(!user){
			alert("??彛???源낆쨯??롮젻筌?嚥≪뮄??紐낅퉸 雅뚯눘苑??");
			return;
		}
		fileInputRef.current?.click();
	};

	const handleOpenCreateComposer = () => {
		if(!user){
			alert("??壤???繹먮굞夷??濡?졎嶺??β돦裕??筌뤿굝???낅슣?섋땻??");
			return;
		}
		setShowCreateModal(true);
	};

	const handleFileSelect = async(e:React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if(file){
			await handleImageUpload(file);
		}
		e.target.value = "";
	};

	const handleCreateDrop = async(e:React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsCreateDragOver(false);
		const file = e.dataTransfer.files?.[0];
		if(file){
			await handleImageUpload(file);
		}
	};

	const handlePageDragEnter = (e:React.DragEvent<HTMLDivElement>) => {
		if(!hasFilePayload(e)){
			return;
		}
		e.preventDefault();
		if(!user){
			return;
		}
		pageDragCounterRef.current += 1;
		setIsPageDragOver(true);
	};

	const handlePageDragOver = (e:React.DragEvent<HTMLDivElement>) => {
		if(!hasFilePayload(e)){
			return;
		}
		e.preventDefault();
	};

	const handlePageDragLeave = (e:React.DragEvent<HTMLDivElement>) => {
		if(!hasFilePayload(e)){
			return;
		}
		e.preventDefault();
		if(!user){
			return;
		}
		pageDragCounterRef.current = Math.max(0, pageDragCounterRef.current - 1);
		if(pageDragCounterRef.current === 0){
			setIsPageDragOver(false);
		}
	};

	const handlePageDrop = async(e:React.DragEvent<HTMLDivElement>) => {
		if(!hasFilePayload(e)){
			return;
		}
		e.preventDefault();
		pageDragCounterRef.current = 0;
		setIsPageDragOver(false);
		if(!user){
			alert("??彛???源낆쨯??롮젻筌?嚥≪뮄??紐낅퉸 雅뚯눘苑??");
			return;
		}
		const file = e.dataTransfer.files?.[0];
		if(file){
			await handleImageUpload(file);
		}
	};

	const handleEditImageUpload = async(file:File) => {
		try{
			setEditUploadProgress(0);
			const result = await uploadService.uploadTempImage(file, "board", (progress) => setEditUploadProgress(progress));
			if(result.success && result.url){
				setEditImageUrl(result.url);
				return;
			}
			alert(result.message || "???筌왖 ??낆쨮??뽯퓠 ??쎈솭??됰뮸??덈뼄.");
		}catch(err:any){
			alert(err?.message || "???筌왖 ??낆쨮??뽯퓠 ??쎈솭??됰뮸??덈뼄.");
		}finally{
			setEditUploadProgress(null);
		}
	};

	const handleEditFileSelect = async(e:React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if(file){
			await handleEditImageUpload(file);
		}
		e.target.value = "";
	};

	const handleEditDrop = async(e:React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsEditDragOver(false);
		const file = e.dataTransfer.files?.[0];
		if(file){
			await handleEditImageUpload(file);
		}
	};

	const normalizeSingleTag = (value:string):string =>
		value.replace(/^#+/, "").trim();

	const parseTagsInput = (rawValue:string):string[] => {
		const uniqueTags = new Set<string>();
		rawValue.split(",").forEach((tag) => {
			const normalized = normalizeSingleTag(tag);
			if(normalized){
				uniqueTags.add(normalized);
			}
		});
		return Array.from(uniqueTags);
	};

	const normalizeTagInputValue = (rawValue:string):string =>
		parseTagsInput(rawValue).join(", ");

	const formatDate = (dateString:string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("ko-KR", {year : "numeric", month : "2-digit", day : "2-digit"});
	};

	const closeCreateModal = () => {
		setShowCreateModal(false);
		setIsCreateDragOver(false);
	};

	const handleCreatePost = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!formTitle.trim()){
			alert("??뺛걠????낆젾??雅뚯눘苑??");
			return;
		}
		if(!formImageUrl.trim()){
			alert("???筌왖 URL????낆젾??띻탢?????뵬????낆쨮??쀫퉸 雅뚯눘苑??");
			return;
		}

		const tags = parseTagsInput(formTags);

		try{
			setSubmitting(true);
			await photoBoardService.createPost({
				title : formTitle.trim(),
				imageUrl : formImageUrl.trim(),
				description : formDescription.trim() || "",
				tags
			});

			setFormTitle("");
			setFormImageUrl("");
			setFormDescription("");
			setFormTags("");
			setShowCreateModal(false);
			setCurrentPage(0);
			await loadPosts();
		}catch(err:any){
			alert(err.message || "??彛?野껊슣?녷묾? ?源낆쨯????쎈솭??됰뮸??덈뼄.");
		}finally{
			setSubmitting(false);
		}
	};

	const openPostDetail = async(photoPostId:number) => {
		try{
			setDetailLoading(true);
			setIsEditing(false);
			const post = await photoBoardService.getPost(photoPostId);
			setSelectedPost(post);
			setPosts((prev) => prev.map((item) => item.photoPostId === post.photoPostId ? {...item, viewCount : post.viewCount} : item));
		}catch(err:any){
			alert(err.message || "野껊슣?녷묾? ?怨멸쉭 鈺곌퀬?????쎈솭??됰뮸??덈뼄.");
		}finally{
			setDetailLoading(false);
		}
	};

	const closeDetailModal = () => {
		setSelectedPost(null);
		setIsEditing(false);
	};

	const handlePostClick = (post:PhotoBoardPost) => {
		if(isExternalPost(post)){
			if(post.externalUrl){
				window.open(post.externalUrl, "_blank", "noopener,noreferrer");
			}
			return;
		}

		if(post.photoPostId !== null){
			void openPostDetail(post.photoPostId);
		}
	};

	const canManageSelected = !!selectedPost && !!currentUserId && selectedPost.userId === currentUserId;

	const startEditSelectedPost = () => {
		if(!selectedPost) return;
		setIsEditing(true);
		setEditTitle(selectedPost.title);
		setEditImageUrl(selectedPost.imageUrl);
		setEditDescription(selectedPost.description || "");
		setEditTags(selectedPost.tags.join(", "));
	};

	const cancelEditSelectedPost = () => {
		setIsEditing(false);
	};

	const handleUpdateSelectedPost = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!selectedPost || selectedPost.photoPostId === null) return;

		if(!editTitle.trim()){
			alert("??뺛걠????낆젾??雅뚯눘苑??");
			return;
		}
		if(!editImageUrl.trim()){
			alert("???筌왖 URL????낆젾??띻탢?????뵬????낆쨮??쀫퉸 雅뚯눘苑??");
			return;
		}

		const tags = parseTagsInput(editTags);

		try{
			setEditSubmitting(true);
			const updated = await photoBoardService.updatePost(selectedPost.photoPostId, {
				title : editTitle.trim(),
				imageUrl : editImageUrl.trim(),
				description : editDescription.trim() || "",
				tags
			});
			setSelectedPost(updated);
			setPosts((prev) => prev.map((item) => item.photoPostId === updated.photoPostId ? updated : item));
			setIsEditing(false);
		}catch(err:any){
			alert(err.message || "野껊슣?녷묾? ??륁젟????쎈솭??됰뮸??덈뼄.");
		}finally{
			setEditSubmitting(false);
		}
	};

	const handleDeleteSelectedPost = async() => {
		if(!selectedPost || selectedPost.photoPostId === null) return;
		if(!window.confirm("?類ｌ춾 ??野껊슣?녷묾????????뤿뻻野껋쥙???뉙돱?")) return;

		try{
			await photoBoardService.deletePost(selectedPost.photoPostId);
			setSelectedPost(null);
			await loadPosts();
		}catch(err:any){
			alert(err.message || "野껊슣?녷묾? ???????쎈솭??됰뮸??덈뼄.");
		}
	};

	const applyPostUpdate = (updated:PhotoBoardPost) => {
		setPosts((prev) => prev.map((item) => item.photoPostId === updated.photoPostId ? updated : item));
		setSelectedPost((prev) => prev && prev.photoPostId === updated.photoPostId ? updated : prev);
	};

	const handleToggleLike = async(photoPostId:number) => {
		if(!currentUserId){
			alert("?ル뿭釉?遺? ?袁ⓥ뀮??삠늺 嚥≪뮄??紐낅퉸 雅뚯눘苑??");
			return;
		}
		if(likeLoadingIds.has(photoPostId)){
			return;
		}

		const current = selectedPost?.photoPostId === photoPostId
			? selectedPost
			: posts.find((post) => post.photoPostId === photoPostId) ?? null;

		const nextLiked = !Boolean(current?.likedByCurrentUser);
		const nextLikeCount = Math.max(0, (current?.likeCount ?? 0) + (nextLiked ? 1 : -1));

		if(current){
			const optimistic = {...current, likedByCurrentUser : nextLiked, likeCount : nextLikeCount};
			applyPostUpdate(optimistic);
		}

		setLikeLoadingIds((prev) => new Set(prev).add(photoPostId));
		try{
			const updated = await photoBoardService.toggleLike(photoPostId);
			applyPostUpdate(updated);
		}catch(err:any){
			if(current){
				applyPostUpdate(current);
			}
			alert(err.message || "?ル뿭釉??筌ｌ꼶?????쎈솭??됰뮸??덈뼄.");
		}finally{
			setLikeLoadingIds((prev) => {
				const next = new Set(prev);
				next.delete(photoPostId);
				return next;
			});
		}
	};

	const handleToggleLikeClick = async(e:React.MouseEvent, photoPostId:number) => {
		e.stopPropagation();
		await handleToggleLike(photoPostId);
	};


	const renderFeedCard = (post:PhotoBoardPost) => {
		const externalPost = isExternalPost(post);
		const displayTags = getDisplayTags(post);
		const visibleTags = displayTags.slice(0, 4);

		return (
			<article key={getPostKey(post)} className={styles.photoCard} onClick={() => handlePostClick(post)}>
				<div className={styles.cardImageWrap}>
					<img src={post.imageUrl} alt={getDisplayTitle(post)}/>
				</div>
				<div className={styles.cardBody}>
					<div className={styles.cardTop}>
						<div className={styles.cardAuthorMeta}>
							<span className={styles.cardAuthor}>{getAuthorName(post)}</span>
							<span className={styles.cardDate}>
								<Calendar size={13}/>
								{formatDate(post.createdAt)}
							</span>
						</div>
						{externalPost && <span className={styles.externalMeta}>{isDiscordPost(post) ? "디스코드" : "외부"}</span>}
					</div>
					<h3 className={styles.postTitle}>
						<span className={styles.postTitleText}>{getDisplayTitle(post)}</span>
						{isDiscordPost(post) && <span className={`${styles.sourceBadge} ${styles.discordBadge}`}>디스코드</span>}
					</h3>
					<p className={styles.cardDescription}>{post.description || "설명이 없습니다."}</p>
					{visibleTags.length > 0 && (
						<div className={styles.cardTags}>
							{visibleTags.map((tag) => <span key={`${getPostKey(post)}-${tag}`}>#{tag}</span>)}
							{displayTags.length > visibleTags.length && <span className={styles.moreTag}>+{displayTags.length - visibleTags.length}</span>}
						</div>
					)}
					<div className={styles.cardMeta}>
						<div className={styles.cardStats}>
							<span><Eye size={14}/>{post.viewCount}</span>
							{externalPost && <span className={styles.externalStat}>링크 열기</span>}
						</div>
						{!externalPost && post.photoPostId !== null && (
							<button
								type="button"
								className={`${styles.likeBtn} ${post.likedByCurrentUser ? styles.liked : ""}`}
								onClick={(e) => handleToggleLikeClick(e, post.photoPostId!)}
								disabled={likeLoadingIds.has(post.photoPostId)}
							>
								<Heart size={14} fill={post.likedByCurrentUser ? "currentColor" : "none"}/>
								{post.likeCount}
							</button>
						)}
					</div>
				</div>
			</article>
		);
	};

	return (
		<div
			className={styles.photoBoardPage}
			onDragEnter={handlePageDragEnter}
			onDragOver={handlePageDragOver}
			onDragLeave={handlePageDragLeave}
			onDrop={handlePageDrop}
		>
			<div className={styles.container}>
				<section className={styles.hero}>
					<div className="page-heading">
<h1>갤러리</h1>
<p className="page-heading-subtitle">이미지를 빠르게 올리고 피드처럼 둘러볼 수 있는 갤러리입니다.</p>
					</div>

					<div className={styles.heroCard}>
						<div className={styles.quickComposer}>
							<button
								type="button"
								className={`${styles.dropZone} ${styles.heroDropZone}`}
								onClick={user ? handleCreateModalOpenByFile : undefined}
								disabled={!user}
							>
								<ImagePlus size={18}/>
								<div>
									<strong>{user ? "이미지를 드롭하거나 클릭해서 빠르게 업로드" : "이미지 업로드는 로그인 후 가능합니다"}</strong>
									<span>{user ? "JPG / PNG / GIF / WEBP 업로드 후 작성 창에서 캡션과 태그를 입력하세요" : "피드 탐색, 태그 검색, 게시글 열람은 자유롭게 가능합니다"}</span>
								</div>
							</button>

							<div className={styles.quickComposerActions}>
								{user ? (
									<>
										<button type="button" className={styles.primaryActionBtn} onClick={handleCreateModalOpenByFile}>
											<ImagePlus size={16}/>
											이미지 업로드
										</button>
										<button type="button" className={styles.secondaryActionBtn} onClick={handleOpenCreateComposer}>
											<Pencil size={15}/>
											글 작성
										</button>
									</>
								) : (
									<p className={styles.guestHint}>업로드는 로그인 후 가능합니다. 둘러보기와 열람은 계속 사용할 수 있습니다.</p>
								)}
							</div>
						</div>

						{uploadProgress !== null && (
							<div className={styles.heroUploadProgress}>
								<div className={styles.heroUploadProgressLabel}>이미지 업로드 중... {uploadProgress}%</div>
								<div className={styles.progressBar}><div className={styles.progressFill} style={{width : `${uploadProgress}%`}}/></div>
							</div>
						)}
					</div>
					{user && (
						<button type="button" className={styles.writeToggle} onClick={handleCreateModalOpenByFile}>
                            사진 등록
						</button>
					)}
					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/gif,image/webp"
						onChange={handleFileSelect}
						className={styles.fileInput}
					/>
				</section>

				<section className={styles.toolbar}>
					<div className={styles.viewSwitch}>
						<button type="button" className={viewMode === "board" ? styles.active : ""} onClick={() => setViewMode("board")}>
<List size={16}/>목록형
						</button>
						<button type="button" className={viewMode === "portfolio" ? styles.active : ""} onClick={() => setViewMode("portfolio")}>
<LayoutGrid size={16}/>갤러리형
						</button>
					</div>

					<div className={styles.searchBox}>
						<Search size={16}/>
<input type="text" placeholder="제목, 태그, 설명 검색" value={searchKeyword} onChange={(e) => handleKeywordChange(e.target.value)}/>
					</div>
				</section>

				<section className={styles.tagSection}>
					{allTags.map((tag) => (
						<button type="button" key={tag} className={selectedTag === tag ? styles.activeTag : ""} onClick={() => handleTagChange(tag)}>
<Tag size={12}/>{tag === "ALL" ? "전체" : tag}
						</button>
					))}
				</section>

				{loading ? (
                    <div className={styles.emptyState}>불러오는 중...</div>
				) : error ? (
					<div className={styles.emptyState}>{error}</div>
				) : posts.length === 0 ? (
                    <div className={styles.emptyState}>등록된 게시글이 없습니다.</div>
				) : viewMode === "board" ? (
					<section className={styles.boardView}>
						<div className={styles.tableHeader}>
<span>미리보기</span><span>제목</span><span>작성자</span><span>날짜</span><span>반응</span>
						</div>
						{posts.map((post) => (
							<article key={getPostKey(post)} className={styles.tableRow} onClick={() => handlePostClick(post)}>
									<img src={post.imageUrl} alt={getDisplayTitle(post)}/>
									<div className={styles.rowTitle}>
											<h3 className={styles.postTitle}>
												<span className={styles.postTitleText}>{getDisplayTitle(post)}</span>
{isDiscordPost(post) && <span className={`${styles.sourceBadge} ${styles.discordBadge}`}>디스코드</span>}
											</h3>
                                    <p>{post.description || "설명이 없습니다."}</p>
										<div className={styles.rowTags}>{getDisplayTags(post).map((tag) => <span key={`${getPostKey(post)}-${tag}`}>#{tag}</span>)}</div>
								</div>
									<span>{getAuthorName(post)}</span>
								<span><Calendar size={14}/>{formatDate(post.createdAt)}</span>
								<span className={styles.reaction}>
									<span><Eye size={14}/>{post.viewCount}</span>
									{!isExternalPost(post) && post.photoPostId !== null && (
										<button
											type="button"
											className={`${styles.likeBtn} ${post.likedByCurrentUser ? styles.liked : ""}`}
											onClick={(e) => handleToggleLikeClick(e, post.photoPostId!)}
											disabled={likeLoadingIds.has(post.photoPostId)}
										>
											<Heart size={14} fill={post.likedByCurrentUser ? "currentColor" : "none"}/>
											{post.likeCount}
										</button>
									)}
								</span>
							</article>
						))}
					</section>
				) : (
					<section className={styles.portfolioView}>{posts.map(renderFeedCard)}</section>
				)}

				{!loading && totalPages > 1 && (
					<div className={styles.pagination}>
                        <button type="button" onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))} disabled={currentPage === 0}>이전</button>
						<span>{currentPage + 1} / {totalPages}</span>
                        <button type="button" onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))} disabled={currentPage >= totalPages - 1}>다음</button>
					</div>
				)}
			</div>

			{isPageDragOver && (
				<div className={styles.pageDropOverlay}>
					<div className={styles.pageDropMessage}>
						<ImagePlus size={24}/>
                        <span>페이지 어디에나 이미지를 놓으면 등록 창이 열립니다.</span>
					</div>
				</div>
			)}

			{showCreateModal && (
				<div className={styles.modalOverlay} onClick={closeCreateModal}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
                            <h2>사진 등록</h2>
							<button type="button" className={styles.closeBtn} onClick={closeCreateModal}><X size={18}/></button>
						</div>
						<form className={styles.modalEditForm} onSubmit={handleCreatePost}>
                            <input type="text" placeholder="제목" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} maxLength={200}/>
							<div
								className={`${styles.dropZone} ${isCreateDragOver ? styles.dragOver : ""}`}
								onClick={() => fileInputRef.current?.click()}
								onDragOver={(e) => {
									e.preventDefault();
									setIsCreateDragOver(true);
								}}
								onDragLeave={() => setIsCreateDragOver(false)}
								onDrop={handleCreateDrop}
								role="button"
								tabIndex={0}
								onKeyDown={(e) => {
									if(e.key === "Enter" || e.key === " "){
										e.preventDefault();
										fileInputRef.current?.click();
									}
								}}
							>
								<ImagePlus size={18}/>
								<div>
<strong>이미지를 드래그앤드롭하거나 클릭해 업로드</strong>
                                    <span>JPG, PNG, GIF, WEBP (최대 5MB)</span>
								</div>
							</div>
							<div className={styles.uploadRow}>
                                <input type="text" placeholder="이미지 URL 또는 /api/files/... 경로 (업로드 시 자동 입력)" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)}/>
							</div>
							{uploadProgress !== null && (
								<div className={styles.progressBar}><div className={styles.progressFill} style={{width : `${uploadProgress}%`}}/></div>
							)}
							{formImageUrl && (
								<div className={styles.createPreview}>
                                    <img src={formImageUrl} alt="업로드 미리보기"/>
								</div>
							)}
							<input
								type="text"
                                placeholder="태그 (쉼표로 구분)"
								value={formTags}
								onChange={(e) => setFormTags(e.target.value)}
								onBlur={() => setFormTags((prev) => normalizeTagInputValue(prev))}
							/>
                            <textarea placeholder="설명" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} maxLength={1000}/>
							<div className={styles.modalActions}>
                                <button type="button" className={styles.secondaryBtn} onClick={closeCreateModal}>닫기</button>
                                <button type="submit" className={styles.primaryBtn} disabled={submitting || uploadProgress !== null}>{submitting ? "등록 중..." : "등록"}</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{selectedPost && (
				<div className={styles.modalOverlay} onClick={closeDetailModal}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
                            <h2>{isEditing ? "게시글 수정" : "게시글 상세"}</h2>
							<button type="button" className={styles.closeBtn} onClick={closeDetailModal}><X size={18}/></button>
						</div>

						{detailLoading ? (
                            <div className={styles.modalBody}>불러오는 중...</div>
						) : isEditing ? (
							<form className={styles.modalEditForm} onSubmit={handleUpdateSelectedPost}>
                                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="제목" maxLength={200}/>
								<div
									className={`${styles.dropZone} ${isEditDragOver ? styles.dragOver : ""}`}
									onClick={() => editFileInputRef.current?.click()}
									onDragOver={(e) => {
										e.preventDefault();
										setIsEditDragOver(true);
									}}
									onDragLeave={() => setIsEditDragOver(false)}
									onDrop={handleEditDrop}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if(e.key === "Enter" || e.key === " "){
											e.preventDefault();
											editFileInputRef.current?.click();
										}
									}}
								>
									<ImagePlus size={18}/>
									<div>
<strong>이미지를 드래그앤드롭하거나 클릭해 업로드</strong>
                                        <span>JPG, PNG, GIF, WEBP (최대 5MB)</span>
									</div>
								</div>
								<div className={styles.uploadRow}>
									<input ref={editFileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleEditFileSelect} className={styles.fileInput}/>
                                    <button type="button" className={styles.uploadBtn} onClick={() => editFileInputRef.current?.click()} disabled={editUploadProgress !== null}><ImagePlus size={16}/>파일 선택</button>
                                    <input type="text" value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} placeholder="이미지 URL 또는 /api/files/..."/>
								</div>
								{editUploadProgress !== null && <div className={styles.progressBar}><div className={styles.progressFill} style={{width : `${editUploadProgress}%`}}/></div>}
								<input
									type="text"
									value={editTags}
									onChange={(e) => setEditTags(e.target.value)}
									onBlur={() => setEditTags((prev) => normalizeTagInputValue(prev))}
                                    placeholder="태그 (쉼표로 구분)"
								/>
                                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="설명" maxLength={1000}/>
								<div className={styles.modalActions}>
<button type="button" className={styles.secondaryBtn} onClick={cancelEditSelectedPost}>취소</button>
<button type="submit" className={styles.primaryBtn} disabled={editSubmitting || editUploadProgress !== null}>{editSubmitting ? "저장 중..." : "저장"}</button>
								</div>
							</form>
						) : (
							<div className={styles.modalBody}>
									<img src={selectedPost.imageUrl} alt={getDisplayTitle(selectedPost)} className={styles.modalImage}/>
									<h3 className={styles.postTitle}>
										<span className={styles.postTitleText}>{getDisplayTitle(selectedPost)}</span>
{isDiscordPost(selectedPost) && <span className={`${styles.sourceBadge} ${styles.discordBadge}`}>디스코드</span>}
									</h3>
                                <p>{selectedPost.description || "설명이 없습니다."}</p>
									<div className={styles.modalTags}>{getDisplayTags(selectedPost).map((tag) => <span key={`modal-${selectedPost.photoPostId}-${tag}`}>#{tag}</span>)}</div>
								<div className={styles.modalMeta}>
										<span>{getAuthorName(selectedPost)}</span>
									<span>{formatDate(selectedPost.createdAt)}</span>
									<span><Eye size={14}/>{selectedPost.viewCount}</span>
									{!isExternalPost(selectedPost) && selectedPost.photoPostId !== null && (
										<button
											type="button"
											className={`${styles.likeBtn} ${selectedPost.likedByCurrentUser ? styles.liked : ""}`}
											onClick={() => handleToggleLike(selectedPost.photoPostId!)}
											disabled={likeLoadingIds.has(selectedPost.photoPostId)}
										>
											<Heart size={14} fill={selectedPost.likedByCurrentUser ? "currentColor" : "none"}/>
											{selectedPost.likeCount}
										</button>
									)}
								</div>
								{canManageSelected && (
									<div className={styles.modalActions}>
                                        <button type="button" className={styles.secondaryBtn} onClick={startEditSelectedPost}><Pencil size={14}/>수정</button>
<button type="button" className={styles.dangerBtn} onClick={handleDeleteSelectedPost}><Trash2 size={14}/>삭제</button>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default PhotoBoardPage;
