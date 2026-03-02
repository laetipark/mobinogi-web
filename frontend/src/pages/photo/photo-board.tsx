import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Calendar, Eye, Heart, ImagePlus, LayoutGrid, List, Pencil, Search, Tag, Trash2, X} from "lucide-react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {photoBoardService} from "@/services/photo-board-service";
import {uploadService} from "@/services/upload-service";
import {useAuth} from "@/hooks/use-auth";
import {useSeo} from "@/hooks/use-seo";
import type {PhotoBoardPost} from "@/types";
import styles from "./photo-board.module.scss";

type ViewMode = "board" | "portfolio";
/**
 * Constant GALLERY_VIEW_MODE_STORAGE_KEY.
 */
const GALLERY_VIEW_MODE_STORAGE_KEY = "gallery:view-mode";
/**
 * Constant LEGACY_PHOTO_VIEW_MODE_STORAGE_KEY.
 */
const LEGACY_PHOTO_VIEW_MODE_STORAGE_KEY = "photo-board:view-mode";
type PhotoBoardRouteState = {
	openAsModal?:boolean;
	modalRuntimeId?:string;
	photoPostId?:number;
};
/**
 * Constant PHOTO_BOARD_MODAL_RUNTIME_ID.
 */
const PHOTO_BOARD_MODAL_RUNTIME_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * 게시글 제목을 URL 슬러그 형식으로 정규화합니다.
 *
 * @param title 원본 제목
 * @returns 공백이 `-`로 치환된 슬러그
 */
const toGalleryPostSlug = (title:string):string =>
	title
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");

/**
 * 제목 기반 상세 페이지 경로를 생성합니다.
 *
 * @param title 게시글 제목
 * @returns `/gallery/{slug}` 경로
 */
const toGalleryPostPath = (title:string):string => {
	const normalizedSlug = toGalleryPostSlug(title);
	if(!normalizedSlug){
		return "/gallery";
	}
	return `/gallery/${encodeURIComponent(normalizedSlug)}`;
};

const PhotoBoardPage:React.FC = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const {postTitle} = useParams<{postTitle:string}>();
	const {user} = useAuth();
	const decodedPostSlug = useMemo(() => {
		if(!postTitle){
			return "";
		}
		try{
			return toGalleryPostSlug(decodeURIComponent(postTitle));
		}catch(_error){
			return toGalleryPostSlug(postTitle);
		}
	}, [postTitle]);
	const routeState = location.state as PhotoBoardRouteState | null;
	const routePhotoPostId = routeState?.photoPostId ?? null;
	const isDetailRoute = decodedPostSlug.length > 0;
	const isModalDetailRoute = isDetailRoute
		&& routeState?.openAsModal === true
		&& routeState?.modalRuntimeId === PHOTO_BOARD_MODAL_RUNTIME_ID;
	const isStandaloneDetailPage = isDetailRoute && !isModalDetailRoute;

	const seoTitle = isDetailRoute ? "갤러리 상세" : "갤러리";
	const seoDescription = isDetailRoute
		? "갤러리 상세 페이지입니다."
		: "Sexynogi 커뮤니티 이미지 갤러리입니다.";
	const seoCanonicalPath = isDetailRoute && decodedPostSlug
		? `/gallery/${encodeURIComponent(decodedPostSlug)}`
		: "/gallery";
	useSeo({
		title : seoTitle,
		description : seoDescription,
		canonicalPath : seoCanonicalPath
	});
	const fileInputRef = useRef<HTMLInputElement>(null);
	const editFileInputRef = useRef<HTMLInputElement>(null);
	const pageDragCounterRef = useRef(0);
	const createImageMoveRequestRef = useRef(0);
	const selectedPostImageMoveRequestRef = useRef(0);
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
	const [formImageUrls, setFormImageUrls] = useState<string[]>([]);
	const [createImageIndex, setCreateImageIndex] = useState(0);
	const [createImageLoading, setCreateImageLoading] = useState(false);
	const [formDescription, setFormDescription] = useState("");
	const [formTags, setFormTags] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);

	const [selectedPost, setSelectedPost] = useState<PhotoBoardPost | null>(null);
	const [selectedPostImageIndex, setSelectedPostImageIndex] = useState(0);
	const [selectedPostImageLoading, setSelectedPostImageLoading] = useState(false);
	const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [editImageUrls, setEditImageUrls] = useState<string[]>([]);
	const [editDescription, setEditDescription] = useState("");
	const [editTags, setEditTags] = useState("");
	const [editSubmitting, setEditSubmitting] = useState(false);
	const [editUploadProgress, setEditUploadProgress] = useState<number | null>(null);
	const [likeLoadingIds, setLikeLoadingIds] = useState<Set<number>>(new Set());

	const currentUserId = user?.id ?? user?.userId ?? null;

	/**
	 * 외부 링크 게시글 여부를 판별합니다.
	 *
	 * @param _post 대상 게시글
	 * @returns 현재는 항상 `false`
	 */
	const isExternalPost = (_post:PhotoBoardPost):boolean => false;

	/**
	 * 목록/상세에 표시할 게시글 제목을 반환합니다.
	 *
	 * @param post 게시글 데이터
	 * @returns 표시 제목
	 */
	const getDisplayTitle = (post:PhotoBoardPost):string => post.title;

	/**
	 * 목록/상세에 표시할 태그 목록을 반환합니다.
	 *
	 * @param post 게시글 데이터
	 * @returns 태그 문자열 배열
	 */
	const getDisplayTags = (post:PhotoBoardPost):string[] => post.tags;

	/**
	 * 게시글 작성자명을 반환합니다.
	 *
	 * @param post 게시글 데이터
	 * @returns 작성자명(없으면 `익명`)
	 */
	const getAuthorName = (post:PhotoBoardPost):string => {
		const authorNickname = post.authorNickname?.trim();
		return authorNickname || "익명";
	};

	/**
	 * 이미지 URL 목록을 정리합니다.
	 *
	 * @param rawImageUrls 원본 URL 목록
	 * @returns 빈 값 제거 및 중복 제거된 URL 목록
	 */
	const normalizeImageUrls = (rawImageUrls:string[] | null | undefined):string[] => {
		/**
		 * Utility function normalized.
		 */
		const normalized = (rawImageUrls ?? [])
			.map((url) => (url ?? "").trim())
			.filter((url) => url.length > 0);
		if(normalized.length > 0){
			return Array.from(new Set(normalized));
		}
		return [];
	};

	/**
	 * 수동 입력 문자열에서 이미지 URL 목록을 추출합니다.
	 *
	 * @param rawValue 쉼표/개행 기반 입력 문자열
	 * @returns 정규화된 URL 목록
	 */
	const parseManualImageUrls = (rawValue:string):string[] => {
		return normalizeImageUrls(rawValue.split(/[\n,]/).map((value) => value.trim()));
	};

	/**
	 * 선택된 인덱스의 이미지를 대표 이미지 위치(맨 앞)로 이동합니다.
	 *
	 * @param imageUrls 현재 이미지 배열
	 * @param index 이동할 이미지 인덱스
	 * @returns 대표 이미지 기준으로 재배열된 배열
	 */
	const moveImageToFront = (imageUrls:string[], index:number):string[] => {
		if(imageUrls.length <= 1 || index <= 0 || index >= imageUrls.length){
			return imageUrls;
		}
		const nextImageUrls = [...imageUrls];
		const [selectedImage] = nextImageUrls.splice(index, 1);
		nextImageUrls.unshift(selectedImage);
		return nextImageUrls;
	};

	const createImageCount = formImageUrls.length;
	const createImageCursor = createImageCount > 0
		? Math.max(0, Math.min(createImageIndex, createImageCount - 1))
		: 0;
	const createCurrentImageUrl = createImageCount > 0 ? formImageUrls[createImageCursor] : null;

	/**
	 * 이미지 전환 전에 다음 이미지를 미리 로드합니다.
	 *
	 * @param url 프리로드할 이미지 URL
	 * @returns 로드 완료 Promise
	 */
	const preloadImage = async(url:string | null | undefined):Promise<void> => {
		if(!url || typeof window === "undefined"){
			return;
		}
		await new Promise<void>((resolve) => {
			const image = new window.Image();
			image.onload = () => resolve();
			image.onerror = () => resolve();
			image.src = url;
		});
	};

	/**
	 * 작성 모달의 현재 이미지를 프리로드 후 전환합니다.
	 *
	 * @param nextIndex 이동할 다음 인덱스
	 */
	const moveCreateImageWithPreload = async(nextIndex:number) => {
		if(createImageCount <= 1){
			return;
		}
		const nextImageUrl = formImageUrls[nextIndex];
		const requestId = createImageMoveRequestRef.current + 1;
		createImageMoveRequestRef.current = requestId;
		setCreateImageLoading(true);
		await preloadImage(nextImageUrl);
		if(createImageMoveRequestRef.current === requestId){
			setCreateImageIndex(nextIndex);
			setCreateImageLoading(false);
		}
	};

	/**
	 * Utility function handleCreatePrevImage.
	 */
	const handleCreatePrevImage = () => {
		if(createImageCount <= 1){
			return;
		}
		const nextIndex = createImageCursor <= 0 ? createImageCount - 1 : createImageCursor - 1;
		void moveCreateImageWithPreload(nextIndex);
	};

	/**
	 * Utility function handleCreateNextImage.
	 */
	const handleCreateNextImage = () => {
		if(createImageCount <= 1){
			return;
		}
		const nextIndex = createImageCursor >= createImageCount - 1 ? 0 : createImageCursor + 1;
		void moveCreateImageWithPreload(nextIndex);
	};

	/**
	 * Utility function handleSetCreateRepresentativeImage.
	 */
	const handleSetCreateRepresentativeImage = () => {
		if(createImageCount <= 1 || createImageCursor === 0){
			return;
		}
		createImageMoveRequestRef.current += 1;
		setFormImageUrls((prev) => moveImageToFront(prev, createImageCursor));
		setCreateImageIndex(0);
		setCreateImageLoading(false);
	};

	/**
	 * Utility function getPostImageUrls.
	 */
	const getPostImageUrls = (post:PhotoBoardPost):string[] =>
		normalizeImageUrls(post.imageUrls);

	/**
	 * Utility function getPostPrimaryImageUrl.
	 */
	const getPostPrimaryImageUrl = (post:PhotoBoardPost):string =>
		getPostImageUrls(post)[0] || "";

	const selectedPostImageUrls = selectedPost ? getPostImageUrls(selectedPost) : [];
	const selectedPostImageCount = selectedPostImageUrls.length;
	const selectedPostImageCursor = selectedPostImageCount > 0
		? Math.max(0, Math.min(selectedPostImageIndex, selectedPostImageCount - 1))
		: 0;
	const selectedPostCurrentImageUrl = selectedPostImageCount > 0
		? selectedPostImageUrls[selectedPostImageCursor]
		: null;

	/**
	 * Utility function moveSelectedPostImageWithPreload.
	 */
	const moveSelectedPostImageWithPreload = async(nextIndex:number) => {
		if(selectedPostImageCount <= 1){
			return;
		}
		const nextImageUrl = selectedPostImageUrls[nextIndex];
		const requestId = selectedPostImageMoveRequestRef.current + 1;
		selectedPostImageMoveRequestRef.current = requestId;
		setSelectedPostImageLoading(true);
		await preloadImage(nextImageUrl);
		if(selectedPostImageMoveRequestRef.current === requestId){
			setSelectedPostImageIndex(nextIndex);
			setSelectedPostImageLoading(false);
		}
	};

	/**
	 * Utility function handleSelectedPostPrevImage.
	 */
	const handleSelectedPostPrevImage = () => {
		if(selectedPostImageCount <= 1){
			return;
		}
		const nextIndex = selectedPostImageCursor <= 0 ? selectedPostImageCount - 1 : selectedPostImageCursor - 1;
		void moveSelectedPostImageWithPreload(nextIndex);
	};

	/**
	 * Utility function handleSelectedPostNextImage.
	 */
	const handleSelectedPostNextImage = () => {
		if(selectedPostImageCount <= 1){
			return;
		}
		const nextIndex = selectedPostImageCursor >= selectedPostImageCount - 1 ? 0 : selectedPostImageCursor + 1;
		void moveSelectedPostImageWithPreload(nextIndex);
	};

	/**
	 * Utility function getPostKey.
	 */
	const getPostKey = (post:PhotoBoardPost):string =>
		post.photoPostId !== null
			? `photo-${post.photoPostId}`
			: `photo-${post.title}-${post.createdAt}`;

	const loadPosts = useCallback(async() => {
		if(isStandaloneDetailPage){
			setLoading(false);
			return;
		}
		try{
			setLoading(true);
			setError(null);
			const requestTag = selectedTag === "ALL" ? null : selectedTag;
			const pageData = await photoBoardService.getPosts(currentPage, 20, searchKeyword || null, requestTag);
			setPosts(pageData.content);
			setTotalPages(pageData.totalPages);
		}catch(err){
			console.error("게시글 목록 로드 실패:", err);
			setError("게시글 목록을 불러오지 못했습니다.");
		}finally{
			setLoading(false);
		}
	}, [currentPage, searchKeyword, selectedTag, isStandaloneDetailPage]);

	useEffect(() => {
		loadPosts();
	}, [loadPosts]);

	useEffect(() => {
		setCreateImageIndex((prev) => {
			if(formImageUrls.length === 0){
				return 0;
			}
			return Math.min(prev, formImageUrls.length - 1);
		});
		setCreateImageLoading(false);
	}, [formImageUrls.length]);

	useEffect(() => {
		localStorage.setItem(GALLERY_VIEW_MODE_STORAGE_KEY, viewMode);
	}, [viewMode]);

	const allTags = useMemo(() => {
		const tags = new Set<string>();
		posts.forEach((post) => post.tags.forEach((tag) => tags.add(tag)));
		return ["ALL", ...Array.from(tags)];
	}, [posts]);

	/**
	 * Utility function handleKeywordChange.
	 */
	const handleKeywordChange = (value:string) => {
		setCurrentPage(0);
		setSearchKeyword(value);
	};

	/**
	 * Utility function handleTagChange.
	 */
	const handleTagChange = (tag:string) => {
		setCurrentPage(0);
		setSelectedTag(tag);
	};

	/**
	 * 드래그 이벤트에 파일 payload가 포함되어 있는지 확인합니다.
	 *
	 * @param event 드래그 이벤트
	 * @returns 파일 포함 여부
	 */
	const hasFilePayload = (event:{dataTransfer:DataTransfer | null}) =>
		Boolean(event.dataTransfer && Array.from(event.dataTransfer.types || []).includes("Files"));

	/**
	 * 이미지 파일 업로드를 수행하고 작성 모달 상태를 초기화합니다.
	 *
	 * @param files 업로드할 파일 목록
	 */
	const handleImageUpload = async(files:File[]) => {
		if(files.length === 0){
			return;
		}
		try{
			setUploadProgress(0);
			const result = await uploadService.uploadTempImages(files, "board", (progress) => setUploadProgress(progress));
			if(result.success && result.urls && result.urls.length > 0){
				createImageMoveRequestRef.current += 1;
				setFormImageUrls(result.urls);
				setCreateImageIndex(0);
				setCreateImageLoading(false);
				setShowCreateModal(true);
				return;
			}
			alert(result.message || "이미지 업로드에 실패했습니다.");
		}catch(err:any){
			alert(err?.message || "이미지 업로드에 실패했습니다.");
		}finally{
			setUploadProgress(null);
		}
	};

	/**
	 * Utility function handleCreateModalOpenByFile.
	 */
	const handleCreateModalOpenByFile = () => {
		if(!user){
			alert("로그인 후 이용해 주세요.");
			return;
		}
		fileInputRef.current?.click();
	};

	/**
	 * Utility function handleFileSelect.
	 */
	const handleFileSelect = async(e:React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if(files.length > 0){
			await handleImageUpload(files);
		}
		e.target.value = "";
	};

	/**
	 * Utility function handleCreateDrop.
	 */
	const handleCreateDrop = async(e:React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsCreateDragOver(false);
		const files = Array.from(e.dataTransfer.files ?? []);
		if(files.length > 0){
			await handleImageUpload(files);
		}
	};

	/**
	 * Utility function handlePageDragEnter.
	 */
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

	/**
	 * Utility function handlePageDragOver.
	 */
	const handlePageDragOver = (e:React.DragEvent<HTMLDivElement>) => {
		if(!hasFilePayload(e)){
			return;
		}
		e.preventDefault();
	};

	/**
	 * Utility function handlePageDragLeave.
	 */
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

	/**
	 * Utility function handlePageDrop.
	 */
	const handlePageDrop = async(e:React.DragEvent<HTMLDivElement>) => {
		if(!hasFilePayload(e)){
			return;
		}
		e.preventDefault();
		pageDragCounterRef.current = 0;
		setIsPageDragOver(false);
		if(!user){
			alert("로그인 후 이용해 주세요.");
			return;
		}
		const files = Array.from(e.dataTransfer.files ?? []);
		if(files.length > 0){
			await handleImageUpload(files);
		}
	};

	/**
	 * Utility function handleEditImageUpload.
	 */
	const handleEditImageUpload = async(files:File[]) => {
		if(files.length === 0){
			return;
		}
		try{
			setEditUploadProgress(0);
			const result = await uploadService.uploadTempImages(files, "board", (progress) => setEditUploadProgress(progress));
			if(result.success && result.urls && result.urls.length > 0){
				setEditImageUrls((prev) => normalizeImageUrls([...prev, ...result.urls]));
				return;
			}
			alert(result.message || "이미지 업로드에 실패했습니다.");
		}catch(err:any){
			alert(err?.message || "이미지 업로드에 실패했습니다.");
		}finally{
			setEditUploadProgress(null);
		}
	};

	/**
	 * Utility function handleEditFileSelect.
	 */
	const handleEditFileSelect = async(e:React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if(files.length > 0){
			await handleEditImageUpload(files);
		}
		e.target.value = "";
	};

	/**
	 * Utility function handleEditDrop.
	 */
	const handleEditDrop = async(e:React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsEditDragOver(false);
		const files = Array.from(e.dataTransfer.files ?? []);
		if(files.length > 0){
			await handleEditImageUpload(files);
		}
	};

	/**
	 * Utility function handleRemoveEditImage.
	 */
	const handleRemoveEditImage = (index:number) => {
		setEditImageUrls((prev) => prev.filter((_imageUrl, imageIndex) => imageIndex !== index));
	};

	/**
	 * Utility function normalizeSingleTag.
	 */
	const normalizeSingleTag = (value:string):string =>
		value.replace(/^#+/, "").trim();

	/**
	 * Utility function parseTagsInput.
	 */
	const parseTagsInput = (rawValue:string):string[] => {
		const uniqueTags = new Set<string>();
		rawValue.split(/[,\s]+/).forEach((tag) => {
			const normalized = normalizeSingleTag(tag);
			if(normalized){
				uniqueTags.add(normalized);
			}
		});
		return Array.from(uniqueTags);
	};

	/**
	 * Utility function normalizeTagInputValue.
	 */
	const normalizeTagInputValue = (rawValue:string):string =>
		parseTagsInput(rawValue).join(", ");

	/**
	 * Utility function normalizeTagInputValueOnType.
	 */
	const normalizeTagInputValueOnType = (rawValue:string):string => {
		const parsedTags = parseTagsInput(rawValue);
		if(parsedTags.length === 0){
			return "";
		}
		const hasTrailingDelimiter = /[,\s]+$/.test(rawValue);
		return hasTrailingDelimiter ? `${parsedTags.join(", ")}, ` : parsedTags.join(", ");
	};

	/**
	 * Utility function removeTagFromInput.
	 */
	const removeTagFromInput = (rawValue:string, tagToRemove:string):string =>
		parseTagsInput(rawValue)
			.filter((tag) => tag !== tagToRemove)
			.join(", ");

	/**
	 * Utility function formatDate.
	 */
	const formatDate = (dateString:string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("ko-KR", {year : "numeric", month : "2-digit", day : "2-digit"});
	};

	/**
	 * Utility function closeCreateModal.
	 */
	const closeCreateModal = () => {
		createImageMoveRequestRef.current += 1;
		setShowCreateModal(false);
		setIsCreateDragOver(false);
		setFormImageUrls([]);
		setCreateImageIndex(0);
		setCreateImageLoading(false);
	};

	/**
	 * Utility function handleCreatePost.
	 */
	const handleCreatePost = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!formTitle.trim()){
			alert("제목을 입력해 주세요.");
			return;
		}
		const normalizedFormImageUrls = normalizeImageUrls(formImageUrls);
		if(normalizedFormImageUrls.length === 0){
			alert("이미지 URL을 입력해 주세요. 이미지를 업로드하면 자동으로 입력됩니다.");
			return;
		}

		const tags = parseTagsInput(formTags);

		try{
			setSubmitting(true);
			await photoBoardService.createPost({
				title : formTitle.trim(),
				imageUrls : normalizedFormImageUrls,
				description : formDescription.trim() || "",
				tags
			});

			setFormTitle("");
			setFormImageUrls([]);
			setCreateImageIndex(0);
			setFormDescription("");
			setFormTags("");
			setShowCreateModal(false);
			setCurrentPage(0);
			await loadPosts();
		}catch(err:any){
			alert(err.message || "게시글 작성에 실패했습니다.");
		}finally{
			setSubmitting(false);
		}
	};

	/**
	 * Utility function resetDetailState.
	 */
	const resetDetailState = () => {
		selectedPostImageMoveRequestRef.current += 1;
		setSelectedPost(null);
		setIsEditing(false);
		setSelectedPostImageIndex(0);
		setSelectedPostImageLoading(false);
		setZoomImageUrl(null);
	};

	/**
	 * Utility function openPostDetailById.
	 */
	const openPostDetailById = async(photoPostId:number) => {
		try{
			setDetailLoading(true);
			setIsEditing(false);
			selectedPostImageMoveRequestRef.current += 1;
			setSelectedPostImageIndex(0);
			setSelectedPostImageLoading(false);
			const post = await photoBoardService.getPost(photoPostId);
			setSelectedPost(post);
			setPosts((prev) => prev.map((item) => item.photoPostId === post.photoPostId ? {...item, viewCount : post.viewCount} : item));
		}catch(err:any){
			alert(err.message || "게시글 상세를 불러오지 못했습니다.");
		}finally{
			setDetailLoading(false);
		}
	};

	/**
	 * Utility function openPostDetailBySlug.
	 */
	const openPostDetailBySlug = async(slug:string) => {
		try{
			setDetailLoading(true);
			setIsEditing(false);
			selectedPostImageMoveRequestRef.current += 1;
			setSelectedPostImageIndex(0);
			setSelectedPostImageLoading(false);
			const post = await photoBoardService.getPostBySlug(slug);
			setSelectedPost(post);
			setPosts((prev) => prev.map((item) => item.photoPostId === post.photoPostId ? {...item, viewCount : post.viewCount} : item));
		}catch(err:any){
			alert(err.message || "게시글 상세를 불러오지 못했습니다.");
			resetDetailState();
		}finally{
			setDetailLoading(false);
		}
	};

	/**
	 * Utility function closeDetailModal.
	 */
	const closeDetailModal = () => {
		resetDetailState();
		if(isModalDetailRoute){
			navigate(-1);
			return;
		}
		if(isDetailRoute){
			navigate("/gallery");
		}
	};

	/**
	 * Utility function handleOpenZoomImage.
	 */
	const handleOpenZoomImage = (imageUrl:string | null | undefined) => {
		if(!imageUrl){
			return;
		}
		setZoomImageUrl(imageUrl);
	};

	/**
	 * Utility function handleCloseZoomImage.
	 */
	const handleCloseZoomImage = () => {
		setZoomImageUrl(null);
	};

	/**
	 * Utility function handlePostClick.
	 */
	const handlePostClick = (post:PhotoBoardPost) => {
		if(post.photoPostId !== null){
			navigate(toGalleryPostPath(post.title), {
				state : {
					openAsModal : true,
					modalRuntimeId : PHOTO_BOARD_MODAL_RUNTIME_ID,
					photoPostId : post.photoPostId
				} satisfies PhotoBoardRouteState
			});
		}
	};

	useEffect(() => {
		if(!isDetailRoute){
			resetDetailState();
			setDetailLoading(false);
			return;
		}
		if(isModalDetailRoute && routePhotoPostId != null){
			void openPostDetailById(routePhotoPostId);
			return;
		}
		void openPostDetailBySlug(decodedPostSlug);
	}, [decodedPostSlug, isDetailRoute, isModalDetailRoute, routePhotoPostId]);

	useEffect(() => {
		if(!isDetailRoute || !selectedPost){
			return;
		}
		const canonicalPath = toGalleryPostPath(selectedPost.title);
		if(location.pathname === canonicalPath){
			return;
		}
		navigate(canonicalPath, {
			replace : true,
			state : isModalDetailRoute
				? {
					openAsModal : true,
					modalRuntimeId : PHOTO_BOARD_MODAL_RUNTIME_ID,
					photoPostId : selectedPost.photoPostId ?? undefined
				} satisfies PhotoBoardRouteState
				: undefined
		});
	}, [isDetailRoute, isModalDetailRoute, location.pathname, navigate, selectedPost]);

	const canManageSelected = !!selectedPost && !!currentUserId && selectedPost.userId === currentUserId;

	/**
	 * Utility function startEditSelectedPost.
	 */
	const startEditSelectedPost = () => {
		if(!selectedPost) return;
		setIsEditing(true);
		setEditTitle(selectedPost.title);
		const selectedImageUrls = getPostImageUrls(selectedPost);
		setEditImageUrls(selectedImageUrls);
		setEditDescription(selectedPost.description || "");
		setEditTags(selectedPost.tags.join(", "));
	};

	/**
	 * Utility function cancelEditSelectedPost.
	 */
	const cancelEditSelectedPost = () => {
		setIsEditing(false);
	};

	/**
	 * Utility function handleUpdateSelectedPost.
	 */
	const handleUpdateSelectedPost = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!selectedPost || selectedPost.photoPostId === null) return;

		if(!editTitle.trim()){
			alert("제목을 입력해 주세요.");
			return;
		}
		const normalizedEditImageUrls = normalizeImageUrls(editImageUrls);
		if(normalizedEditImageUrls.length === 0){
			alert("최소 1개의 이미지를 선택해 주세요.");
			return;
		}

		const tags = parseTagsInput(editTags);

		try{
			setEditSubmitting(true);
			const updated = await photoBoardService.updatePost(selectedPost.photoPostId, {
				title : editTitle.trim(),
				imageUrls : normalizedEditImageUrls,
				description : editDescription.trim() || "",
				tags
			});
			setSelectedPost(updated);
			setPosts((prev) => prev.map((item) => item.photoPostId === updated.photoPostId ? updated : item));
			setIsEditing(false);
			if(isDetailRoute){
				const nextPath = toGalleryPostPath(updated.title);
				if(location.pathname !== nextPath){
					navigate(nextPath, {
						replace : true,
						state : isModalDetailRoute
							? {
								openAsModal : true,
								modalRuntimeId : PHOTO_BOARD_MODAL_RUNTIME_ID,
								photoPostId : updated.photoPostId ?? undefined
							} satisfies PhotoBoardRouteState
							: undefined
					});
				}
			}
		}catch(err:any){
			alert(err.message || "게시글 수정에 실패했습니다.");
		}finally{
			setEditSubmitting(false);
		}
	};

	/**
	 * Utility function handleDeleteSelectedPost.
	 */
	const handleDeleteSelectedPost = async() => {
		if(!selectedPost || selectedPost.photoPostId === null) return;
		if(!window.confirm("정말 이 게시글을 삭제하시겠습니까?")) return;

		try{
			await photoBoardService.deletePost(selectedPost.photoPostId);
			resetDetailState();
			navigate("/gallery");
			if(!isStandaloneDetailPage){
				await loadPosts();
			}
		}catch(err:any){
			alert(err.message || "게시글 삭제에 실패했습니다.");
		}
	};

	/**
	 * Utility function applyPostUpdate.
	 */
	const applyPostUpdate = (updated:PhotoBoardPost) => {
		setPosts((prev) => prev.map((item) => item.photoPostId === updated.photoPostId ? updated : item));
		setSelectedPost((prev) => prev && prev.photoPostId === updated.photoPostId ? updated : prev);
	};

	/**
	 * Utility function handleToggleLike.
	 */
	const handleToggleLike = async(photoPostId:number) => {
		if(!currentUserId){
			alert("좋아요는 로그인 후 이용해 주세요.");
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
			alert(err.message || "좋아요 처리에 실패했습니다.");
		}finally{
			setLikeLoadingIds((prev) => {
				const next = new Set(prev);
				next.delete(photoPostId);
				return next;
			});
		}
	};

	/**
	 * Utility function handleToggleLikeClick.
	 */
	const handleToggleLikeClick = async(e:React.MouseEvent, photoPostId:number) => {
		e.stopPropagation();
		await handleToggleLike(photoPostId);
	};


	/**
	 * Utility function renderFeedCard.
	 */
	const renderFeedCard = (post:PhotoBoardPost) => {
		const externalPost = isExternalPost(post);
		const displayTags = getDisplayTags(post);
		const visibleTags = displayTags.slice(0, 4);

		return (
			<article key={getPostKey(post)} className={styles.photoCard} onClick={() => handlePostClick(post)}>
				<div className={styles.cardImageWrap}>
					<img src={getPostPrimaryImageUrl(post)} alt={getDisplayTitle(post)}/>
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
						{externalPost && <span className={styles.externalMeta}>외부</span>}
					</div>
					<h3 className={styles.postTitle}>
						<span className={styles.postTitleText}>{getDisplayTitle(post)}</span>
						
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
				{isStandaloneDetailPage ? (
					<section className={styles.standaloneDetailSection}>
						<div className={styles.modalContent}>
							<div className={styles.modalHeader}>
								<h2>{isEditing ? "게시글 수정" : "게시글 상세"}</h2>
								<button type="button" className={styles.closeBtn} onClick={closeDetailModal}><X size={18}/></button>
							</div>
							{detailLoading ? (
								<div className={styles.modalBody}>불러오는 중...</div>
							) : !selectedPost ? (
								<div className={styles.modalBody}>
									<p>게시글을 찾을 수 없습니다.</p>
									<div className={styles.modalActions}>
										<button type="button" className={styles.secondaryBtn} onClick={closeDetailModal}>목록으로</button>
									</div>
								</div>
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
											<strong>이미지를 드래그하거나 클릭해 업로드</strong>
											<span>JPG, PNG, GIF, WEBP (최대 30MB)</span>
										</div>
									</div>
									<div className={styles.uploadRow}>
										<input ref={editFileInputRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleEditFileSelect} className={styles.fileInput}/>
										<button type="button" className={styles.uploadBtn} onClick={() => editFileInputRef.current?.click()} disabled={editUploadProgress !== null}><ImagePlus size={16}/>이미지 업로드</button>
										<span className={styles.editImageHelper}>현재 {editImageUrls.length}장</span>
									</div>
									{editUploadProgress !== null && <div className={styles.progressBar}><div className={styles.progressFill} style={{width : `${editUploadProgress}%`}}/></div>}
									{editImageUrls.length > 0 && (
										<div className={styles.editImageList}>
											{editImageUrls.map((imageUrl, imageIndex) => (
												<div key={`edit-image-${imageIndex}-${imageUrl}`} className={styles.editImageItem}>
													<img src={imageUrl} alt={`edit image ${imageIndex + 1}`}/>
													<button
														type="button"
														className={styles.editImageRemoveBtn}
														onClick={() => handleRemoveEditImage(imageIndex)}
													>
														삭제
													</button>
												</div>
											))}
										</div>
									)}
									<input
										type="text"
										value={editTags}
										onChange={(e) => setEditTags(normalizeTagInputValueOnType(e.target.value))}
										onBlur={() => setEditTags((prev) => normalizeTagInputValue(prev))}
										placeholder="태그들 (쉼표/공백 구분, # 선택)"
									/>
									{parseTagsInput(editTags).length > 0 && (
										<div className={styles.tagInputPreview}>
											{parseTagsInput(editTags).map((tag) => (
												<button
													key={`standalone-edit-tag-${tag}`}
													type="button"
													className={styles.tagPreviewChip}
													onClick={() => setEditTags((prev) => removeTagFromInput(prev, tag))}
												>
													<span>#{tag}</span>
													<X size={12}/>
												</button>
											))}
										</div>
									)}
									<textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="설명" maxLength={1000}/>
									<div className={styles.modalActions}>
										<button type="button" className={styles.secondaryBtn} onClick={cancelEditSelectedPost}>취소</button>
										<button type="submit" className={styles.primaryBtn} disabled={editSubmitting || editUploadProgress !== null}>{editSubmitting ? "저장 중..." : "저장"}</button>
									</div>
								</form>
							) : (
								<div className={styles.modalBody}>
									<div className={styles.modalImageWrap}>
										<img
											src={selectedPostCurrentImageUrl || getPostPrimaryImageUrl(selectedPost)}
											alt={getDisplayTitle(selectedPost)}
											className={`${styles.modalImage} ${styles.zoomableImage}`}
											onClick={() => handleOpenZoomImage(selectedPostCurrentImageUrl || getPostPrimaryImageUrl(selectedPost))}
										/>
										{selectedPostImageLoading && <div className={styles.imageLoadingOverlay}>로딩 중...</div>}
									</div>
									{selectedPostImageCount > 1 && (
										<div className={styles.modalActions}>
											<button type="button" className={styles.secondaryBtn} onClick={handleSelectedPostPrevImage} disabled={selectedPostImageLoading}>이전</button>
											<span>{selectedPostImageCursor + 1} / {selectedPostImageCount}</span>
											<button type="button" className={styles.secondaryBtn} onClick={handleSelectedPostNextImage} disabled={selectedPostImageLoading}>다음</button>
										</div>
									)}
									<h3 className={styles.postTitle}>
										<span className={styles.postTitleText}>{getDisplayTitle(selectedPost)}</span>
									</h3>
									<p>{selectedPost.description || "설명이 없습니다."}</p>
									<div className={styles.modalTags}>{getDisplayTags(selectedPost).map((tag) => <span key={`modal-standalone-${selectedPost.photoPostId}-${tag}`}>#{tag}</span>)}</div>
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
									<div className={styles.modalActions}>
										<button type="button" className={styles.secondaryBtn} onClick={closeDetailModal}>목록으로</button>
										{canManageSelected && (
											<>
												<button type="button" className={styles.secondaryBtn} onClick={startEditSelectedPost}><Pencil size={14}/>수정</button>
												<button type="button" className={styles.dangerBtn} onClick={handleDeleteSelectedPost}><Trash2 size={14}/>삭제</button>
											</>
										)}
									</div>
								</div>
							)}
						</div>
					</section>
				) : (
					<>
				<section className={styles.hero}>
					<h1 className="page-heading">갤러리</h1>

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
									<strong>{user ? "이미지를 드래그하거나 클릭해서 빠르게 업로드" : "이미지 업로드는 로그인 후 이용할 수 있습니다."}</strong>
									<span>{user ? "JPG / PNG / GIF / WEBP 업로드 후 작성 창에서 캡션과 태그를 입력하세요." : "검색과 게시글 열람은 계속 사용할 수 있습니다."}</span>
								</div>
							</button>
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
                            글 작성
						</button>
					)}
					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept="image/jpeg,image/png,image/gif,image/webp"
						onChange={handleFileSelect}
						className={styles.fileInput}
					/>
				</section>

				<section className={styles.toolbar}>
					<div className={styles.viewSwitch}>
						<button type="button" className={viewMode === "board" ? styles.active : ""} onClick={() => setViewMode("board")}>
							<List size={16}/>
							목록
						</button>
						<button type="button" className={viewMode === "portfolio" ? styles.active : ""} onClick={() => setViewMode("portfolio")}>
							<LayoutGrid size={16}/>
							갤러리
						</button>
					</div>

					<div className={styles.searchBox}>
						<Search size={16}/>
						<input
							type="text"
							placeholder="제목, 태그, 설명 검색"
							value={searchKeyword}
							onChange={(e) => handleKeywordChange(e.target.value)}
						/>
					</div>
				</section>

				<section className={styles.tagSection}>
					{allTags.map((tag) => (
						<button type="button" key={tag} className={selectedTag === tag ? styles.activeTag : ""} onClick={() => handleTagChange(tag)}>
							<Tag size={12}/>
							{tag === "ALL" ? "전체" : tag}
						</button>
					))}
				</section>

				{loading ? (
                    <div className={styles.emptyState}>불러오는 중...</div>
				) : error ? (
					<div className={styles.emptyState}>{error}</div>
				) : posts.length === 0 ? (
                    <div className={styles.emptyState}>작성된 게시글이 없습니다.</div>
				) : viewMode === "board" ? (
					<section className={styles.boardView}>
						<div className={styles.tableHeader}>
							<span>미리보기</span>
							<span>제목</span>
							<span>작성자</span>
							<span className={styles.dateColumn}>날짜</span>
							<span>반응</span>
						</div>
						{posts.map((post) => (
							<article key={getPostKey(post)} className={styles.tableRow} onClick={() => handlePostClick(post)}>
									<img src={getPostPrimaryImageUrl(post)} alt={getDisplayTitle(post)}/>
									<div className={styles.rowTitle}>
											<h3 className={styles.postTitle}>
												<span className={styles.postTitleText}>{getDisplayTitle(post)}</span>

											</h3>
                                    <p>{post.description || "설명이 없습니다."}</p>
										<div className={styles.rowTags}>{getDisplayTags(post).map((tag) => <span key={`${getPostKey(post)}-${tag}`}>#{tag}</span>)}</div>
								</div>
									<span>{getAuthorName(post)}</span>
								<span className={styles.dateColumn}><Calendar size={14}/>{formatDate(post.createdAt)}</span>
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
					</>
				)}
			</div>

			{isPageDragOver && (
				<div className={styles.pageDropOverlay}>
					<div className={styles.pageDropMessage}>
						<ImagePlus size={24}/>
                        <span>페이지 어디에서나 이미지를 놓으면 업로드 창이 열립니다.</span>
					</div>
				</div>
			)}

			{showCreateModal && (
				<div className={styles.modalOverlay} onClick={formImageUrls.length > 0 ? undefined : closeCreateModal}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
                            <h2>글 작성</h2>
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
<strong>이미지를 드래그하거나 클릭해 업로드</strong>
                                    <span>JPG, PNG, GIF, WEBP (최대 30MB)</span>
								</div>
							</div>
							<div className={styles.uploadRow}>
                                <input
									type="text"
									placeholder="이미지 URL들(쉼표 또는 줄바꿈으로 구분)"
									value={formImageUrls.join(", ")}
									onChange={(e) => {
										setFormImageUrls(parseManualImageUrls(e.target.value));
										setCreateImageIndex(0);
									}}
								/>
							</div>
							{uploadProgress !== null && (
								<div className={styles.progressBar}><div className={styles.progressFill} style={{width : `${uploadProgress}%`}}/></div>
							)}
							{formImageUrls.length > 0 && (
								<div className={styles.createPreview}>
									<div className={styles.createPreviewViewport}>
										<img
											src={createCurrentImageUrl || formImageUrls[0]}
											alt={`upload preview ${createImageCursor + 1}`}
										/>
										{createImageLoading && <div className={styles.imageLoadingOverlay}>로딩 중...</div>}
									</div>
									<div className={styles.createPreviewControls}>
										{createImageCount > 1 && (
											<>
												<button type="button" className={styles.secondaryBtn} onClick={handleCreatePrevImage} disabled={createImageLoading}>이전</button>
												<span className={styles.createPreviewIndex}>{createImageCursor + 1} / {createImageCount}</span>
												<button type="button" className={styles.secondaryBtn} onClick={handleCreateNextImage} disabled={createImageLoading}>다음</button>
											</>
										)}
										<button
											type="button"
											className={styles.secondaryBtn}
											onClick={handleSetCreateRepresentativeImage}
											disabled={createImageLoading || createImageCount <= 1 || createImageCursor === 0}
										>
											대표 이미지로 설정
										</button>
									</div>
								</div>
							)}
							<input
								type="text"
                                placeholder="태그들 (쉼표/공백 구분, # 선택)"
								value={formTags}
								onChange={(e) => setFormTags(normalizeTagInputValueOnType(e.target.value))}
								onBlur={() => setFormTags((prev) => normalizeTagInputValue(prev))}
							/>
							{parseTagsInput(formTags).length > 0 && (
								<div className={styles.tagInputPreview}>
									{parseTagsInput(formTags).map((tag) => (
										<button
											key={`create-tag-${tag}`}
											type="button"
											className={styles.tagPreviewChip}
											onClick={() => setFormTags((prev) => removeTagFromInput(prev, tag))}
										>
											<span>#{tag}</span>
											<X size={12}/>
										</button>
									))}
								</div>
							)}
                            <textarea placeholder="설명" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} maxLength={1000}/>
							<div className={styles.modalActions}>
                                <button type="button" className={styles.secondaryBtn} onClick={closeCreateModal}>닫기</button>
                                <button type="submit" className={styles.primaryBtn} disabled={submitting || uploadProgress !== null}>{submitting ? "작성 중..." : "작성"}</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{selectedPost && isModalDetailRoute && (
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
<strong>이미지를 드래그하거나 클릭해 업로드</strong>
                                        <span>JPG, PNG, GIF, WEBP (최대 30MB)</span>
									</div>
								</div>
								<div className={styles.uploadRow}>
									<input ref={editFileInputRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleEditFileSelect} className={styles.fileInput}/>
                                    <button type="button" className={styles.uploadBtn} onClick={() => editFileInputRef.current?.click()} disabled={editUploadProgress !== null}><ImagePlus size={16}/>이미지 업로드</button>
										<span className={styles.editImageHelper}>현재 {editImageUrls.length}장</span>
								</div>
								{editUploadProgress !== null && <div className={styles.progressBar}><div className={styles.progressFill} style={{width : `${editUploadProgress}%`}}/></div>}
									{editImageUrls.length > 0 && (
										<div className={styles.editImageList}>
											{editImageUrls.map((imageUrl, imageIndex) => (
												<div key={`edit-image-${imageIndex}-${imageUrl}`} className={styles.editImageItem}>
													<img src={imageUrl} alt={`edit image ${imageIndex + 1}`}/>
													<button
														type="button"
														className={styles.editImageRemoveBtn}
														onClick={() => handleRemoveEditImage(imageIndex)}
													>
														삭제
													</button>
												</div>
											))}
										</div>
									)}
								<input
									type="text"
									value={editTags}
									onChange={(e) => setEditTags(normalizeTagInputValueOnType(e.target.value))}
									onBlur={() => setEditTags((prev) => normalizeTagInputValue(prev))}
                                    placeholder="태그들 (쉼표/공백 구분, # 선택)"
								/>
								{parseTagsInput(editTags).length > 0 && (
									<div className={styles.tagInputPreview}>
										{parseTagsInput(editTags).map((tag) => (
											<button
												key={`modal-edit-tag-${tag}`}
												type="button"
												className={styles.tagPreviewChip}
												onClick={() => setEditTags((prev) => removeTagFromInput(prev, tag))}
											>
												<span>#{tag}</span>
												<X size={12}/>
											</button>
										))}
									</div>
								)}
                                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="설명" maxLength={1000}/>
								<div className={styles.modalActions}>
<button type="button" className={styles.secondaryBtn} onClick={cancelEditSelectedPost}>취소</button>
<button type="submit" className={styles.primaryBtn} disabled={editSubmitting || editUploadProgress !== null}>{editSubmitting ? "저장 중..." : "저장"}</button>
								</div>
							</form>
						) : (
							<div className={styles.modalBody}>
									<div className={styles.modalImageWrap}>
										<img
											src={selectedPostCurrentImageUrl || getPostPrimaryImageUrl(selectedPost)}
											alt={getDisplayTitle(selectedPost)}
											className={`${styles.modalImage} ${styles.zoomableImage}`}
											onClick={() => handleOpenZoomImage(selectedPostCurrentImageUrl || getPostPrimaryImageUrl(selectedPost))}
										/>
										{selectedPostImageLoading && <div className={styles.imageLoadingOverlay}>로딩 중...</div>}
									</div>
									{selectedPostImageCount > 1 && (
										<div className={styles.modalActions}>
											<button type="button" className={styles.secondaryBtn} onClick={handleSelectedPostPrevImage} disabled={selectedPostImageLoading}>이전</button>
											<span>{selectedPostImageCursor + 1} / {selectedPostImageCount}</span>
											<button type="button" className={styles.secondaryBtn} onClick={handleSelectedPostNextImage} disabled={selectedPostImageLoading}>다음</button>
										</div>
									)}
									<h3 className={styles.postTitle}>
										<span className={styles.postTitleText}>{getDisplayTitle(selectedPost)}</span>

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
			{zoomImageUrl && (
				<div className={styles.imageZoomOverlay} onClick={handleCloseZoomImage}>
					<div className={styles.imageZoomContent} onClick={(event) => event.stopPropagation()}>
						<button type="button" className={styles.imageZoomCloseBtn} onClick={handleCloseZoomImage}>닫기</button>
						<img src={zoomImageUrl} alt="확대 이미지" className={styles.imageZoomImage}/>
					</div>
				</div>
			)}
		</div>
	);
};

export default PhotoBoardPage;






