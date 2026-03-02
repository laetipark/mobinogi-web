import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
	Users,
	UserPlus,
	Crown,
	Settings,
	RefreshCw,
	Loader2,
	Eye,
	EyeOff,
	Heart,
	ImagePlus,
	Search,
	Package,
	ArrowLeftRight,
	Hammer,
	X,
	CalendarDays,
	Tag,
	Trash2,
	List,
	LayoutGrid,
	MessageSquare,
	User as UserIcon
} from "lucide-react";
import ReactMarkdown, {type Components} from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {GameItemService, guildService, uploadService} from "@/services";
import {useAuth, useSeo} from "@/hooks";
import BoardListTable, {type BoardListTableRow} from "@/components/board/board-list-table";
import MarkdownToolbar from "@/components/board/markdown-toolbar";
import type {
	GameItemSummary,
	LifeBarter,
	LifeCraft,
	GuildBoardCategory,
	GuildBoardPost,
	GuildDashboard,
	GuildGalleryImage,
	GuildMember,
	GuildMemberRankRefreshStatus,
	GuildMemberRankRefreshTarget,
	GuildRole
} from "@/types";
import {
	GUILD_SERVER_OPTIONS,
	formatGuildDateTime,
	getGuildRoleLabel,
	getGuildServerName,
	normalizeGuildRole,
	toGuildSlug
} from "@/features/guild";
import {toItemDetailPath} from "@/utils";
import {serializeBoardReferenceToken} from "@/utils/board-reference-token";
import {remarkSoftBreaks} from "@/utils/remark-soft-breaks";
import commonStyles from "./guild-common.module.scss";
import infoStyles from "./guild-info.module.scss";
import galleryStyles from "./guild-gallery.module.scss";
import boardStyles from "./guild-board.module.scss";

/**
 * Constant styles.
 */
const styles = {...commonStyles, ...infoStyles, ...galleryStyles, ...boardStyles};

type SortDirection = "asc" | "desc";
type GuildSection = "info" | "gallery" | "board";
type GuildGalleryViewMode = "board" | "portfolio";
type GuildMemberSortKey =
	| "memberName"
	| "serverId"
	| "guildRole"
	| "userPower"
	| "userVitality"
	| "userAttractiveness"
	| "rankUpdatedAt"
	| "memberStatus";

type GuildManagementPageProps = {
	forcedSection?:GuildSection;
};
type GuildGalleryRouteState = {
	openAsModal?:boolean;
	modalRuntimeId?:string;
	imageId?:number;
};
/**
 * Constant GUILD_GALLERY_MODAL_RUNTIME_ID.
 */
const GUILD_GALLERY_MODAL_RUNTIME_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
/**
 * Constant GUILD_GALLERY_ALL_TAG.
 */
const GUILD_GALLERY_ALL_TAG = "ALL";

/**
 * 갤러리 제목을 URL 경로용 슬러그로 변환합니다.
 *
 * @param title 원본 제목
 * @returns 공백을 `-`로 치환한 슬러그
 */
const toGalleryTitleSlug = (title:string):string =>
	title
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.toLowerCase();

/**
 * 텍스트를 단일 라인으로 정리합니다.
 * HTML/script/style/주석을 제거하고 공백을 압축합니다.
 *
 * @param value 원본 문자열
 * @returns 정규화된 단일 라인 문자열
 */
const toSingleLineText = (value?:string | null):string => {
	const raw = value ?? "";
	// 과거 로그 노이즈 문구를 화면 노출에서 제외합니다.
	const withoutNoise = raw.replace(/Some events are deferred to the next run because of content length limits\./gi, " ");
	const withoutScripts = withoutNoise.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
	const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
	/**
	 * Utility function decoded.
	 */
	const decoded = (() => {
		if(typeof window === "undefined"){
			return withoutTags;
		}
		const textarea = window.document.createElement("textarea");
		textarea.innerHTML = withoutTags;
		return textarea.value;
	})();
	return decoded.replace(/\s+/g, " ").trim();
};

/**
 * 테이블 셀용 미리보기 텍스트를 생성합니다.
 *
 * @param value 원본 문자열
 * @param maxLength 최대 길이
 * @returns 축약된 텍스트
 */
const toTablePreviewText = (value?:string | null, maxLength:number = 56):string => {
	const normalized = toSingleLineText(value);
	if(!normalized){
		return "-";
	}
	if(normalized.length <= maxLength){
		return normalized;
	}
	return `${normalized.slice(0, maxLength - 1)}...`;
};

const guildBoardMarkdownComponents:Components = {
	table : ({children, ...props}) => (
		<div className={styles.guildBoardComposerTableWrap}>
			<table {...props}>{children}</table>
		</div>
	)
};

/**
 * Constant guildBoardMarkdownRehypePlugins.
 */
const guildBoardMarkdownRehypePlugins = [rehypeRaw, rehypeSanitize];
/**
 * Constant guildBoardMarkdownRemarkPlugins.
 */
const guildBoardMarkdownRemarkPlugins = [remarkGfm, remarkSoftBreaks];
type ReferenceTab = "item" | "barter" | "craft";

/**
 * Constant MAX_GUILD_REFERENCE_RESULTS.
 */
const MAX_GUILD_REFERENCE_RESULTS = 8;

/**
 * 검색/참조용 문자열을 단일 라인으로 정규화합니다.
 */
const toReferenceSingleLine = (value:string | null | undefined):string => (value ?? "").replace(/\s+/g, " ").trim();

/**
 * 안전한 정수값으로 변환합니다.
 */
const toReferenceSafeInteger = (value:number | string | null | undefined):number => {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
};

/**
 * 제작/가공 소요 시간을 표시 문자열로 변환합니다.
 */
const formatReferenceProcessingTime = (processingTime:number | null | undefined):string => {
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
 * 아이템명을 링크 가능한 구조로 정규화합니다.
 */
const toReferenceItemNameAndUrl = (itemName:string | null | undefined):{name:string; url:string} => {
	const normalized = toReferenceSingleLine(itemName);
	if(!normalized){
		return {name : "-", url : ""};
	}
	return {
		name : normalized,
		url : toItemDetailPath(normalized)
	};
};

/**
 * 아이템 참조 토큰 마크다운을 생성합니다.
 */
const buildGuildItemReferenceMarkdown = (item:GameItemSummary):string => {
	const category = [
		toReferenceSingleLine(item.itemMainMenu ?? ""),
		toReferenceSingleLine(item.itemSubMenu ?? ""),
		toReferenceSingleLine(item.itemType)
	].filter(Boolean).join(" > ") || "-";
	const source = toReferenceSingleLine(item.itemSource ?? "") || "-";
	const itemInfo = toReferenceItemNameAndUrl(item.itemName);
	
	return serializeBoardReferenceToken("item", {
		itemName : itemInfo.name,
		itemUrl : itemInfo.url,
		category,
		rarity : toReferenceSingleLine(item.itemRarity) || "-",
		source
	});
};

/**
 * 물물교환 참조 토큰 마크다운을 생성합니다.
 */
const buildGuildBarterReferenceMarkdown = (barter:LifeBarter):string => {
	const rewardPerTrade = toReferenceSafeInteger(barter.itemWeight);
	const maxTrades = toReferenceSafeInteger(barter.barterQty);
	const exchangeCost = toReferenceSafeInteger(barter.exchangeCost);
	const regionName = toReferenceSingleLine(barter.gameRegion?.regionName) || "-";
	const npcName = toReferenceSingleLine(barter.gameNpc?.npcName) || "-";
	const rewardInfo = toReferenceItemNameAndUrl(barter.gameItem?.itemName);
	const exchangeInfo = toReferenceItemNameAndUrl(barter.exchangeItem?.itemName);
	
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
 * 제작 참조 토큰 마크다운을 생성합니다.
 */
const buildGuildCraftReferenceMarkdown = (craft:LifeCraft):string => {
	const craftType = toReferenceSingleLine(craft.craftType) || "-";
	const craftName = toReferenceSingleLine(craft.craftName) || "-";
	const itemName = toReferenceSingleLine(craft.itemName || craft.gameItem?.itemName || "");
	const ingredientName = toReferenceSingleLine(craft.ingredientName || craft.ingredientItem?.itemName || "");
	const ingredientCost = toReferenceSafeInteger(craft.craftIngredientCost);
	const level = craft.craftableLevel === null || craft.craftableLevel === undefined ? "-" : String(craft.craftableLevel);
	const productInfo = toReferenceItemNameAndUrl(itemName);
	const ingredientInfo = toReferenceItemNameAndUrl(ingredientName);
	
	return serializeBoardReferenceToken("craft", {
		productName : productInfo.name,
		productUrl : productInfo.url,
		ingredientName : ingredientInfo.name,
		ingredientUrl : ingredientInfo.url,
		ingredientCost : String(ingredientCost),
		category : `${craftType} > ${craftName}`,
		level,
		time : formatReferenceProcessingTime(craft.processingTime)
	});
};

type GuildDashboardCacheKey = number | "anon";

type GuildDashboardCacheEntry = {
	cachedAt:number;
	key:GuildDashboardCacheKey;
	value:GuildDashboard;
};

/**
 * Constant GUILD_DASHBOARD_CACHE_TTL_MS.
 */
const GUILD_DASHBOARD_CACHE_TTL_MS = 15_000;
/**
 * Constant GUILD_PREVIEW_GALLERY_LIMIT.
 */
const GUILD_PREVIEW_GALLERY_LIMIT = 4;
/**
 * Constant GUILD_PREVIEW_BOARD_LIMIT.
 */
const GUILD_PREVIEW_BOARD_LIMIT = 3;
let guildDashboardCache:GuildDashboardCacheEntry | null = null;

const GuildManagementPage:React.FC<GuildManagementPageProps> = ({forcedSection}) => {
	useSeo({
		title : "길드 페이지 - Mobinogi",
		description : "길드 정보, 가입 신청, 길드원 관리"
	});
	const navigate = useNavigate();
	const location = useLocation();
	const {guildName : guildSlugParam, galleryTitle : galleryTitleParam} = useParams<{guildName?:string; galleryTitle?:string}>();
	const {user} = useAuth();
	const decodedGalleryTitleSlug = useMemo(() => {
		if(!galleryTitleParam){
			return "";
		}
		try{
			return toGalleryTitleSlug(decodeURIComponent(galleryTitleParam));
		}catch(_error){
			return toGalleryTitleSlug(galleryTitleParam);
		}
	}, [galleryTitleParam]);
	const guildGalleryRouteState = location.state as GuildGalleryRouteState | null;
	const guildGalleryRouteImageId = guildGalleryRouteState?.imageId ?? null;
	const isGuildGalleryDetailRoute = decodedGalleryTitleSlug.length > 0;
	const isGuildGalleryModalRoute = isGuildGalleryDetailRoute
		&& guildGalleryRouteState?.openAsModal === true
		&& guildGalleryRouteState?.modalRuntimeId === GUILD_GALLERY_MODAL_RUNTIME_ID;
	const [dashboard, setDashboard] = useState<GuildDashboard | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
	const [error, setError] = useState<string | null>(null);
	const [registerName, setRegisterName] = useState("");
	const [registerServerId, setRegisterServerId] = useState<string>("");
	const [registerDescription, setRegisterDescription] = useState("");
	const [joinGuildId, setJoinGuildId] = useState<string>("");
	const [joinMemberName, setJoinMemberName] = useState("");
	const [guildSearchKeyword, setGuildSearchKeyword] = useState("");
	const [guildMemberKeyword, setGuildMemberKeyword] = useState("");
	const [manualMemberName, setManualMemberName] = useState("");
	const [guildDescriptionDraft, setGuildDescriptionDraft] = useState("");
	const [editingGuildDescription, setEditingGuildDescription] = useState(false);
	const [updatingGuildDescription, setUpdatingGuildDescription] = useState(false);
	const [guildLevelDraft, setGuildLevelDraft] = useState("");
	const [editingGuildLevel, setEditingGuildLevel] = useState(false);
	const [updatingGuildLevel, setUpdatingGuildLevel] = useState(false);
	const [refreshingMemberIds, setRefreshingMemberIds] = useState<Set<number>>(new Set());
	const [roleDrafts, setRoleDrafts] = useState<Record<number, GuildRole>>({});
	const [memberSort, setMemberSort] = useState<{key:GuildMemberSortKey; direction:SortDirection}>({
		key : "guildRole",
		direction : "desc"
	});
	const [refreshingMemberRanks, setRefreshingMemberRanks] = useState(false);
	const [refreshStatus, setRefreshStatus] = useState<GuildMemberRankRefreshStatus | null>(null);
	const pendingDashboardReloadAfterRankRefreshRef = useRef(false);
	const reloadingDashboardAfterRankRefreshRef = useRef(false);
	const [memberViewerMode, setMemberViewerMode] = useState(false);
	const galleryFileInputRef = useRef<HTMLInputElement>(null);
	const guildGalleryCreateImageMoveRequestRef = useRef(0);
	const guildGalleryViewerImageMoveRequestRef = useRef(0);
	const [guildGalleryImages, setGuildGalleryImages] = useState<GuildGalleryImage[]>([]);
	const [loadingGuildGallery, setLoadingGuildGallery] = useState(false);
	const [guildGalleryError, setGuildGalleryError] = useState<string | null>(null);
	const [guildGalleryTitleDraft, setGuildGalleryTitleDraft] = useState("");
	const [guildGalleryDescriptionDraft, setGuildGalleryDescriptionDraft] = useState("");
	const [guildGalleryTagsDraft, setGuildGalleryTagsDraft] = useState("");
	const [guildGalleryKeyword, setGuildGalleryKeyword] = useState("");
	const [selectedGuildGalleryTag, setSelectedGuildGalleryTag] = useState<string>(GUILD_GALLERY_ALL_TAG);
	const [guildGalleryTempImageUrls, setGuildGalleryTempImageUrls] = useState<string[]>([]);
	const [guildGalleryCreateImageIndex, setGuildGalleryCreateImageIndex] = useState(0);
	const [guildGalleryCreateImageLoading, setGuildGalleryCreateImageLoading] = useState(false);
	const [showGuildGalleryCreateModal, setShowGuildGalleryCreateModal] = useState(false);
	const [selectedGuildGalleryImage, setSelectedGuildGalleryImage] = useState<GuildGalleryImage | null>(null);
	const [editingGuildGalleryImage, setEditingGuildGalleryImage] = useState(false);
	const [updatingGuildGalleryImage, setUpdatingGuildGalleryImage] = useState(false);
	const [guildGalleryEditTitleDraft, setGuildGalleryEditTitleDraft] = useState("");
	const [guildGalleryEditDescriptionDraft, setGuildGalleryEditDescriptionDraft] = useState("");
	const [guildGalleryEditTagsDraft, setGuildGalleryEditTagsDraft] = useState("");
	const [guildGalleryEditImageUrlsDraft, setGuildGalleryEditImageUrlsDraft] = useState<string[]>([]);
	const [selectedGuildGalleryImageIndex, setSelectedGuildGalleryImageIndex] = useState(0);
	const [selectedGuildGalleryImageLoading, setSelectedGuildGalleryImageLoading] = useState(false);
	const [guildGalleryZoomImageUrl, setGuildGalleryZoomImageUrl] = useState<string | null>(null);
	const [creatingGuildGalleryImage, setCreatingGuildGalleryImage] = useState(false);
	const [isGuildGalleryDragOver, setIsGuildGalleryDragOver] = useState(false);
	const [uploadingGuildGalleryImage, setUploadingGuildGalleryImage] = useState(false);
	const [guildGalleryUploadAppendMode, setGuildGalleryUploadAppendMode] = useState(false);
	const [guildGalleryUploadProgress, setGuildGalleryUploadProgress] = useState<number | null>(null);
	const [deletingGuildGalleryImageIds, setDeletingGuildGalleryImageIds] = useState<Set<number>>(new Set());
	const [likingGuildGalleryImageIds, setLikingGuildGalleryImageIds] = useState<Set<number>>(new Set());
	const [guildGalleryViewMode, setGuildGalleryViewMode] = useState<GuildGalleryViewMode>("portfolio");
	const [guildBoardPosts, setGuildBoardPosts] = useState<GuildBoardPost[]>([]);
	const [loadingGuildBoardPosts, setLoadingGuildBoardPosts] = useState(false);
	const [guildBoardError, setGuildBoardError] = useState<string | null>(null);
	const [guildBoardCategories, setGuildBoardCategories] = useState<GuildBoardCategory[]>([]);
	const [loadingGuildBoardCategories, setLoadingGuildBoardCategories] = useState(false);
	const [guildBoardCategoryError, setGuildBoardCategoryError] = useState<string | null>(null);
	const [guildBoardCategoryNameDraft, setGuildBoardCategoryNameDraft] = useState("");
	const [selectedGuildBoardCategoryId, setSelectedGuildBoardCategoryId] = useState<string>("");
	const [selectedGuildBoardFilterCategoryId, setSelectedGuildBoardFilterCategoryId] = useState<string>("all");
	const [guildBoardSearchInput, setGuildBoardSearchInput] = useState("");
	const [guildBoardKeyword, setGuildBoardKeyword] = useState("");
	const [creatingGuildBoardCategory, setCreatingGuildBoardCategory] = useState(false);
	const [deletingGuildBoardCategoryIds, setDeletingGuildBoardCategoryIds] = useState<Set<number>>(new Set());
	const [guildBoardTitleDraft, setGuildBoardTitleDraft] = useState("");
	const [guildBoardContentDraft, setGuildBoardContentDraft] = useState("");
	const guildBoardComposerTextareaRef = useRef<HTMLTextAreaElement>(null);
	const guildBoardReferencePanelRef = useRef<HTMLDivElement>(null);
	const guildBoardReferenceTriggerRef = useRef<HTMLButtonElement>(null);
	const [showGuildBoardComposerPreview, setShowGuildBoardComposerPreview] = useState(false);
	const [guildBoardReferenceTab, setGuildBoardReferenceTab] = useState<ReferenceTab>("item");
	const [guildBoardReferenceKeyword, setGuildBoardReferenceKeyword] = useState("");
	const [guildBoardReferenceLoading, setGuildBoardReferenceLoading] = useState(false);
	const [guildBoardReferenceError, setGuildBoardReferenceError] = useState<string | null>(null);
	const [guildBoardItemReferenceResults, setGuildBoardItemReferenceResults] = useState<GameItemSummary[]>([]);
	const [guildBoardBarterReferenceResults, setGuildBoardBarterReferenceResults] = useState<LifeBarter[]>([]);
	const [guildBoardCraftReferenceResults, setGuildBoardCraftReferenceResults] = useState<LifeCraft[]>([]);
	const [showGuildBoardReferencePanel, setShowGuildBoardReferencePanel] = useState(false);
	const [creatingGuildBoardPost, setCreatingGuildBoardPost] = useState(false);
	const [deletingGuildBoardPostIds, setDeletingGuildBoardPostIds] = useState<Set<number>>(new Set());
	const [showGuildBoardCategoryManager, setShowGuildBoardCategoryManager] = useState(false);

	/**
	 * Utility function moveImageToFront.
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

	/**
	 * Utility function normalizeGuildGallerySingleTag.
	 */
	const normalizeGuildGallerySingleTag = (value:string):string =>
		value.replace(/^#+/, "").trim();

	/**
	 * Utility function parseGuildGalleryTagsInput.
	 */
	const parseGuildGalleryTagsInput = (rawValue:string):string[] => {
		const uniqueTags = new Set<string>();
		rawValue.split(/[,\s]+/).forEach((tag) => {
			const normalized = normalizeGuildGallerySingleTag(tag);
			if(normalized){
				uniqueTags.add(normalized);
			}
		});
		return Array.from(uniqueTags);
	};

	/**
	 * Utility function normalizeGuildGalleryTagsInputValue.
	 */
	const normalizeGuildGalleryTagsInputValue = (rawValue:string):string =>
		parseGuildGalleryTagsInput(rawValue).join(", ");

	/**
	 * Utility function normalizeGuildGalleryTagsInputValueOnType.
	 */
	const normalizeGuildGalleryTagsInputValueOnType = (rawValue:string):string => {
		const parsedTags = parseGuildGalleryTagsInput(rawValue);
		if(parsedTags.length === 0){
			return "";
		}
		const hasTrailingDelimiter = /[,\s]+$/.test(rawValue);
		return hasTrailingDelimiter ? `${parsedTags.join(", ")}, ` : parsedTags.join(", ");
	};

	/**
	 * Utility function removeGuildGalleryTagFromInput.
	 */
	const removeGuildGalleryTagFromInput = (rawValue:string, tagToRemove:string):string =>
		parseGuildGalleryTagsInput(rawValue)
			.filter((tag) => tag !== tagToRemove)
			.join(", ");

	/**
	 * Utility function normalizeGuildGalleryImageUrls.
	 */
	const normalizeGuildGalleryImageUrls = (rawImageUrls:string[] | null | undefined):string[] => {
		/**
		 * Utility function normalized.
		 */
		const normalized = (rawImageUrls ?? [])
			.map((url) => (url ?? "").trim())
			.filter((url) => url.length > 0);
		if(normalized.length === 0){
			return [];
		}
		return Array.from(new Set(normalized));
	};

	/**
	 * Utility function isEditableEventTarget.
	 */
	const isEditableEventTarget = (target:EventTarget | null):boolean => {
		const element = target as HTMLElement | null;
		if(!element){
			return false;
		}
		const tagName = element.tagName;
		if(tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT"){
			return true;
		}
		return element.isContentEditable;
	};

	const guildGalleryPrimaryTempImageUrl = guildGalleryTempImageUrls[0] ?? null;
	const guildGalleryCreateImageCount = guildGalleryTempImageUrls.length;
	const guildGalleryCreateImageCursor = guildGalleryCreateImageCount > 0
		? Math.max(0, Math.min(guildGalleryCreateImageIndex, guildGalleryCreateImageCount - 1))
		: 0;
	const guildGalleryCreateCurrentImageUrl = guildGalleryCreateImageCount > 0
		? guildGalleryTempImageUrls[guildGalleryCreateImageCursor]
		: null;
	const isAnyRankRefreshInProgress = refreshingMemberRanks || refreshingMemberIds.size > 0;
	const isLoggedIn = !!user;
	const currentUserId = user?.userId ?? user?.id ?? null;
	const dashboardCacheKey:GuildDashboardCacheKey = (user?.userId ?? user?.id) ?? "anon";
	const activeGuildSection = useMemo<GuildSection>(() => {
		if(forcedSection){
			return forcedSection;
		}
		const normalizedPath = location.pathname.replace(/\/+$/, "");
		if(
			normalizedPath === "/guild/gallery"
			|| normalizedPath.endsWith("/gallery")
			|| normalizedPath.includes("/gallery/")
		){
			return "gallery";
		}
		if(
			normalizedPath === "/guild/board"
			|| normalizedPath.endsWith("/board")
			|| normalizedPath === "/guild/board/write"
			|| normalizedPath.endsWith("/board/write")
		){
			return "board";
		}
		return "info";
	}, [forcedSection, location.pathname]);
	const isGuildBoardWriteMode = useMemo(() => {
		const normalizedPath = location.pathname.replace(/\/+$/, "");
		return normalizedPath === "/guild/board/write" || normalizedPath.endsWith("/board/write");
	}, [location.pathname]);
	
	/**
	 * Utility function loadDashboard.
	 */
	const loadDashboard = async(showLoading:boolean = false) => {
		if(showLoading){
			setLoading(true);
			if(
				guildDashboardCache
				&& guildDashboardCache.key === dashboardCacheKey
				&& (Date.now() - guildDashboardCache.cachedAt) < GUILD_DASHBOARD_CACHE_TTL_MS
			){
				setError(null);
				setDashboard(guildDashboardCache.value);
				setLoading(false);
				return;
			}
		}
		try{
			setError(null);
			const next = await guildService.getDashboard();
			setDashboard(next);
			guildDashboardCache = {
				key : dashboardCacheKey,
				value : next,
				cachedAt : Date.now()
			};
		}catch(err:any){
			if(
				showLoading
				&& guildDashboardCache
				&& guildDashboardCache.key === dashboardCacheKey
			){
				setError(null);
				setDashboard(guildDashboardCache.value);
			}else{
				setError(err?.message || "길드 데이터를 불러오지 못했습니다.");
			}
		}finally{
			setLoading(false);
		}
	};
	
	useEffect(() => {
		loadDashboard(true);
	}, [dashboardCacheKey]);
	
	useEffect(() => {
		if(!dashboard){
			return;
		}
		if(!joinGuildId && dashboard.approvedGuilds.length > 0){
			setJoinGuildId(String(dashboard.approvedGuilds[0].guildId));
		}
	}, [dashboard, joinGuildId]);
	
	useEffect(() => {
		if(!dashboard){
			return;
		}
		const next:Record<number, GuildRole> = {};
		for(const member of dashboard.guildMembers){
			next[member.id] = normalizeGuildRole(member.guildRole);
		}
		setRoleDrafts(next);
	}, [dashboard]);

	const preferredMyGuild = useMemo(() => {
		if(!dashboard){
			return null;
		}
		if(dashboard.myApprovedGuild){
			return dashboard.myApprovedGuild;
		}
		const ownedApprovedGuild = dashboard.ownedGuildRequests.find((guild) => guild.status === "APPROVED");
		if(ownedApprovedGuild){
			return ownedApprovedGuild;
		}
		const membershipGuildId = dashboard.myMembership?.guildId;
		if(membershipGuildId == null){
			return null;
		}
		return dashboard.approvedGuilds.find((guild) => guild.guildId === membershipGuildId) ?? null;
	}, [dashboard]);
	
	const visibleGuild = useMemo(() => {
		if(!dashboard){
			return null;
		}
		const approvedGuilds = dashboard.approvedGuilds;
		if(approvedGuilds.length === 0){
			return null;
		}
		if(guildSlugParam){
			return approvedGuilds.find((guild) => toGuildSlug(guild.guildName) === guildSlugParam) ?? null;
		}
		if(activeGuildSection !== "info"){
			const myApprovedGuildId = preferredMyGuild?.guildId;
			if(myApprovedGuildId != null){
				const myGuild = approvedGuilds.find((guild) => guild.guildId === myApprovedGuildId);
				if(myGuild){
					return myGuild;
				}
			}
			return approvedGuilds[0] ?? null;
		}
		return null;
	}, [dashboard, guildSlugParam, activeGuildSection, preferredMyGuild?.guildId]);
	
	const buildGuildPath = useCallback((guildSlug?:string | null, section:GuildSection = activeGuildSection):string => {
		const resolvedSection:GuildSection = section === "gallery" || section === "board" ? section : "info";
		if(guildSlug){
			if(resolvedSection === "info"){
				return `/guild/${guildSlug}`;
			}
			return `/guild/${guildSlug}/${resolvedSection}`;
		}
		if(resolvedSection === "info"){
			return "/guild";
		}
		return `/guild/${resolvedSection}`;
	}, [activeGuildSection]);
	const buildGuildBoardWritePath = useCallback((guildSlug?:string | null):string => {
		return `${buildGuildPath(guildSlug, "board")}/write`;
	}, [buildGuildPath]);
	const buildGuildGalleryDetailPath = useCallback((guildSlug:string | null | undefined, title:string):string => {
		const basePath = buildGuildPath(guildSlug, "gallery");
		const titleSlug = toGalleryTitleSlug(title);
		if(!titleSlug){
			return basePath;
		}
		return `${basePath}/${encodeURIComponent(titleSlug)}`;
	}, [buildGuildPath]);
	
	const isVisibleGuildMyApprovedGuild = useMemo(() => {
		if(!preferredMyGuild || !visibleGuild){
			return false;
		}
		return preferredMyGuild.guildId === visibleGuild.guildId;
	}, [preferredMyGuild, visibleGuild]);
	
	const filteredApprovedGuilds = useMemo(() => {
		if(!dashboard){
			return [];
		}
		const keyword = guildSearchKeyword.trim().toLowerCase();
		if(!keyword){
			return dashboard.approvedGuilds;
		}
		
		return dashboard.approvedGuilds.filter((guild) => {
			const guildName = guild.guildName?.toLowerCase() ?? "";
			const serverName = getGuildServerName(guild.serverId).toLowerCase();
			const ownerName = guild.ownerNickname?.toLowerCase() ?? "";
			const masterName = guild.masterMemberName?.toLowerCase() ?? "";
			const description = guild.description?.toLowerCase() ?? "";
			return guildName.includes(keyword)
				|| serverName.includes(keyword)
				|| ownerName.includes(keyword)
				|| masterName.includes(keyword)
				|| description.includes(keyword);
		});
	}, [dashboard, guildSearchKeyword]);
	
	const canRegisterGuild = useMemo(() => {
		if(!dashboard || !isLoggedIn){
			return false;
		}
		if(preferredMyGuild){
			return false;
		}
		return !dashboard.ownedGuildRequests.some((g) => g.status === "PENDING" || g.status === "APPROVED");
	}, [dashboard, isLoggedIn, preferredMyGuild]);
	
	const canRequestJoin = useMemo(() => {
		if(!dashboard || !isLoggedIn){
			return false;
		}
		if(preferredMyGuild){
			return false;
		}
		return dashboard.approvedGuilds.length > 0;
	}, [dashboard, isLoggedIn, preferredMyGuild]);
	
	const shouldShowOwnedGuildRequests = useMemo(() => {
		if(!dashboard || !isLoggedIn){
			return false;
		}
		if(preferredMyGuild){
			return false;
		}
		return !dashboard.ownedGuildRequests.some((guild) => guild.status === "APPROVED");
	}, [dashboard, isLoggedIn, preferredMyGuild]);
	
	const guildMasterNames = useMemo(() => {
		if(!dashboard){
			return [];
		}
		if(isVisibleGuildMyApprovedGuild){
			const names = dashboard.guildMembers.filter((member) =>
				normalizeGuildRole(member.guildRole) === 2
				&& !!member.memberName?.trim()
			).map((member) => member.memberName.trim());
			const uniqueNames = Array.from(new Set(names));
			if(uniqueNames.length > 0){
				return uniqueNames;
			}
		}
		const masterMemberName = visibleGuild?.masterMemberName?.trim();
		if(masterMemberName){
			return [masterMemberName];
		}
		return [];
	}, [dashboard, isVisibleGuildMyApprovedGuild, visibleGuild]);
	
	const canRefreshMemberRanks = useMemo(() => !!dashboard?.myMembership, [dashboard]);
	const canRefreshAllMemberRanks = useMemo(() => {
		if(!dashboard?.myMembership){
			return false;
		}
		return normalizeGuildRole(dashboard.myMembership.guildRole) >= 1;
	}, [dashboard]);
	const canEditVisibleGuildLevel = useMemo(() => {
		if(!dashboard?.myMembership || !isVisibleGuildMyApprovedGuild){
			return false;
		}
		if(dashboard.myMembership.memberStatus !== "APPROVED"){
			return false;
		}
		return normalizeGuildRole(dashboard.myMembership.guildRole) >= 1;
	}, [dashboard?.myMembership, isVisibleGuildMyApprovedGuild]);
	const canUploadVisibleGuildContent = useMemo(() => {
		if(!dashboard?.myMembership || !visibleGuild){
			return false;
		}
		if(dashboard.myMembership.memberStatus !== "APPROVED"){
			return false;
		}
		return dashboard.myMembership.guildId === visibleGuild.guildId;
	}, [dashboard?.myMembership, visibleGuild]);
	const canManageVisibleGuildContent = useMemo(() => {
		if(!visibleGuild){
			return false;
		}
		return !!dashboard?.canManageMembers && isVisibleGuildMyApprovedGuild;
	}, [dashboard?.canManageMembers, isVisibleGuildMyApprovedGuild, visibleGuild]);
	const isInfoSection = activeGuildSection === "info";
	const canUseMemberViewerMode = !!dashboard?.canManageMembers && canRefreshAllMemberRanks;
	const isMemberViewerMode = canUseMemberViewerMode && memberViewerMode;
	const canManageMembersInCurrentView = !!dashboard?.canManageMembers && !isMemberViewerMode;
	const showRefreshOnlyActionColumn = canRefreshMemberRanks && !canManageMembersInCurrentView;
	const showActionColumn = canManageMembersInCurrentView || showRefreshOnlyActionColumn;
	
	useEffect(() => {
		if(!canUseMemberViewerMode){
			setMemberViewerMode(false);
		}
	}, [canUseMemberViewerMode]);
	
	useEffect(() => {
		setGuildMemberKeyword("");
	}, [dashboard?.myApprovedGuild?.guildId]);
	
	useEffect(() => {
		if(!isGuildBoardWriteMode){
			setShowGuildBoardComposerPreview(false);
			setShowGuildBoardReferencePanel(false);
		}
	}, [isGuildBoardWriteMode]);
	
	useEffect(() => {
		if(!dashboard || !canRefreshMemberRanks){
			setRefreshStatus(null);
			setRefreshingMemberRanks(false);
			pendingDashboardReloadAfterRankRefreshRef.current = false;
			reloadingDashboardAfterRankRefreshRef.current = false;
			return;
		}
		
		let cancelled = false;
		let timer:number | null = null;
		/**
		 * Utility function syncRefreshStatus.
		 */
		const syncRefreshStatus = async():Promise<boolean> => {
			try{
				const status = await guildService.getRefreshMemberRanksStatus();
				if(cancelled){
					return false;
				}
				setRefreshStatus(status);
				setRefreshingMemberRanks(!!status.refreshing);
				if(!status.refreshing && pendingDashboardReloadAfterRankRefreshRef.current && !reloadingDashboardAfterRankRefreshRef.current){
					reloadingDashboardAfterRankRefreshRef.current = true;
					void loadDashboard().finally(() => {
						pendingDashboardReloadAfterRankRefreshRef.current = false;
						reloadingDashboardAfterRankRefreshRef.current = false;
					});
				}
				return !!status.refreshing;
			}catch{
				if(cancelled){
					return false;
				}
				return false;
			}
		};
		
		const initialKeepPolling = refreshingMemberRanks || !!refreshStatus?.refreshing;
		/**
		 * Utility function poll.
		 */
		const poll = async(forceRepeat:boolean) => {
			const running = await syncRefreshStatus();
			if(cancelled){
				return;
			}
			if(forceRepeat || running){
				timer = window.setTimeout(() => {
					void poll(true);
				}, 4000);
			}
		};
		
		void poll(initialKeepPolling);
		return () => {
			cancelled = true;
			if(timer != null){
				window.clearTimeout(timer);
			}
		};
	}, [dashboard?.myApprovedGuild?.guildId, canRefreshMemberRanks, refreshingMemberRanks, refreshStatus?.refreshing]);
	
	useEffect(() => {
		if(!preferredMyGuild){
			return;
		}
		const myGuildName = preferredMyGuild.guildName?.trim();
		if(!myGuildName){
			return;
		}
		const expectedSlug = toGuildSlug(myGuildName);
		const expectedPath = isGuildBoardWriteMode
			? buildGuildBoardWritePath(expectedSlug)
			: activeGuildSection === "gallery" && isGuildGalleryDetailRoute
				? `${buildGuildPath(expectedSlug, "gallery")}/${encodeURIComponent(decodedGalleryTitleSlug)}`
				: buildGuildPath(expectedSlug, activeGuildSection);
		const normalizedCurrentPath = location.pathname.replace(/\/+$/, "");
		const normalizedExpectedPath = expectedPath.replace(/\/+$/, "");
		if(normalizedCurrentPath !== normalizedExpectedPath){
			navigate(expectedPath, {replace : true});
		}
	}, [
		preferredMyGuild?.guildId,
		preferredMyGuild?.guildName,
		activeGuildSection,
		decodedGalleryTitleSlug,
		buildGuildBoardWritePath,
		buildGuildPath,
		isGuildGalleryDetailRoute,
		isGuildBoardWriteMode,
		location.pathname,
		navigate
	]);
	
	useEffect(() => {
		setGuildDescriptionDraft(dashboard?.myApprovedGuild?.description?.trim() ?? "");
		setEditingGuildDescription(false);
	}, [dashboard?.myApprovedGuild?.guildId, dashboard?.myApprovedGuild?.description]);
	
	useEffect(() => {
		if(!visibleGuild){
			setGuildLevelDraft("");
			setEditingGuildLevel(false);
			return;
		}
		setGuildLevelDraft(visibleGuild.level != null ? String(visibleGuild.level) : "");
		setEditingGuildLevel(false);
	}, [visibleGuild?.guildId, visibleGuild?.level]);
	
	useEffect(() => {
		if(activeGuildSection !== "gallery" && !isInfoSection){
			return;
		}
		if(!visibleGuild){
			setGuildGalleryImages([]);
			setGuildGalleryError(null);
			setLoadingGuildGallery(false);
			return;
		}
		let cancelled = false;
		/**
		 * Utility function loadGuildGallery.
		 */
		const loadGuildGallery = async() => {
			setLoadingGuildGallery(true);
			setGuildGalleryError(null);
			try{
				const images = await guildService.getGuildGallery(
					visibleGuild.guildId,
					isInfoSection ? {limit : GUILD_PREVIEW_GALLERY_LIMIT} : undefined
				);
				if(cancelled){
					return;
				}
				setGuildGalleryImages(images);
			}catch(err:any){
				if(cancelled){
					return;
				}
				setGuildGalleryImages([]);
				setGuildGalleryError(err?.message || "길드 갤러리를 불러오지 못했습니다.");
			}finally{
				if(!cancelled){
					setLoadingGuildGallery(false);
				}
			}
		};
		void loadGuildGallery();
		return () => {
			cancelled = true;
		};
	}, [activeGuildSection, isInfoSection, visibleGuild?.guildId]);

	useEffect(() => {
		if(activeGuildSection !== "gallery" || !isGuildGalleryDetailRoute){
			return;
		}
		if(guildGalleryImages.length === 0){
			return;
		}
		const targetById = guildGalleryRouteImageId != null
			? guildGalleryImages.find((image) => image.id === guildGalleryRouteImageId) ?? null
			: null;
		const targetBySlug = guildGalleryImages.find((image) => getGuildGalleryRouteSlug(image) === decodedGalleryTitleSlug) ?? null;
		const target = targetById ?? targetBySlug;
		if(!target){
			return;
		}
		if(selectedGuildGalleryImage?.id === target.id){
			return;
		}
		openGuildGalleryViewerState(target);
	}, [
		activeGuildSection,
		decodedGalleryTitleSlug,
		guildGalleryImages,
		guildGalleryRouteImageId,
		isGuildGalleryDetailRoute,
		selectedGuildGalleryImage?.id
	]);
	
	useEffect(() => {
		if(activeGuildSection !== "board" && !isInfoSection){
			return;
		}
		if(!visibleGuild){
			setGuildBoardPosts([]);
			setGuildBoardError(null);
			setLoadingGuildBoardPosts(false);
			return;
		}
		let cancelled = false;
		/**
		 * Utility function loadGuildBoardPosts.
		 */
		const loadGuildBoardPosts = async() => {
			setLoadingGuildBoardPosts(true);
			setGuildBoardError(null);
			try{
				const posts = await guildService.getGuildBoardPosts(
					visibleGuild.guildId,
					isInfoSection ? {limit : GUILD_PREVIEW_BOARD_LIMIT} : undefined
				);
				if(cancelled){
					return;
				}
				setGuildBoardPosts(posts);
			}catch(err:any){
				if(cancelled){
					return;
				}
				setGuildBoardPosts([]);
				setGuildBoardError(err?.message || "길드 게시판 글을 불러오지 못했습니다.");
			}finally{
				if(!cancelled){
					setLoadingGuildBoardPosts(false);
				}
			}
		};
		void loadGuildBoardPosts();
		return () => {
			cancelled = true;
		};
	}, [activeGuildSection, isInfoSection, visibleGuild?.guildId]);
	
	useEffect(() => {
		if(activeGuildSection !== "board"){
			return;
		}
		if(!visibleGuild){
			setGuildBoardCategories([]);
			setSelectedGuildBoardCategoryId("");
			setGuildBoardCategoryError(null);
			setLoadingGuildBoardCategories(false);
			return;
		}
		let cancelled = false;
		/**
		 * Utility function loadGuildBoardCategories.
		 */
		const loadGuildBoardCategories = async() => {
			setLoadingGuildBoardCategories(true);
			setGuildBoardCategoryError(null);
			try{
				const categories = await guildService.getGuildBoardCategories(visibleGuild.guildId);
				if(cancelled){
					return;
				}
				setGuildBoardCategories(categories);
				setSelectedGuildBoardCategoryId((prev) => {
					if(!prev){
						return "";
					}
					const exists = categories.some((category) => String(category.id) === prev);
					return exists ? prev : "";
				});
			}catch(err:any){
				if(cancelled){
					return;
				}
				setGuildBoardCategories([]);
				setGuildBoardCategoryError(err?.message || "길드 게시판 카테고리를 불러오지 못했습니다.");
			}finally{
				if(!cancelled){
					setLoadingGuildBoardCategories(false);
				}
			}
		};
		void loadGuildBoardCategories();
		return () => {
			cancelled = true;
		};
	}, [activeGuildSection, visibleGuild?.guildId]);
	
	useEffect(() => {
		setSelectedGuildBoardFilterCategoryId("all");
		setGuildBoardSearchInput("");
		setGuildBoardKeyword("");
		setShowGuildBoardCategoryManager(false);
		setShowGuildBoardReferencePanel(false);
		setGuildBoardReferenceKeyword("");
		setGuildBoardReferenceError(null);
		setGuildBoardItemReferenceResults([]);
		setGuildBoardBarterReferenceResults([]);
		setGuildBoardCraftReferenceResults([]);
		setSelectedGuildGalleryImage(null);
		setLikingGuildGalleryImageIds(new Set());
		setGuildGalleryViewMode("portfolio");
	}, [visibleGuild?.guildId]);
	
	/**
	 * Utility function withPending.
	 */
	const withPending = async(id:number, action:() => Promise<void>) => {
		setPendingIds((prev) => new Set(prev).add(id));
		try{
			await action();
		}finally{
			setPendingIds((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}
	};
	
	/**
	 * Utility function handleRegister.
	 */
	const handleRegister = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!registerName.trim()){
			setError("길드명을 입력해 주세요.");
			return;
		}
		if(!registerServerId){
			setError("서버를 선택해 주세요.");
			return;
		}
		setSubmitting(true);
		try{
			const parsedServerId = Number(registerServerId);
			if(!Number.isFinite(parsedServerId) || parsedServerId < 1 || parsedServerId > 7){
				throw new Error("유효한 서버를 선택해 주세요.");
			}
			await guildService.registerGuild(registerName.trim(), parsedServerId, registerDescription.trim() || undefined);
			setRegisterName("");
			setRegisterServerId("");
			setRegisterDescription("");
			await loadDashboard();
		}catch(err:any){
			setError(err?.message || "길드 등록에 실패했습니다.");
		}finally{
			setSubmitting(false);
		}
	};
	
	/**
	 * Utility function handleJoinRequest.
	 */
	const handleJoinRequest = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!joinGuildId){
			setError("가입할 길드를 선택해 주세요.");
			return;
		}
		if(!joinMemberName.trim()){
			setError("캐릭터명을 입력해 주세요.");
			return;
		}
		setSubmitting(true);
		try{
			await guildService.requestJoinGuild(Number(joinGuildId), joinMemberName.trim());
			setJoinMemberName("");
			await loadDashboard();
		}catch(err:any){
			setError(err?.message || "길드 가입 요청에 실패했습니다.");
		}finally{
			setSubmitting(false);
		}
	};
	
	/**
	 * Utility function handleApproveMember.
	 */
	const handleApproveMember = async(member:GuildMember) => {
		await withPending(member.id, async() => {
			try{
				await guildService.approveMember(member.id);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드원 승인에 실패했습니다.");
			}
		});
	};
	
	/**
	 * Utility function handleRejectMember.
	 */
	const handleRejectMember = async(member:GuildMember) => {
		await withPending(member.id, async() => {
			try{
				await guildService.rejectMember(member.id);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드원 반려에 실패했습니다.");
			}
		});
	};
	
	/**
	 * Utility function handleRoleUpdate.
	 */
	const handleRoleUpdate = async(member:GuildMember) => {
		const nextRole = normalizeGuildRole(roleDrafts[member.id] ?? member.guildRole);
		await withPending(member.id, async() => {
			try{
				await guildService.updateMemberRole(member.id, nextRole);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드 역할 변경에 실패했습니다.");
			}
		});
	};
	
	/**
	 * Utility function handleCreateMember.
	 */
	const handleCreateMember = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!manualMemberName.trim()){
			setError("추가할 길드원 캐릭터명을 입력해 주세요.");
			return;
		}
		
		setSubmitting(true);
		try{
			await guildService.createMember(manualMemberName.trim());
			setManualMemberName("");
			await loadDashboard();
		}catch(err:any){
			setError(err?.message || "길드원 정보 추가에 실패했습니다.");
		}finally{
			setSubmitting(false);
		}
	};
	
	/**
	 * Utility function handleUpdateGuildDescription.
	 */
	const handleUpdateGuildDescription = async() => {
		if(!dashboard?.canManageMembers){
			return;
		}
		const normalizedDescription = guildDescriptionDraft.trim();
		if(normalizedDescription.length > 500){
			setError("길드 소개는 500자 이하로 입력해 주세요.");
			return;
		}
		setUpdatingGuildDescription(true);
		try{
			setError(null);
			await guildService.updateGuildDescription(normalizedDescription || undefined);
			await loadDashboard();
			setEditingGuildDescription(false);
		}catch(err:any){
			setError(err?.message || "길드 소개 수정에 실패했습니다.");
		}finally{
			setUpdatingGuildDescription(false);
		}
	};
	
	/**
	 * Utility function handleStartGuildDescriptionEdit.
	 */
	const handleStartGuildDescriptionEdit = () => {
		if(!dashboard?.canManageMembers){
			return;
		}
		setGuildDescriptionDraft(dashboard.myApprovedGuild?.description?.trim() ?? "");
		setEditingGuildDescription(true);
	};
	
	/**
	 * Utility function handleCancelGuildDescriptionEdit.
	 */
	const handleCancelGuildDescriptionEdit = () => {
		setGuildDescriptionDraft(dashboard?.myApprovedGuild?.description?.trim() ?? "");
		setEditingGuildDescription(false);
	};
	
	/**
	 * Utility function handleUpdateGuildLevel.
	 */
	const handleUpdateGuildLevel = async() => {
		if(!canEditVisibleGuildLevel || !visibleGuild){
			return;
		}
		const normalizedLevel = guildLevelDraft.trim();
		if(!normalizedLevel){
			setError("길드 레벨을 입력해 주세요.");
			return;
		}
		const parsedLevel = Number.parseInt(normalizedLevel, 10);
		if(!Number.isFinite(parsedLevel) || parsedLevel < 0 || parsedLevel > 999){
			setError("길드 레벨은 0~999 범위의 숫자여야 합니다.");
			return;
		}
		
		setUpdatingGuildLevel(true);
		try{
			setError(null);
			await guildService.updateGuildLevel(visibleGuild.guildId, parsedLevel);
			await loadDashboard();
			setEditingGuildLevel(false);
		}catch(err:any){
			setError(err?.message || "길드 레벨 수정에 실패했습니다.");
		}finally{
			setUpdatingGuildLevel(false);
		}
	};
	
	/**
	 * Utility function handleToggleGuildLevelEdit.
	 */
	const handleToggleGuildLevelEdit = () => {
		if(!canEditVisibleGuildLevel || !visibleGuild){
			return;
		}
		setGuildLevelDraft(visibleGuild.level != null ? String(visibleGuild.level) : "");
		setEditingGuildLevel((prev) => !prev);
	};
	
	/**
	 * Utility function handleCancelGuildLevelEdit.
	 */
	const handleCancelGuildLevelEdit = () => {
		setGuildLevelDraft(visibleGuild?.level != null ? String(visibleGuild.level) : "");
		setEditingGuildLevel(false);
	};
	
	/**
	 * Utility function handleUpdateMemberInfo.
	 */
	const handleUpdateMemberInfo = async(member:GuildMember) => {
		const nextNameRaw = window.prompt("변경할 캐릭터명", member.memberName);
		if(nextNameRaw === null){
			return;
		}
		const nextName = nextNameRaw.trim();
		if(!nextName){
			setError("캐릭터명은 비울 수 없습니다.");
			return;
		}
		
		await withPending(member.id, async() => {
			try{
				await guildService.updateMemberInfo(member.id, nextName);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드원 정보 수정에 실패했습니다.");
			}
		});
	};
	
	/**
	 * Utility function handleDeleteMember.
	 */
	const handleDeleteMember = async(member:GuildMember) => {
		if(!window.confirm(`\`${member.memberName}\` 길드원 정보를 삭제할까요?`)){
			return;
		}
		await withPending(member.id, async() => {
			try{
				await guildService.deleteMember(member.id);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드원 정보 삭제에 실패했습니다.");
			}
		});
	};
	
	/**
	 * Utility function buildRefreshTarget.
	 */
	const buildRefreshTarget = (member:GuildMember):GuildMemberRankRefreshTarget | null => {
		if(!dashboard){
			return null;
		}
		const memberName = member.memberName?.trim() ?? "";
		const resolvedServerId = member.serverId ?? dashboard.myApprovedGuild?.serverId ?? null;
		if(!memberName || resolvedServerId == null || resolvedServerId < 1 || resolvedServerId > 7){
			return null;
		}
		return {
			memberName,
			serverId : resolvedServerId
		};
	};
	
	/**
	 * Utility function handleRefreshSingleMemberRank.
	 */
	const handleRefreshSingleMemberRank = async(member:GuildMember) => {
		if(!canRefreshMemberRanks){
			setError("길드원 정보 갱신 권한이 없습니다.");
			return;
		}
		if(!canRefreshAllMemberRanks && !isMyGuildMember(member)){
			setError("길드원은 본인 정보만 갱신할 수 있습니다.");
			return;
		}
		const target = buildRefreshTarget(member);
		if(!target){
			setError("갱신 가능한 길드원 데이터가 없습니다.");
			return;
		}
		
		setRefreshingMemberIds((prev) => {
			const next = new Set(prev);
			next.add(member.id);
			return next;
		});
		try{
			setError(null);
			await guildService.refreshMemberRanks([target]);
			const status = await guildService.getRefreshMemberRanksStatus().catch(() => null);
			if(status){
				setRefreshStatus(status);
				setRefreshingMemberRanks(!!status.refreshing);
				pendingDashboardReloadAfterRankRefreshRef.current = !!status.refreshing;
			}
			if(!status?.refreshing){
				pendingDashboardReloadAfterRankRefreshRef.current = false;
				await loadDashboard();
			}
		}catch(err:any){
			pendingDashboardReloadAfterRankRefreshRef.current = false;
			setError(err?.message || "길드원 정보 개별 갱신에 실패했습니다.");
		}finally{
			setRefreshingMemberIds((prev) => {
				const next = new Set(prev);
				next.delete(member.id);
				return next;
			});
		}
	};
	
	/**
	 * Utility function handleRefreshMemberRanks.
	 */
	const handleRefreshMemberRanks = async() => {
		if(!canRefreshAllMemberRanks){
			setError("길드원 전체 갱신 권한이 없습니다.");
			return;
		}
		if(!dashboard){
			return;
		}
		const fallbackServerId = dashboard.myApprovedGuild?.serverId ?? null;
		const targets:GuildMemberRankRefreshTarget[] = dashboard.guildMembers.map((member) => {
			const memberName = member.memberName?.trim() ?? "";
			const resolvedServerId = member.serverId ?? fallbackServerId;
			return {
				memberName,
				serverId : resolvedServerId as number
			};
		}).filter((target) =>
			!!target.memberName
			&& Number.isFinite(target.serverId)
			&& target.serverId >= 1
			&& target.serverId <= 7
		);
		
		if(targets.length === 0){
			setError("갱신 가능한 길드원 데이터가 없습니다.");
			return;
		}
		
		setRefreshingMemberRanks(true);
		try{
			setError(null);
			const summary = await guildService.refreshMemberRanks(targets);
			const status = await guildService.getRefreshMemberRanksStatus().catch(() => null);
			if(status){
				setRefreshStatus(status);
				setRefreshingMemberRanks(!!status.refreshing);
				pendingDashboardReloadAfterRankRefreshRef.current = !!status.refreshing;
			}
			if(summary.requestedCount === 0){
				setError("갱신 가능한 길드원 데이터가 없습니다.");
			}
			if(!status?.refreshing){
				pendingDashboardReloadAfterRankRefreshRef.current = false;
				await loadDashboard();
			}
			if(summary.failedCount > 0){
				setError(`길드원 정보 갱신 중 일부 실패했습니다. (${summary.failedCount}/${summary.requestedCount})`);
			}
		}catch(err:any){
			pendingDashboardReloadAfterRankRefreshRef.current = false;
			setError(err?.message || "길드원 정보 갱신에 실패했습니다.");
		}
	};
	
	/**
	 * Utility function handleApproveGuild.
	 */
	const handleApproveGuild = async(guildId:number) => {
		await withPending(guildId, async() => {
			try{
				await guildService.approveGuild(guildId);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드 승인에 실패했습니다.");
			}
		});
	};
	
	/**
	 * Utility function handleRejectGuild.
	 */
	const handleRejectGuild = async(guildId:number) => {
		await withPending(guildId, async() => {
			try{
				await guildService.rejectGuild(guildId);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드 반려에 실패했습니다.");
			}
		});
	};
	
	/**
	 * Utility function handleOpenGuildSectionDetail.
	 */
	const handleOpenGuildSectionDetail = (section:Extract<GuildSection, "gallery" | "board">) => {
		const guildSlug = visibleGuild ? toGuildSlug(visibleGuild.guildName) : null;
		navigate(buildGuildPath(guildSlug, section));
	};

	/**
	 * Utility function openGuildGalleryViewerState.
	 */
	const openGuildGalleryViewerState = (image:GuildGalleryImage) => {
		guildGalleryViewerImageMoveRequestRef.current += 1;
		setSelectedGuildGalleryImage(image);
		setEditingGuildGalleryImage(false);
		setUpdatingGuildGalleryImage(false);
		setGuildGalleryEditTitleDraft(image.title?.trim() || "");
		setGuildGalleryEditDescriptionDraft(image.description?.trim() || "");
		setGuildGalleryEditTagsDraft((image.tags ?? []).join(", "));
		setGuildGalleryEditImageUrlsDraft(getGuildGalleryImageUrls(image));
		setSelectedGuildGalleryImageIndex(0);
		setSelectedGuildGalleryImageLoading(false);
		setGuildGalleryZoomImageUrl(null);
	};

	/**
	 * Utility function closeGuildGalleryViewerState.
	 */
	const closeGuildGalleryViewerState = () => {
		guildGalleryViewerImageMoveRequestRef.current += 1;
		setSelectedGuildGalleryImage(null);
		setEditingGuildGalleryImage(false);
		setUpdatingGuildGalleryImage(false);
		setGuildGalleryEditTitleDraft("");
		setGuildGalleryEditDescriptionDraft("");
		setGuildGalleryEditTagsDraft("");
		setGuildGalleryEditImageUrlsDraft([]);
		setSelectedGuildGalleryImageIndex(0);
		setSelectedGuildGalleryImageLoading(false);
		setGuildGalleryZoomImageUrl(null);
	};

	/**
	 * Utility function getGuildGalleryDetailPath.
	 */
	const getGuildGalleryDetailPath = (image:GuildGalleryImage):string => {
		const guildSlug = visibleGuild ? toGuildSlug(visibleGuild.guildName) : (guildSlugParam ?? null);
		return buildGuildGalleryDetailPath(guildSlug, getGuildGalleryRouteTitle(image));
	};

	/**
	 * Utility function handleOpenGuildGalleryViewer.
	 */
	const handleOpenGuildGalleryViewer = (image:GuildGalleryImage) => {
		openGuildGalleryViewerState(image);
		navigate(getGuildGalleryDetailPath(image), {
			state : {
				openAsModal : true,
				modalRuntimeId : GUILD_GALLERY_MODAL_RUNTIME_ID,
				imageId : image.id
			} satisfies GuildGalleryRouteState
		});
	};

	/**
	 * Utility function handleGuildGalleryDetailLinkClick.
	 */
	const handleGuildGalleryDetailLinkClick = (event:React.MouseEvent<HTMLAnchorElement>, image:GuildGalleryImage) => {
		event.stopPropagation();
		if(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey){
			return;
		}
		event.preventDefault();
		handleOpenGuildGalleryViewer(image);
	};

	/**
	 * Utility function handleCloseGuildGalleryViewer.
	 */
	const handleCloseGuildGalleryViewer = () => {
		closeGuildGalleryViewerState();
		if(isGuildGalleryModalRoute){
			navigate(-1);
			return;
		}
		if(isGuildGalleryDetailRoute){
			const guildSlug = visibleGuild ? toGuildSlug(visibleGuild.guildName) : (guildSlugParam ?? null);
			navigate(buildGuildPath(guildSlug, "gallery"));
		}
	};

	/**
	 * Utility function handleOpenGuildGalleryImageZoom.
	 */
	const handleOpenGuildGalleryImageZoom = (imageUrl:string | null | undefined) => {
		if(!imageUrl){
			return;
		}
		setGuildGalleryZoomImageUrl(imageUrl);
	};

	/**
	 * Utility function handleCloseGuildGalleryImageZoom.
	 */
	const handleCloseGuildGalleryImageZoom = () => {
		setGuildGalleryZoomImageUrl(null);
	};
	
	/**
	 * Utility function handleOpenGuildGalleryUploader.
	 */
	const handleOpenGuildGalleryUploader = () => {
		if(!canUploadVisibleGuildContent){
			setGuildGalleryError("해당 길드 승인 길드원만 업로드할 수 있습니다.");
			return;
		}
		setGuildGalleryUploadAppendMode(false);
		galleryFileInputRef.current?.click();
	};

	/**
	 * Utility function handleAppendGuildGalleryImages.
	 */
	const handleAppendGuildGalleryImages = () => {
		if(!canUploadVisibleGuildContent){
			setGuildGalleryError("해당 길드 승인 길드원만 업로드할 수 있습니다.");
			return;
		}
		setGuildGalleryUploadAppendMode(true);
		galleryFileInputRef.current?.click();
	};

	/**
	 * Utility function handleGuildGalleryImageLoad.
	 */
	const handleGuildGalleryImageLoad = (event:React.SyntheticEvent<HTMLImageElement>) => {
		const image = event.currentTarget;
		const {naturalWidth, naturalHeight} = image;
		if(naturalWidth > naturalHeight){
			image.dataset.orientation = "landscape";
			return;
		}
		if(naturalWidth < naturalHeight){
			image.dataset.orientation = "portrait";
			return;
		}
		image.dataset.orientation = "square";
	};

	/**
	 * Utility function getGuildGalleryImageUrls.
	 */
	const getGuildGalleryImageUrls = (image:GuildGalleryImage):string[] => {
		return normalizeGuildGalleryImageUrls(image.imageUrls);
	};

	/**
	 * Utility function getGuildGalleryPrimaryImageUrl.
	 */
	const getGuildGalleryPrimaryImageUrl = (image:GuildGalleryImage):string =>
		getGuildGalleryImageUrls(image)[0] || "";

	/**
	 * Utility function getGuildGalleryRouteTitle.
	 */
	const getGuildGalleryRouteTitle = (image:GuildGalleryImage):string =>
		image.title?.trim() || `image-${image.id}`;

	/**
	 * Utility function getGuildGalleryRouteSlug.
	 */
	const getGuildGalleryRouteSlug = (image:GuildGalleryImage):string =>
		toGalleryTitleSlug(getGuildGalleryRouteTitle(image));

	const selectedGuildGalleryImageUrls = selectedGuildGalleryImage
		? getGuildGalleryImageUrls(selectedGuildGalleryImage)
		: [];
	const selectedGuildGalleryImageCount = selectedGuildGalleryImageUrls.length;
	const selectedGuildGalleryImageCursor = selectedGuildGalleryImageCount > 0
		? Math.max(0, Math.min(selectedGuildGalleryImageIndex, selectedGuildGalleryImageCount - 1))
		: 0;
	const selectedGuildGalleryCurrentImageUrl = selectedGuildGalleryImageCount > 0
		? selectedGuildGalleryImageUrls[selectedGuildGalleryImageCursor]
		: null;

	/**
	 * Utility function preloadImage.
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
	 * Utility function moveGuildGalleryViewerImageWithPreload.
	 */
	const moveGuildGalleryViewerImageWithPreload = async(nextIndex:number) => {
		if(selectedGuildGalleryImageCount <= 1){
			return;
		}
		const nextImageUrl = selectedGuildGalleryImageUrls[nextIndex];
		const requestId = guildGalleryViewerImageMoveRequestRef.current + 1;
		guildGalleryViewerImageMoveRequestRef.current = requestId;
		setSelectedGuildGalleryImageLoading(true);
		await preloadImage(nextImageUrl);
		if(guildGalleryViewerImageMoveRequestRef.current === requestId){
			setSelectedGuildGalleryImageIndex(nextIndex);
			setSelectedGuildGalleryImageLoading(false);
		}
	};

	const handleGuildGalleryViewerPrev = useCallback(() => {
		if(selectedGuildGalleryImageCount <= 1){
			return;
		}
		const nextIndex = selectedGuildGalleryImageCursor <= 0
			? selectedGuildGalleryImageCount - 1
			: selectedGuildGalleryImageCursor - 1;
		void moveGuildGalleryViewerImageWithPreload(nextIndex);
	}, [selectedGuildGalleryImageCount, selectedGuildGalleryImageCursor, selectedGuildGalleryImageUrls]);

	const handleGuildGalleryViewerNext = useCallback(() => {
		if(selectedGuildGalleryImageCount <= 1){
			return;
		}
		const nextIndex = selectedGuildGalleryImageCursor >= selectedGuildGalleryImageCount - 1
			? 0
			: selectedGuildGalleryImageCursor + 1;
		void moveGuildGalleryViewerImageWithPreload(nextIndex);
	}, [selectedGuildGalleryImageCount, selectedGuildGalleryImageCursor, selectedGuildGalleryImageUrls]);

	/**
	 * Utility function moveGuildGalleryCreateImageWithPreload.
	 */
	const moveGuildGalleryCreateImageWithPreload = async(nextIndex:number) => {
		if(guildGalleryCreateImageCount <= 1){
			return;
		}
		const nextImageUrl = guildGalleryTempImageUrls[nextIndex];
		const requestId = guildGalleryCreateImageMoveRequestRef.current + 1;
		guildGalleryCreateImageMoveRequestRef.current = requestId;
		setGuildGalleryCreateImageLoading(true);
		await preloadImage(nextImageUrl);
		if(guildGalleryCreateImageMoveRequestRef.current === requestId){
			setGuildGalleryCreateImageIndex(nextIndex);
			setGuildGalleryCreateImageLoading(false);
		}
	};

	/**
	 * Utility function handleGuildGalleryCreatePrevImage.
	 */
	const handleGuildGalleryCreatePrevImage = () => {
		if(guildGalleryCreateImageCount <= 1){
			return;
		}
		const nextIndex = guildGalleryCreateImageCursor <= 0
			? guildGalleryCreateImageCount - 1
			: guildGalleryCreateImageCursor - 1;
		void moveGuildGalleryCreateImageWithPreload(nextIndex);
	};

	/**
	 * Utility function handleGuildGalleryCreateNextImage.
	 */
	const handleGuildGalleryCreateNextImage = () => {
		if(guildGalleryCreateImageCount <= 1){
			return;
		}
		const nextIndex = guildGalleryCreateImageCursor >= guildGalleryCreateImageCount - 1
			? 0
			: guildGalleryCreateImageCursor + 1;
		void moveGuildGalleryCreateImageWithPreload(nextIndex);
	};

	/**
	 * Utility function handleSetGuildGalleryRepresentativeImage.
	 */
	const handleSetGuildGalleryRepresentativeImage = () => {
		if(guildGalleryCreateImageCount <= 1 || guildGalleryCreateImageCursor === 0){
			return;
		}
		guildGalleryCreateImageMoveRequestRef.current += 1;
		setGuildGalleryTempImageUrls((prev) => moveImageToFront(prev, guildGalleryCreateImageCursor));
		setGuildGalleryCreateImageIndex(0);
		setGuildGalleryCreateImageLoading(false);
	};

	/**
	 * Utility function handleUploadGuildGalleryImage.
	 */
	const handleUploadGuildGalleryImage = async(files:File[], options?:{append?:boolean}) => {
		if(!visibleGuild){
			return;
		}
		if(files.length === 0){
			return;
		}
		const append = options?.append === true;
		if(!canUploadVisibleGuildContent){
			setGuildGalleryError("해당 길드 승인 길드원만 업로드할 수 있습니다.");
			return;
		}
		setUploadingGuildGalleryImage(true);
		setGuildGalleryUploadProgress(0);
		setGuildGalleryError(null);
		try{
			const uploaded = await uploadService.uploadTempImages(files, "board", (progress) => {
				setGuildGalleryUploadProgress(progress);
			});
			if(!uploaded.success || !uploaded.urls || uploaded.urls.length === 0){
				throw new Error(uploaded.message || "이미지 업로드에 실패했습니다.");
			}
			if(append){
				setGuildGalleryTempImageUrls((prev) => Array.from(new Set([...prev, ...uploaded.urls!])));
			}else{
				guildGalleryCreateImageMoveRequestRef.current += 1;
				setGuildGalleryTempImageUrls(uploaded.urls);
				setGuildGalleryCreateImageIndex(0);
				setGuildGalleryCreateImageLoading(false);
				const normalizedFileName = files[0]?.name?.replace(/\.[^.]+$/, "").trim() ?? "";
				setGuildGalleryTitleDraft(normalizedFileName ? normalizedFileName.slice(0, 200) : "");
				setGuildGalleryDescriptionDraft("");
				setGuildGalleryTagsDraft("");
			}
			setShowGuildGalleryCreateModal(true);
		}catch(err:any){
			setGuildGalleryError(err?.message || "길드 갤러리 업로드에 실패했습니다.");
		}finally{
			setUploadingGuildGalleryImage(false);
			setGuildGalleryUploadProgress(null);
		}
	};
	
	/**
	 * Utility function handleGuildGalleryFileChange.
	 */
	const handleGuildGalleryFileChange = async(e:React.ChangeEvent<HTMLInputElement>) => {
		const appendMode = guildGalleryUploadAppendMode;
		const files = Array.from(e.target.files ?? []);
		setGuildGalleryUploadAppendMode(false);
		if(files.length > 0){
			await handleUploadGuildGalleryImage(files, {append : appendMode});
		}
		e.target.value = "";
	};

	useEffect(() => {
		setGuildGalleryCreateImageIndex((prev) => {
			if(guildGalleryTempImageUrls.length === 0){
				return 0;
			}
			return Math.min(prev, guildGalleryTempImageUrls.length - 1);
		});
		setGuildGalleryCreateImageLoading(false);
	}, [guildGalleryTempImageUrls.length]);

	/**
	 * Utility function closeGuildGalleryCreateModal.
	 */
	const closeGuildGalleryCreateModal = () => {
		const tempUrls = guildGalleryTempImageUrls;
		guildGalleryCreateImageMoveRequestRef.current += 1;
		setShowGuildGalleryCreateModal(false);
		setGuildGalleryTempImageUrls([]);
		setGuildGalleryCreateImageIndex(0);
		setGuildGalleryCreateImageLoading(false);
		setGuildGalleryUploadAppendMode(false);
		setGuildGalleryTitleDraft("");
		setGuildGalleryDescriptionDraft("");
		setGuildGalleryTagsDraft("");
		tempUrls
			.filter((url) => url.startsWith("/api/files/_tmp-"))
			.forEach((url) => {
				void uploadService.deleteImage(url).catch(() => undefined);
			});
	};
	
	/**
	 * Utility function handleCreateGuildGalleryImage.
	 */
	const handleCreateGuildGalleryImage = async(e:React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if(!visibleGuild || guildGalleryTempImageUrls.length === 0){
			return;
		}
		const normalizedGuildGalleryTags = normalizeGuildGalleryTagsInputValue(guildGalleryTagsDraft);
		setCreatingGuildGalleryImage(true);
		setGuildGalleryError(null);
		try{
			const created = await guildService.createGuildGalleryImage(
				visibleGuild.guildId,
				guildGalleryTempImageUrls,
				guildGalleryTitleDraft.trim() || undefined,
				guildGalleryDescriptionDraft.trim() || undefined,
				normalizedGuildGalleryTags || undefined
			);
			setGuildGalleryImages((prev) => [created, ...prev]);
			setShowGuildGalleryCreateModal(false);
			setGuildGalleryTempImageUrls([]);
			setGuildGalleryCreateImageIndex(0);
			setGuildGalleryCreateImageLoading(false);
			setGuildGalleryUploadAppendMode(false);
			setGuildGalleryTitleDraft("");
			setGuildGalleryDescriptionDraft("");
			setGuildGalleryTagsDraft("");
		}catch(err:any){
			setGuildGalleryError(err?.message || "길드 갤러리 업로드에 실패했습니다.");
		}finally{
			setCreatingGuildGalleryImage(false);
		}
	};
	
	/**
	 * Utility function handleGuildGalleryDropZoneDragOver.
	 */
	const handleGuildGalleryDropZoneDragOver = (e:React.DragEvent<HTMLButtonElement>) => {
		e.preventDefault();
		if(!canUploadVisibleGuildContent){
			return;
		}
		setIsGuildGalleryDragOver(true);
	};
	
	/**
	 * Utility function handleGuildGalleryDropZoneDragLeave.
	 */
	const handleGuildGalleryDropZoneDragLeave = () => {
		setIsGuildGalleryDragOver(false);
	};
	
	/**
	 * Utility function handleGuildGalleryDropZoneDrop.
	 */
	const handleGuildGalleryDropZoneDrop = async(e:React.DragEvent<HTMLButtonElement>) => {
		e.preventDefault();
		setIsGuildGalleryDragOver(false);
		if(!canUploadVisibleGuildContent){
			return;
		}
		const files = Array.from(e.dataTransfer.files ?? []);
		if(files.length > 0){
			await handleUploadGuildGalleryImage(files);
		}
	};

	/**
	 * Utility function canEditGuildGalleryImage.
	 */
	const canEditGuildGalleryImage = (image:GuildGalleryImage):boolean => {
		if(currentUserId == null){
			return false;
		}
		const authorUserId = image.userId ?? image.uploaderUserId;
		if(authorUserId != null && authorUserId === currentUserId){
			return true;
		}
		return canManageVisibleGuildContent;
	};
	
	/**
	 * Utility function canDeleteGuildGalleryImage.
	 */
	const canDeleteGuildGalleryImage = (image:GuildGalleryImage):boolean => {
		if(currentUserId == null){
			return false;
		}
		const authorUserId = image.userId ?? image.uploaderUserId;
		if(authorUserId != null && authorUserId === currentUserId){
			return true;
		}
		return canManageVisibleGuildContent;
	};

	/**
	 * Utility function handleStartEditGuildGalleryImage.
	 */
	const handleStartEditGuildGalleryImage = () => {
		if(!selectedGuildGalleryImage){
			return;
		}
		if(!canEditGuildGalleryImage(selectedGuildGalleryImage)){
			setGuildGalleryError("이미지 수정 권한이 없습니다.");
			return;
		}
		setGuildGalleryError(null);
		setEditingGuildGalleryImage(true);
		setGuildGalleryEditTitleDraft(selectedGuildGalleryImage.title?.trim() || "");
		setGuildGalleryEditDescriptionDraft(selectedGuildGalleryImage.description?.trim() || "");
		setGuildGalleryEditTagsDraft((selectedGuildGalleryImage.tags ?? []).join(", "));
		setGuildGalleryEditImageUrlsDraft(getGuildGalleryImageUrls(selectedGuildGalleryImage));
	};

	/**
	 * Utility function handleCancelEditGuildGalleryImage.
	 */
	const handleCancelEditGuildGalleryImage = () => {
		if(!selectedGuildGalleryImage){
			setEditingGuildGalleryImage(false);
			setGuildGalleryEditTitleDraft("");
			setGuildGalleryEditDescriptionDraft("");
			setGuildGalleryEditTagsDraft("");
			setGuildGalleryEditImageUrlsDraft([]);
			return;
		}
		setEditingGuildGalleryImage(false);
		setGuildGalleryEditTitleDraft(selectedGuildGalleryImage.title?.trim() || "");
		setGuildGalleryEditDescriptionDraft(selectedGuildGalleryImage.description?.trim() || "");
		setGuildGalleryEditTagsDraft((selectedGuildGalleryImage.tags ?? []).join(", "));
		setGuildGalleryEditImageUrlsDraft(getGuildGalleryImageUrls(selectedGuildGalleryImage));
	};

	/**
	 * Utility function handleRemoveGuildGalleryEditImage.
	 */
	const handleRemoveGuildGalleryEditImage = (index:number) => {
		setGuildGalleryEditImageUrlsDraft((prev) => prev.filter((_imageUrl, imageIndex) => imageIndex !== index));
	};

	/**
	 * Utility function handleUpdateGuildGalleryImage.
	 */
	const handleUpdateGuildGalleryImage = async(e:React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if(!visibleGuild || !selectedGuildGalleryImage){
			return;
		}
		if(!canEditGuildGalleryImage(selectedGuildGalleryImage)){
			setGuildGalleryError("이미지 수정 권한이 없습니다.");
			return;
		}
		const normalizedImageUrls = normalizeGuildGalleryImageUrls(guildGalleryEditImageUrlsDraft);
		if(normalizedImageUrls.length === 0){
			setGuildGalleryError("최소 1장의 이미지를 남겨 주세요.");
			return;
		}

		setUpdatingGuildGalleryImage(true);
		setGuildGalleryError(null);
		try{
			const normalizedTags = normalizeGuildGalleryTagsInputValue(guildGalleryEditTagsDraft);
			const updated = await guildService.updateGuildGalleryImage(
				visibleGuild.guildId,
				selectedGuildGalleryImage.id,
				normalizedImageUrls,
				guildGalleryEditTitleDraft.trim() || undefined,
				guildGalleryEditDescriptionDraft.trim() || undefined,
				normalizedTags || undefined
			);
			applyGuildGalleryImageUpdate(updated);
			setEditingGuildGalleryImage(false);
			setGuildGalleryEditTitleDraft(updated.title?.trim() || "");
			setGuildGalleryEditDescriptionDraft(updated.description?.trim() || "");
			setGuildGalleryEditTagsDraft((updated.tags ?? []).join(", "));
			setGuildGalleryEditImageUrlsDraft(getGuildGalleryImageUrls(updated));
		}catch(err:any){
			setGuildGalleryError(err?.message || "이미지 수정에 실패했습니다.");
		}finally{
			setUpdatingGuildGalleryImage(false);
		}
	};
	
	/**
	 * Utility function handleDeleteGuildGalleryImage.
	 */
	const handleDeleteGuildGalleryImage = async(image:GuildGalleryImage) => {
		if(!visibleGuild){
			return;
		}
		if(!canDeleteGuildGalleryImage(image)){
			setGuildGalleryError("이미지 삭제 권한이 없습니다.");
			return;
		}
		if(!window.confirm("이 이미지를 삭제할까요?")){
			return;
		}
		setDeletingGuildGalleryImageIds((prev) => new Set(prev).add(image.id));
		setGuildGalleryError(null);
		try{
			await guildService.deleteGuildGalleryImage(visibleGuild.guildId, image.id);
			setGuildGalleryImages((prev) => prev.filter((item) => item.id !== image.id));
			const deletingSelected = selectedGuildGalleryImage?.id === image.id;
			setSelectedGuildGalleryImage((prev) => (prev?.id === image.id ? null : prev));
			if(deletingSelected && isGuildGalleryDetailRoute){
				const guildSlug = visibleGuild ? toGuildSlug(visibleGuild.guildName) : (guildSlugParam ?? null);
				navigate(buildGuildPath(guildSlug, "gallery"));
			}
		}catch(err:any){
			setGuildGalleryError(err?.message || "이미지 삭제에 실패했습니다.");
		}finally{
			setDeletingGuildGalleryImageIds((prev) => {
				const next = new Set(prev);
				next.delete(image.id);
				return next;
			});
		}
	};

	const applyGuildGalleryImageUpdate = useCallback((updated:GuildGalleryImage) => {
		setGuildGalleryImages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
		setSelectedGuildGalleryImage((prev) => (prev?.id === updated.id ? updated : prev));
	}, []);
	
	/**
	 * Utility function handleToggleGuildGalleryImageLike.
	 */
	const handleToggleGuildGalleryImageLike = async(image:GuildGalleryImage) => {
		if(!visibleGuild){
			return;
		}
		if(!canUploadVisibleGuildContent){
			setGuildGalleryError("해당 길드 승인 길드원만 좋아요를 누를 수 있습니다.");
			return;
		}
		if(likingGuildGalleryImageIds.has(image.id)){
			return;
		}
		setLikingGuildGalleryImageIds((prev) => new Set(prev).add(image.id));
		setGuildGalleryError(null);
		try{
			const updated = await guildService.toggleGuildGalleryImageLike(visibleGuild.guildId, image.id);
			applyGuildGalleryImageUpdate(updated);
		}catch(err:any){
			setGuildGalleryError(err?.message || "좋아요 처리에 실패했습니다.");
		}finally{
			setLikingGuildGalleryImageIds((prev) => {
				const next = new Set(prev);
				next.delete(image.id);
				return next;
			});
		}
	};

	/**
	 * Utility function handleGuildGalleryLikeClick.
	 */
	const handleGuildGalleryLikeClick = async(
		event:React.MouseEvent<HTMLButtonElement>,
		image:GuildGalleryImage
	) => {
		event.stopPropagation();
		await handleToggleGuildGalleryImageLike(image);
	};
	
	/**
	 * Utility function handleCreateGuildBoardCategory.
	 */
	const handleCreateGuildBoardCategory = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!visibleGuild){
			return;
		}
		if(!canManageVisibleGuildContent){
			setGuildBoardCategoryError("부마스터 이상만 카테고리를 설정할 수 있습니다.");
			return;
		}
		const categoryName = guildBoardCategoryNameDraft.trim();
		if(!categoryName){
			setGuildBoardCategoryError("카테고리명을 입력해 주세요.");
			return;
		}
		setCreatingGuildBoardCategory(true);
		setGuildBoardCategoryError(null);
		try{
			const created = await guildService.createGuildBoardCategory(visibleGuild.guildId, categoryName);
			setGuildBoardCategories((prev) => [...prev, created].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
			setGuildBoardCategoryNameDraft("");
		}catch(err:any){
			setGuildBoardCategoryError(err?.message || "카테고리 생성에 실패했습니다.");
		}finally{
			setCreatingGuildBoardCategory(false);
		}
	};
	
	/**
	 * Utility function handleDeleteGuildBoardCategory.
	 */
	const handleDeleteGuildBoardCategory = async(categoryId:number) => {
		if(!visibleGuild){
			return;
		}
		if(!canManageVisibleGuildContent){
			setGuildBoardCategoryError("부마스터 이상만 카테고리를 설정할 수 있습니다.");
			return;
		}
		if(!window.confirm("이 카테고리를 삭제할까요? 기존 글의 카테고리는 제거됩니다.")){
			return;
		}
		setDeletingGuildBoardCategoryIds((prev) => new Set(prev).add(categoryId));
		setGuildBoardCategoryError(null);
		try{
			await guildService.deleteGuildBoardCategory(visibleGuild.guildId, categoryId);
			setGuildBoardCategories((prev) => prev.filter((item) => item.id !== categoryId));
			setGuildBoardPosts((prev) =>
				prev.map((post) => (post.categoryId === categoryId ? {
					...post,
					categoryId : null,
					categoryName : null
				} : post))
			);
			setSelectedGuildBoardCategoryId((prev) => (prev === String(categoryId) ? "" : prev));
			setSelectedGuildBoardFilterCategoryId((prev) => (prev === String(categoryId) ? "all" : prev));
		}catch(err:any){
			setGuildBoardCategoryError(err?.message || "카테고리 삭제에 실패했습니다.");
		}finally{
			setDeletingGuildBoardCategoryIds((prev) => {
				const next = new Set(prev);
				next.delete(categoryId);
				return next;
			});
		}
	};
	
	const insertGuildBoardContentAtCursor = useCallback((insertText:string, ensureBlockSpacing:boolean = false) => {
		const normalizedInsertText = insertText.replace(/\r\n?/g, "\n");
		const textarea = guildBoardComposerTextareaRef.current;
		if(!textarea){
			setGuildBoardContentDraft((prev) => {
				if(!ensureBlockSpacing || !prev.trim()){
					return prev + normalizedInsertText;
				}
				const needsPrefixBreak = !prev.endsWith("\n\n");
				const suffix = prev.endsWith("\n") ? "\n" : "\n\n";
				return `${prev}${needsPrefixBreak ? suffix : ""}${normalizedInsertText}\n`;
			});
			return;
		}
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		let textToInsert = normalizedInsertText;
		if(ensureBlockSpacing){
			const prevChar = start > 0 ? guildBoardContentDraft[start - 1] : "";
			const prevPrevChar = start > 1 ? guildBoardContentDraft[start - 2] : "";
			const nextChar = end < guildBoardContentDraft.length ? guildBoardContentDraft[end] : "";
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
		const newContent = guildBoardContentDraft.substring(0, start) + textToInsert + guildBoardContentDraft.substring(end);
		setGuildBoardContentDraft(newContent);
		
		setTimeout(() => {
			textarea.focus();
			const newPos = start + textToInsert.length;
			textarea.setSelectionRange(newPos, newPos);
		}, 0);
	}, [guildBoardContentDraft]);
	
	const insertGuildBoardReferenceMarkdown = useCallback((markdown:string) => {
		insertGuildBoardContentAtCursor(markdown, true);
	}, [insertGuildBoardContentAtCursor]);
	
	const handleSearchGuildBoardReference = useCallback(async() => {
		const keyword = guildBoardReferenceKeyword.trim();
		if(!keyword){
			setGuildBoardReferenceError(null);
			setGuildBoardItemReferenceResults([]);
			setGuildBoardBarterReferenceResults([]);
			setGuildBoardCraftReferenceResults([]);
			return;
		}
		
		setGuildBoardReferenceLoading(true);
		setGuildBoardReferenceError(null);
		
		try{
			if(guildBoardReferenceTab === "item"){
				const response = await GameItemService.getGameItems({
					page : 0,
					size : MAX_GUILD_REFERENCE_RESULTS,
					sortBy : "itemRarity",
					sortDir : "desc",
					keyword
				});
				const deduped = Array.from(
					new Map(response.content.map((item) => [item.itemId, item])).values()
				).slice(0, MAX_GUILD_REFERENCE_RESULTS);
				setGuildBoardItemReferenceResults(deduped);
			}else if(guildBoardReferenceTab === "barter"){
				const response = await GameItemService.getBarters({
					page : 0,
					size : MAX_GUILD_REFERENCE_RESULTS,
					sortBy : "regionId",
					sortDir : "asc",
					keyword
				});
				const deduped = Array.from(
					new Map(response.content.map((barter) => [`${barter.barterId}-${barter.itemId}-${barter.exchangeId}`, barter])).values()
				).slice(0, MAX_GUILD_REFERENCE_RESULTS);
				setGuildBoardBarterReferenceResults(deduped);
			}else{
				const response = await GameItemService.getCrafts({
					page : 0,
					size : MAX_GUILD_REFERENCE_RESULTS,
					sortBy : "craftType",
					sortDir : "asc",
					keyword
				});
				const deduped = Array.from(
					new Map(response.content.map((craft) => [`${craft.craftId}-${craft.craftSubId}-${craft.itemId}`, craft])).values()
				).slice(0, MAX_GUILD_REFERENCE_RESULTS);
				setGuildBoardCraftReferenceResults(deduped);
			}
		}catch(error){
			console.error("길드 게시글 참조 검색 실패:", error);
			setGuildBoardReferenceError("참조 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
		}finally{
			setGuildBoardReferenceLoading(false);
		}
	}, [guildBoardReferenceKeyword, guildBoardReferenceTab]);
	
	/**
	 * Utility function handleGuildBoardReferenceKeywordKeyDown.
	 */
	const handleGuildBoardReferenceKeywordKeyDown = (e:React.KeyboardEvent<HTMLInputElement>) => {
		if(e.key === "Enter"){
			e.preventDefault();
			void handleSearchGuildBoardReference();
		}
	};
	
	/**
	 * Utility function handleCreateGuildBoardPost.
	 */
	const handleCreateGuildBoardPost = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!visibleGuild){
			return;
		}
		if(!canUploadVisibleGuildContent){
			setGuildBoardError("해당 길드 승인 길드원만 글을 작성할 수 있습니다.");
			return;
		}
		const title = guildBoardTitleDraft.trim();
		const content = guildBoardContentDraft.trim();
		if(!title){
			setGuildBoardError("제목을 입력해 주세요.");
			return;
		}
		if(!content){
			setGuildBoardError("내용을 입력해 주세요.");
			return;
		}
		setCreatingGuildBoardPost(true);
		setGuildBoardError(null);
		try{
			const selectedCategoryId = selectedGuildBoardCategoryId ? Number(selectedGuildBoardCategoryId) : undefined;
			const created = await guildService.createGuildBoardPost(
				visibleGuild.guildId,
				title,
				content,
				Number.isFinite(selectedCategoryId) ? selectedCategoryId : undefined
			);
			setGuildBoardPosts((prev) => [created, ...prev]);
			setGuildBoardTitleDraft("");
			setGuildBoardContentDraft("");
			setShowGuildBoardComposerPreview(false);
			setShowGuildBoardReferencePanel(false);
			navigate(buildGuildPath(toGuildSlug(visibleGuild.guildName), "board"));
		}catch(err:any){
			setGuildBoardError(err?.message || "길드 게시글 작성에 실패했습니다.");
		}finally{
			setCreatingGuildBoardPost(false);
		}
	};
	
	/**
	 * Utility function handleGuildBoardSearch.
	 */
	const handleGuildBoardSearch = (e:React.FormEvent) => {
		e.preventDefault();
		setGuildBoardKeyword(guildBoardSearchInput.trim());
	};
	
	useEffect(() => {
		if(showGuildBoardComposerPreview){
			setShowGuildBoardReferencePanel(false);
		}
	}, [showGuildBoardComposerPreview]);
	
	useEffect(() => {
		if(!showGuildBoardReferencePanel){
			return;
		}
		
		const keyword = guildBoardReferenceKeyword.trim();
		if(!keyword){
			setGuildBoardReferenceError(null);
			setGuildBoardItemReferenceResults([]);
			setGuildBoardBarterReferenceResults([]);
			setGuildBoardCraftReferenceResults([]);
			setGuildBoardReferenceLoading(false);
			return;
		}
		
		const timer = window.setTimeout(() => {
			void handleSearchGuildBoardReference();
		}, 300);
		return () => window.clearTimeout(timer);
	}, [guildBoardReferenceKeyword, guildBoardReferenceTab, showGuildBoardReferencePanel, handleSearchGuildBoardReference]);
	
	useEffect(() => {
		if(!showGuildBoardReferencePanel){
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
			if(guildBoardReferencePanelRef.current?.contains(target)){
				return;
			}
			if(guildBoardReferenceTriggerRef.current?.contains(target)){
				return;
			}
			setShowGuildBoardReferencePanel(false);
		};
		
		/**
		 * Utility function handleEsc.
		 */
		const handleEsc = (event:KeyboardEvent) => {
			if(event.key === "Escape"){
				setShowGuildBoardReferencePanel(false);
			}
		};
		
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleEsc);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleEsc);
		};
	}, [showGuildBoardReferencePanel]);
	
	useEffect(() => {
		if(!selectedGuildGalleryImage){
			return;
		}
		
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		
		/**
		 * Utility function handleEsc.
		 */
		const handleEsc = (event:KeyboardEvent) => {
			const typingTarget = isEditableEventTarget(event.target);
			if(typingTarget){
				return;
			}
			if(event.key === "Escape"){
				if(guildGalleryZoomImageUrl){
					setGuildGalleryZoomImageUrl(null);
					return;
				}
				handleCloseGuildGalleryViewer();
				return;
			}
			if(event.key === "ArrowLeft"){
				handleGuildGalleryViewerPrev();
				return;
			}
			if(event.key === "ArrowRight"){
				handleGuildGalleryViewerNext();
			}
		};
		document.addEventListener("keydown", handleEsc);
		return () => {
			document.removeEventListener("keydown", handleEsc);
			document.body.style.overflow = previousOverflow;
		};
	}, [selectedGuildGalleryImage, guildGalleryZoomImageUrl, handleGuildGalleryViewerNext, handleGuildGalleryViewerPrev]);
	
	/**
	 * Utility function canDeleteGuildBoardPost.
	 */
	const canDeleteGuildBoardPost = (post:GuildBoardPost):boolean => {
		if(currentUserId == null){
			return false;
		}
		if(post.authorUserId != null && post.authorUserId === currentUserId){
			return true;
		}
		return canManageVisibleGuildContent;
	};
	
	/**
	 * Utility function handleDeleteGuildBoardPost.
	 */
	const handleDeleteGuildBoardPost = async(post:GuildBoardPost) => {
		if(!visibleGuild){
			return;
		}
		if(!canDeleteGuildBoardPost(post)){
			setGuildBoardError("게시글 삭제 권한이 없습니다.");
			return;
		}
		if(!window.confirm("이 게시글을 삭제할까요?")){
			return;
		}
		setDeletingGuildBoardPostIds((prev) => new Set(prev).add(post.id));
		setGuildBoardError(null);
		try{
			await guildService.deleteGuildBoardPost(visibleGuild.guildId, post.id);
			setGuildBoardPosts((prev) => prev.filter((item) => item.id !== post.id));
		}catch(err:any){
			setGuildBoardError(err?.message || "게시글 삭제에 실패했습니다.");
		}finally{
			setDeletingGuildBoardPostIds((prev) => {
				const next = new Set(prev);
				next.delete(post.id);
				return next;
			});
		}
	};
	
	/**
	 * Utility function getStatusClass.
	 */
	const getStatusClass = (status:string):string => {
		switch(status){
			case "APPROVED":
				return `${styles.statusBadge} ${styles.statusApproved}`;
			case "REJECTED":
				return `${styles.statusBadge} ${styles.statusRejected}`;
			default:
				return `${styles.statusBadge} ${styles.statusPending}`;
		}
	};
	
	/**
	 * Utility function getMemberApprovalText.
	 */
	const getMemberApprovalText = (status:string):string => {
		return status === "APPROVED" ? "승인" : "미승인";
	};
	
	/**
	 * Utility function getMemberSortValue.
	 */
	const getMemberSortValue = (member:GuildMember, key:GuildMemberSortKey):number | string => {
		switch(key){
			case "memberName":
				return member.memberName || "";
			case "serverId":
				return member.serverId ?? -1;
			case "guildRole":
				return normalizeGuildRole(member.guildRole);
			case "userPower":
				return member.userPower ?? -1;
			case "userVitality":
				return member.userVitality ?? -1;
			case "userAttractiveness":
				return member.userAttractiveness ?? -1;
			case "rankUpdatedAt":{
				const timestamp = member.rankUpdatedAt ? new Date(member.rankUpdatedAt).getTime() : 0;
				return Number.isNaN(timestamp) ? 0 : timestamp;
			}
			case "memberStatus":
				if(member.memberStatus === "APPROVED"){
					return 2;
				}
				if(member.memberStatus === "PENDING"){
					return 1;
				}
				return 0;
			default:
				return 0;
		}
	};
	
	const sortedGuildMembers = useMemo(() => {
		if(!dashboard){
			return [];
		}
		const cloned = [...dashboard.guildMembers];
		cloned.sort((a, b) => {
			const left = getMemberSortValue(a, memberSort.key);
			const right = getMemberSortValue(b, memberSort.key);
			
			let comparison = 0;
			if(typeof left === "number" && typeof right === "number"){
				comparison = left - right;
			}else{
				comparison = String(left).localeCompare(String(right), "ko", {
					numeric : true,
					sensitivity : "base"
				});
			}
			
			if(comparison !== 0){
				return memberSort.direction === "asc" ? comparison : -comparison;
			}
			
			// Stable fallback: role desc, then name asc.
			const roleComparison = normalizeGuildRole(b.guildRole) - normalizeGuildRole(a.guildRole);
			if(roleComparison !== 0){
				return roleComparison;
			}
			/**
			 * Utility function nameComparison.
			 */
			const nameComparison = (a.memberName || "").localeCompare(b.memberName || "", "ko");
			if(nameComparison !== 0){
				return nameComparison;
			}
			return a.id - b.id;
		});
		return cloned;
	}, [dashboard, memberSort]);
	const filteredGuildMembers = useMemo(() => {
		const normalizedKeyword = guildMemberKeyword.trim().toLowerCase();
		if(!normalizedKeyword){
			return sortedGuildMembers;
		}
		return sortedGuildMembers.filter((member) =>
			(member.memberName ?? "").toLowerCase().includes(normalizedKeyword)
		);
	}, [sortedGuildMembers, guildMemberKeyword]);
	
	/**
	 * Utility function handleMemberSort.
	 */
	const handleMemberSort = (key:GuildMemberSortKey, defaultDirection:SortDirection = "asc") => {
		setMemberSort((prev) => {
			if(prev.key === key){
				return {
					key,
					direction : prev.direction === "asc" ? "desc" : "asc"
				};
			}
			return {
				key,
				direction : defaultDirection
			};
		});
	};
	
	/**
	 * Utility function renderMemberSortIndicator.
	 */
	const renderMemberSortIndicator = (key:GuildMemberSortKey):string => {
		if(memberSort.key !== key){
			return "↕";
		}
		return memberSort.direction === "asc" ? "↑" : "↓";
	};
	
	const latestGuildBoardPosts = useMemo(() => guildBoardPosts.slice(0, 3), [guildBoardPosts]);
	const latestGuildGalleryImages = useMemo(() => guildGalleryImages.slice(0, 4), [guildGalleryImages]);
	const guildGalleryFilterTags = useMemo(() => {
		const uniqueTags = new Set<string>();
		guildGalleryImages.forEach((image) => {
			(image.tags ?? []).forEach((tag) => {
				const normalized = normalizeGuildGallerySingleTag(tag);
				if(normalized){
					uniqueTags.add(normalized);
				}
			});
		});
		return Array.from(uniqueTags).sort((a, b) => a.localeCompare(b, "ko"));
	}, [guildGalleryImages]);
	const filteredGuildGalleryImages = useMemo(() => {
		const normalizedKeyword = guildGalleryKeyword.trim().toLowerCase();
		const normalizedTag = normalizeGuildGallerySingleTag(selectedGuildGalleryTag).toLowerCase();
		const shouldFilterByTag = normalizedTag.length > 0 && normalizedTag !== GUILD_GALLERY_ALL_TAG.toLowerCase();
		if(!normalizedKeyword){
			if(!shouldFilterByTag){
				return guildGalleryImages;
			}
			return guildGalleryImages.filter((image) =>
				(image.tags ?? [])
					.map((tag) => normalizeGuildGallerySingleTag(tag).toLowerCase())
					.some((tag) => tag === normalizedTag)
			);
		}
		return guildGalleryImages.filter((image) => {
			/**
			 * Utility function normalizedImageTags.
			 */
			const normalizedImageTags = (image.tags ?? [])
				.map((tag) => normalizeGuildGallerySingleTag(tag).toLowerCase())
				.filter((tag) => tag.length > 0);
			if(shouldFilterByTag && !normalizedImageTags.some((tag) => tag === normalizedTag)){
				return false;
			}
			/**
			 * Utility function title.
			 */
			const title = (image.title ?? "").toLowerCase();
			/**
			 * Utility function description.
			 */
			const description = (image.description ?? "").toLowerCase();
			/**
			 * Utility function uploader.
			 */
			const uploader = (image.uploaderNickname ?? "").toLowerCase();
			const tags = normalizedImageTags.join(" ");
			return title.includes(normalizedKeyword)
				|| description.includes(normalizedKeyword)
				|| uploader.includes(normalizedKeyword)
				|| tags.includes(normalizedKeyword);
		});
	}, [guildGalleryImages, guildGalleryKeyword, selectedGuildGalleryTag]);
	
	useEffect(() => {
		if(selectedGuildGalleryTag === GUILD_GALLERY_ALL_TAG){
			return;
		}
		const stillExists = guildGalleryFilterTags.some((tag) => tag === selectedGuildGalleryTag);
		if(!stillExists){
			setSelectedGuildGalleryTag(GUILD_GALLERY_ALL_TAG);
		}
	}, [guildGalleryFilterTags, selectedGuildGalleryTag]);
	const filteredGuildBoardPosts = useMemo(() => {
		const normalizedKeyword = guildBoardKeyword.trim().toLowerCase();
		return guildBoardPosts.filter((post) => {
			if(selectedGuildBoardFilterCategoryId !== "all"){
				const categoryId = post.categoryId != null ? String(post.categoryId) : "";
				if(categoryId !== selectedGuildBoardFilterCategoryId){
					return false;
				}
			}
			if(!normalizedKeyword){
				return true;
			}
			/**
			 * Utility function author.
			 */
			const author = (post.authorNickname || `user-${post.authorUserId ?? "-"}`).toLowerCase();
			/**
			 * Utility function title.
			 */
			const title = (post.title ?? "").toLowerCase();
			const content = toSingleLineText(post.content).toLowerCase();
			/**
			 * Utility function category.
			 */
			const category = (post.categoryName ?? "").toLowerCase();
			return title.includes(normalizedKeyword)
				|| content.includes(normalizedKeyword)
				|| author.includes(normalizedKeyword)
				|| category.includes(normalizedKeyword);
		});
	}, [guildBoardPosts, guildBoardKeyword, selectedGuildBoardFilterCategoryId]);
	
	/**
	 * Utility function isMyGuildMember.
	 */
	const isMyGuildMember = (member:GuildMember):boolean => {
		return currentUserId != null && member.userId != null && member.userId === currentUserId;
	};
	
	const guildBoardRows:BoardListTableRow[] = filteredGuildBoardPosts.map((post) => ({
		key : post.id,
		categoryLabel : post.categoryName || null,
		title : post.title,
		author : post.authorNickname || `user-${post.authorUserId ?? "-"}`,
		date : formatGuildDateTime(post.createdAt),
		right : canDeleteGuildBoardPost(post) ? (
			<button
				type="button"
				className={`${styles.btn} ${styles.btnGhost} ${styles.guildBoardDeleteButton}`}
				onClick={(event) => {
					event.stopPropagation();
					void handleDeleteGuildBoardPost(post);
				}}
				disabled={deletingGuildBoardPostIds.has(post.id)}
			>
				<Trash2 size={13}/>
				<span>삭제</span>
			</button>
		) : (
			<span className={styles.muted}>-</span>
		)
	}));
	const activeGuildBoardReferenceResultCount = guildBoardReferenceTab === "item"
		? guildBoardItemReferenceResults.length
		: guildBoardReferenceTab === "barter"
			? guildBoardBarterReferenceResults.length
			: guildBoardCraftReferenceResults.length;
	const guildBoardReferencePanelDescription = showGuildBoardReferencePanel
		? `검색 결과 ${activeGuildBoardReferenceResultCount}건`
		: "아이템, 물물교환, 제작 정보를 본문에 삽입";
	
	return (
		<div className={styles.guildPage}>
			<h1 className="page-heading">길드</h1>
			
			{error && <div className={styles.error}>{error}</div>}
			
			{isInfoSection && (
				<section className={`${styles.section} ${styles.guildListSection}`}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>길드 목록</div>
					</div>
					{loading && <div className={styles.muted}>불러오는 중...</div>}
					{!loading && dashboard && (
						<>
							<div className={`${styles.field} ${styles.guildSearchField}`}>
								<label className={styles.label}>길드 검색</label>
								<input
									className={styles.input}
									value={guildSearchKeyword}
									onChange={(e) => setGuildSearchKeyword(e.target.value)}
									placeholder="길드명, 서버, 길드장, 소개로 검색"
								/>
							</div>
							
							{filteredApprovedGuilds.length === 0 ? (
								<div className={styles.muted}>검색 조건에 맞는 길드가 없습니다.</div>
							) : (
								<div className={styles.tableWrap}>
									<table className={styles.table}>
										<thead>
											<tr>
												<th className={styles.guildListNameCol}>길드명</th>
												<th className={styles.guildListServerCol}>서버</th>
												<th className={styles.guildListLevelCol}>레벨</th>
												<th className={styles.guildListMasterCol}>길드장</th>
												<th>소개</th>
											</tr>
										</thead>
										<tbody>
											{filteredApprovedGuilds.map((guild) => {
												const guildSlug = toGuildSlug(guild.guildName);
												const isSelected = visibleGuild?.guildId === guild.guildId;
												return (
													<tr key={guild.guildId}
														className={isSelected ? styles.selectedGuildRow : undefined}>
														<td className={styles.guildListNameCol}>
															<button
																type="button"
																className={styles.guildNameButton}
																onClick={() => navigate(buildGuildPath(guildSlug))}
															>
																{guild.guildName}
															</button>
														</td>
														<td className={styles.guildListServerCol}>{getGuildServerName(guild.serverId)}</td>
														<td className={styles.guildListLevelCol}>{guild.level ?? "-"}</td>
														<td className={styles.guildListMasterCol}>{guild.masterMemberName || "-"}</td>
														<td
															className={styles.guildDescriptionCell}
															title={toSingleLineText(guild.description) || undefined}
														>
															{toTablePreviewText(guild.description)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</>
					)}
				</section>
			)}
			
			{isInfoSection && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>
							{visibleGuild ? `${visibleGuild.guildName} 길드 정보` : "선택 길드 정보"}
						</div>
					</div>
					{loading && <div className={styles.muted}>불러오는 중...</div>}
					{!loading && dashboard && (
						<>
							{visibleGuild ? (
								<div className={styles.guildInfoGrid}>
									<div className={styles.guildInfoCard}>
										<div className={styles.guildInfoLabel}>길드명</div>
										<div className={styles.guildInfoValue}>{visibleGuild.guildName}</div>
									</div>
									<div className={styles.guildInfoCard}>
										<div className={styles.guildInfoCardHead}>
											<div className={styles.guildInfoLabel}>레벨</div>
											{canEditVisibleGuildLevel && (
												<button
													type="button"
													className={styles.guildLevelSettingButton}
													onClick={handleToggleGuildLevelEdit}
													disabled={updatingGuildLevel}
												>
													<Settings size={12}/>
													<span>설정</span>
												</button>
											)}
										</div>
										<div className={styles.guildInfoValue}>{visibleGuild.level ?? "-"}</div>
										{canEditVisibleGuildLevel && editingGuildLevel && (
											<div className={styles.guildLevelEditor}>
												<input
													type="number"
													min={0}
													max={999}
													className={`${styles.input} ${styles.guildLevelInput}`}
													value={guildLevelDraft}
													onChange={(e) => setGuildLevelDraft(e.target.value)}
													placeholder="길드 레벨"
												/>
												<button
													type="button"
													className={`${styles.btn} ${styles.btnGhost}`}
													onClick={() => void handleUpdateGuildLevel()}
													disabled={updatingGuildLevel}
												>
													{updatingGuildLevel ? "저장 중..." : "레벨 저장"}
												</button>
												<button
													type="button"
													className={`${styles.btn} ${styles.btnGhost}`}
													onClick={handleCancelGuildLevelEdit}
													disabled={updatingGuildLevel}
												>
													취소
												</button>
											</div>
										)}
									</div>
									<div className={styles.guildInfoCard}>
										<div className={styles.guildInfoLabel}>서버</div>
										<div
											className={styles.guildInfoValue}>{getGuildServerName(visibleGuild.serverId)}</div>
									</div>
									<div className={styles.guildInfoCard}>
										<div className={styles.guildInfoLabel}>길드장</div>
										<div className={styles.guildInfoValue}>
											{guildMasterNames.length > 0 ? guildMasterNames.join(", ") : "-"}
										</div>
									</div>
									<div className={`${styles.guildInfoCard} ${styles.guildInfoDescription}`}>
										<div className={styles.guildInfoLabel}>길드 소개</div>
										<div className={styles.guildInfoValue}>
											{toSingleLineText(visibleGuild.description)
												? toTablePreviewText(visibleGuild.description, 220)
												: "등록된 길드 소개가 없습니다."}
										</div>
										{canManageMembersInCurrentView && isVisibleGuildMyApprovedGuild && (
											<div className={styles.buttonRow}>
												{editingGuildDescription ? (
													<>
													<textarea
														className={styles.textarea}
														value={guildDescriptionDraft}
														onChange={(e) => setGuildDescriptionDraft(e.target.value)}
														maxLength={500}
														placeholder="길드 소개를 입력하세요."
													/>
														<button
															type="button"
															className={`${styles.btn} ${styles.btnPrimary}`}
															onClick={() => void handleUpdateGuildDescription()}
															disabled={updatingGuildDescription}
														>
															{updatingGuildDescription ? "저장 중..." : "저장"}
														</button>
														<button
															type="button"
															className={`${styles.btn} ${styles.btnGhost}`}
															onClick={handleCancelGuildDescriptionEdit}
															disabled={updatingGuildDescription}
														>
															취소
														</button>
													</>
												) : (
													<button
														type="button"
														className={`${styles.btn} ${styles.btnGhost}`}
														onClick={handleStartGuildDescriptionEdit}
													>
														길드 소개 편집
													</button>
												)}
											</div>
										)}
									</div>
								</div>
							) : (
								<div className={styles.muted}>
									{dashboard.approvedGuilds.length === 0
										? "현재 조회 가능한 길드가 없습니다."
										: "길드 목록에서 길드를 선택해 주세요."}
								</div>
							)}
						</>
					)}
				</section>
			)}
			
			{isInfoSection && (
				<section className={styles.section}>
					<div className={styles.guildHighlightsGrid}>
						<article className={styles.guildHighlightPanel}>
							<div className={styles.sectionHead}>
								<div className={styles.sectionTitle}>
									<MessageSquare size={16}/>
									<span>길드 게시판 최신 게시물</span>
								</div>
								<button
									type="button"
									className={`${styles.btn} ${styles.btnGhost}`}
									onClick={() => handleOpenGuildSectionDetail("board")}
									disabled={!visibleGuild}
								>
									자세히보기
								</button>
							</div>
							{!visibleGuild ? (
								<div className={styles.muted}>길드 목록에서 길드를 선택해 주세요.</div>
							) : loadingGuildBoardPosts ? (
								<div className={styles.muted}>불러오는 중...</div>
							) : latestGuildBoardPosts.length === 0 ? (
								<div className={styles.muted}>작성된 길드 게시글이 없습니다.</div>
							) : (
								<div className={styles.guildBoardPreviewList}>
									{latestGuildBoardPosts.map((post) => (
										<article key={post.id} className={styles.guildBoardPreviewItem}>
											{post.categoryName && (
												<div
													className={styles.guildBoardCategoryBadge}>{post.categoryName}</div>
											)}
											<div className={styles.guildBoardPreviewTitle}>{post.title}</div>
											<div className={styles.guildBoardPreviewMeta}>
												<span>{post.authorNickname || `user-${post.authorUserId ?? "-"}`}</span>
												<span>{formatGuildDateTime(post.createdAt)}</span>
											</div>
											<p className={styles.guildBoardPreviewContent}>{toTablePreviewText(post.content, 140)}</p>
										</article>
									))}
								</div>
							)}
						</article>
						
						<article className={styles.guildHighlightPanel}>
							<div className={styles.sectionHead}>
								<div className={styles.sectionTitle}>
									<ImagePlus size={16}/>
									<span>길드 갤러리 최신 이미지</span>
								</div>
								<button
									type="button"
									className={`${styles.btn} ${styles.btnGhost}`}
									onClick={() => handleOpenGuildSectionDetail("gallery")}
									disabled={!visibleGuild}
								>
									자세히보기
								</button>
							</div>
							{!visibleGuild ? (
								<div className={styles.muted}>길드 목록에서 길드를 선택해 주세요.</div>
							) : loadingGuildGallery ? (
								<div className={styles.muted}>불러오는 중...</div>
							) : latestGuildGalleryImages.length === 0 ? (
								<div className={styles.muted}>등록된 길드 이미지가 없습니다.</div>
							) : (
								<div className={styles.guildGalleryPreviewGrid}>
									{latestGuildGalleryImages.map((image) => (
										<a
											key={image.id}
											href={getGuildGalleryDetailPath(image)}
											className={`${styles.guildGalleryPreviewItem} ${styles.guildGalleryPreviewButton}`}
											onClick={(event) => handleGuildGalleryDetailLinkClick(event, image)}
										>
											<img
												src={getGuildGalleryPrimaryImageUrl(image)}
												alt={image.title?.trim() || `${visibleGuild.guildName} 길드 이미지`}
												onLoad={handleGuildGalleryImageLoad}
												className={styles.guildGalleryPreviewImage}
											/>
											<div className={styles.guildGalleryPreviewCaption}>
												{image.title?.trim() || "제목 없음"}
											</div>
										</a>
									))}
								</div>
							)}
						</article>
					</div>
				</section>
			)}
			
			{activeGuildSection === "gallery" && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>
							<ImagePlus size={16}/>
							<span>{visibleGuild ? `${visibleGuild.guildName} 길드 갤러리` : "길드 갤러리"}</span>
						</div>
					</div>
					<input
						ref={galleryFileInputRef}
						type="file"
						multiple
						accept="image/jpeg,image/png,image/gif,image/webp"
						className={styles.hiddenFileInput}
						onChange={handleGuildGalleryFileChange}
					/>
					<div className={styles.guildGalleryHeroCard}>
						<div className={styles.guildGalleryQuickComposer}>
							<button
								type="button"
								className={`${styles.guildGalleryDropZone} ${styles.guildGalleryHeroDropZone} ${isGuildGalleryDragOver ? styles.dragOver : ""}`}
								onClick={handleOpenGuildGalleryUploader}
								onDragOver={handleGuildGalleryDropZoneDragOver}
								onDragLeave={handleGuildGalleryDropZoneDragLeave}
								onDrop={(event) => void handleGuildGalleryDropZoneDrop(event)}
								disabled={!canUploadVisibleGuildContent || uploadingGuildGalleryImage}
							>
								<ImagePlus size={18}/>
								<div>
									<strong>{canUploadVisibleGuildContent ? "이미지를 드롭하거나 클릭해서 빠르게 업로드" : "해당 길드 승인 길드원만 업로드할 수 있습니다."}</strong>
									<span>{canUploadVisibleGuildContent ? "JPG / PNG / GIF / WEBP 업로드 후 작성 창에서 캡션과 태그를 입력하세요" : "이미지 열람과 검색은 계속 사용할 수 있습니다."}</span>
								</div>
							</button>
						</div>
					</div>
					{guildGalleryUploadProgress != null && (
						<div className={styles.galleryProgressTrack}>
							<div className={styles.galleryProgressFill}
								 style={{width : `${guildGalleryUploadProgress}%`}}/>
						</div>
					)}
					{guildGalleryError && <div className={styles.errorInline}>{guildGalleryError}</div>}
					{visibleGuild && (
						<div className={styles.guildGalleryToolbar}>
							<div className={styles.guildGalleryViewSwitch}>
								<button
									type="button"
									className={guildGalleryViewMode === "board" ? styles.guildGalleryViewSwitchActive : ""}
									onClick={() => setGuildGalleryViewMode("board")}
								>
									<List size={16}/>
									목록형
								</button>
								<button
									type="button"
									className={guildGalleryViewMode === "portfolio" ? styles.guildGalleryViewSwitchActive : ""}
									onClick={() => setGuildGalleryViewMode("portfolio")}
								>
									<LayoutGrid size={16}/>
									갤러리형
								</button>
							</div>
							<div className={styles.guildGallerySearchBox}>
								<Search size={15}/>
								<input
									type="text"
									value={guildGalleryKeyword}
									onChange={(e) => setGuildGalleryKeyword(e.target.value)}
									placeholder="제목, 설명, 작성자, 태그 검색"
								/>
							</div>
						</div>
					)}
					{visibleGuild && guildGalleryFilterTags.length > 0 && (
						<div className={styles.guildGalleryTagFilter}>
							<button
								type="button"
								className={selectedGuildGalleryTag === GUILD_GALLERY_ALL_TAG ? styles.guildGalleryTagFilterButtonActive : styles.guildGalleryTagFilterButton}
								onClick={() => setSelectedGuildGalleryTag(GUILD_GALLERY_ALL_TAG)}
							>
								<Tag size={12}/>
								전체
							</button>
							{guildGalleryFilterTags.map((tag) => (
								<button
									type="button"
									key={`guild-gallery-filter-tag-${tag}`}
									className={selectedGuildGalleryTag === tag ? styles.guildGalleryTagFilterButtonActive : styles.guildGalleryTagFilterButton}
									onClick={() => setSelectedGuildGalleryTag(tag)}
								>
									#{tag}
								</button>
							))}
						</div>
					)}
					{!visibleGuild ? (
						<div className={styles.muted}>길드를 먼저 선택해 주세요.</div>
					) : loadingGuildGallery ? (
						<div className={styles.muted}>불러오는 중...</div>
					) : filteredGuildGalleryImages.length === 0 ? (
						<div className={styles.muted}>등록된 길드 이미지가 없습니다.</div>
					) : guildGalleryViewMode === "board" ? (
						<div className={styles.guildGalleryBoardView}>
							<div className={styles.guildGalleryTableHeader}>
								<span>미리보기</span>
								<span>제목</span>
								<span>작성자</span>
								<span className={styles.guildGalleryDateCell}>날짜</span>
								<span>반응</span>
							</div>
							{filteredGuildGalleryImages.map((image) => (
								<article
									key={image.id}
									className={styles.guildGalleryTableRow}
									onClick={() => handleOpenGuildGalleryViewer(image)}
								>
									<a
										href={getGuildGalleryDetailPath(image)}
										onClick={(event) => handleGuildGalleryDetailLinkClick(event, image)}
									>
										<img
											src={getGuildGalleryPrimaryImageUrl(image)}
											alt={image.title?.trim() || `${visibleGuild.guildName} 길드 이미지`}
											onLoad={handleGuildGalleryImageLoad}
											className={styles.guildGalleryImage}
										/>
									</a>
									<div className={styles.guildGalleryRowTitle}>
										<h3>{image.title?.trim() || "제목 없음"}</h3>
										<p>{image.description?.trim() || "설명이 없습니다."}</p>
										{(image.tags ?? []).length > 0 && (
											<div className={styles.guildGalleryRowTags}>
												{(image.tags ?? []).slice(0, 4).map((tag) => <span key={`${image.id}-list-${tag}`}>#{tag}</span>)}
											</div>
										)}
									</div>
									<span>{image.uploaderNickname || `user-${image.userId ?? image.uploaderUserId ?? "-"}`}</span>
									<span className={styles.guildGalleryDateCell}><CalendarDays size={14}/>{formatGuildDateTime(image.createdAt)}</span>
									<span className={styles.guildGalleryReaction}>
										<span><Eye size={14}/>{image.viewCount ?? 0}</span>
										<button
											type="button"
											className={`${styles.btn} ${styles.btnGhost} ${styles.galleryLikeButton}`}
											onClick={(event) => void handleGuildGalleryLikeClick(event, image)}
											disabled={!canUploadVisibleGuildContent || likingGuildGalleryImageIds.has(image.id)}
											title={canUploadVisibleGuildContent ? "좋아요" : "해당 길드 승인 길드원만 좋아요를 누를 수 있습니다."}
										>
											<Heart size={13}/>
											<span>{image.likeCount ?? 0}</span>
										</button>
									</span>
								</article>
							))}
						</div>
					) : (
						<div className={styles.guildGalleryFeedGrid}>
							{filteredGuildGalleryImages.map((image) => (
								<article key={image.id} className={styles.guildGalleryFeedCard}>
									<a
										href={getGuildGalleryDetailPath(image)}
										className={`${styles.guildGalleryFeedImageWrap} ${styles.guildGalleryFeedImageButton}`}
										onClick={(event) => handleGuildGalleryDetailLinkClick(event, image)}
									>
										<img src={getGuildGalleryPrimaryImageUrl(image)}
											 alt={image.title?.trim() || `${visibleGuild.guildName} 길드 이미지`}
											 onLoad={handleGuildGalleryImageLoad}
											 className={styles.guildGalleryImage}/>
									</a>
									<div className={styles.guildGalleryFeedBody}>
										<div className={styles.guildGalleryFeedTop}>
											<div className={styles.guildGalleryFeedAuthor}>
												{image.uploaderNickname || `user-${image.userId ?? image.uploaderUserId ?? "-"}`}
											</div>
											<div className={styles.guildGalleryFeedDate}>
												<CalendarDays size={13}/>
												{formatGuildDateTime(image.createdAt)}
											</div>
										</div>
										<h3 className={styles.guildGalleryFeedTitle}>{image.title?.trim() || "제목 없음"}</h3>
										<p className={styles.guildGalleryFeedDescription}>
											{image.description?.trim() || "설명이 없습니다."}
										</p>
										{(image.tags ?? []).length > 0 && (
											<div className={styles.guildGalleryFeedTags}>
												{(image.tags ?? []).slice(0, 6).map((tag) => (
													<span key={`${image.id}-${tag}`}>
														<Tag size={11}/>
														{tag}
													</span>
												))}
											</div>
										)}
										<div className={styles.guildGalleryFeedStats}>
											<span>
												<Eye size={13}/>
												{image.viewCount ?? 0}
											</span>
										</div>
										<div className={styles.guildGalleryActionsRow}>
											<div className={styles.guildGalleryLikeRow}>
												<button
													type="button"
													className={`${styles.btn} ${styles.btnGhost} ${styles.galleryLikeButton}`}
													onClick={(event) => void handleGuildGalleryLikeClick(event, image)}
													disabled={!canUploadVisibleGuildContent || likingGuildGalleryImageIds.has(image.id)}
													title={canUploadVisibleGuildContent ? "좋아요" : "해당 길드 승인 길드원만 좋아요를 누를 수 있습니다."}
												>
													<Heart size={13}/>
													<span>{image.likeCount ?? 0}</span>
												</button>
											</div>
											{canDeleteGuildGalleryImage(image) && (
												<div className={styles.buttonRow}>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnGhost}`}
														onClick={() => void handleDeleteGuildGalleryImage(image)}
														disabled={deletingGuildGalleryImageIds.has(image.id)}
													>
														<Trash2 size={13}/>
														<span>삭제</span>
													</button>
												</div>
											)}
										</div>
									</div>
								</article>
							))}
						</div>
					)}
					{!canUploadVisibleGuildContent && isLoggedIn && visibleGuild && (
						<div className={styles.muted}>해당 길드 승인 길드원만 이미지 업로드가 가능합니다.</div>
					)}
				</section>
			)}
			{selectedGuildGalleryImage && (
				<div
					className={styles.galleryViewerOverlay}
					role="presentation"
					onClick={handleCloseGuildGalleryViewer}
				>
					<div
						className={styles.galleryViewerDialog}
						role="dialog"
						aria-modal="true"
						aria-labelledby="guild-gallery-viewer-title"
						onClick={(event) => event.stopPropagation()}
					>
						<div className={styles.galleryViewerHeader}>
							<h3 id="guild-gallery-viewer-title" className={styles.galleryViewerTitle}>
								{selectedGuildGalleryImage.title?.trim() || "길드 갤러리 이미지"}
							</h3>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnGhost} ${styles.galleryViewerCloseBtn}`}
								onClick={handleCloseGuildGalleryViewer}
							>
								닫기
							</button>
						</div>
						<div className={styles.galleryViewerContent}>
							<div className={styles.galleryViewerImageWrap}>
								<img
									src={selectedGuildGalleryCurrentImageUrl || getGuildGalleryPrimaryImageUrl(selectedGuildGalleryImage)}
									alt={selectedGuildGalleryImage.title?.trim() || `${visibleGuild?.guildName ?? "길드"} 이미지`}
									className={`${styles.galleryViewerImage} ${styles.zoomableImage}`}
									onClick={() => handleOpenGuildGalleryImageZoom(
										selectedGuildGalleryCurrentImageUrl || getGuildGalleryPrimaryImageUrl(selectedGuildGalleryImage)
									)}
								/>
								{selectedGuildGalleryImageLoading && <div className={styles.imageLoadingOverlay}>로딩 중...</div>}
							</div>
							<aside className={styles.galleryViewerMeta}>
								<div className={styles.galleryViewerAuthor}>
									{selectedGuildGalleryImage.uploaderNickname || `user-${selectedGuildGalleryImage.userId ?? selectedGuildGalleryImage.uploaderUserId ?? "-"}`}
								</div>
								<div className={styles.galleryViewerDate}>
									<CalendarDays size={14}/>
									{formatGuildDateTime(selectedGuildGalleryImage.createdAt)}
								</div>
								{editingGuildGalleryImage ? (
									<form className={styles.modalEditForm} onSubmit={handleUpdateGuildGalleryImage}>
										<div className={styles.field}>
											<label className={styles.label}>이미지 관리</label>
											<div className={styles.editImageHelper}>삭제할 이미지를 선택하세요. 최소 1장은 남겨야 합니다.</div>
											{guildGalleryEditImageUrlsDraft.length > 0 && (
												<div className={styles.editImageList}>
													{guildGalleryEditImageUrlsDraft.map((imageUrl, imageIndex) => (
														<div key={`guild-edit-image-${imageIndex}-${imageUrl}`} className={styles.editImageItem}>
															<img src={imageUrl} alt={`guild edit image ${imageIndex + 1}`}/>
															<button
																type="button"
																className={styles.editImageRemoveBtn}
																onClick={() => handleRemoveGuildGalleryEditImage(imageIndex)}
															>
																삭제
															</button>
														</div>
													))}
												</div>
											)}
										</div>
										<div className={styles.field}>
											<label className={styles.label}>제목</label>
											<input
												className={styles.input}
												value={guildGalleryEditTitleDraft}
												onChange={(e) => setGuildGalleryEditTitleDraft(e.target.value)}
												maxLength={200}
											/>
										</div>
										<div className={styles.field}>
											<label className={styles.label}>설명</label>
											<textarea
												className={styles.textarea}
												value={guildGalleryEditDescriptionDraft}
												onChange={(e) => setGuildGalleryEditDescriptionDraft(e.target.value)}
												maxLength={1000}
											/>
										</div>
										<div className={styles.field}>
											<label className={styles.label}>태그</label>
											<input
												className={styles.input}
												value={guildGalleryEditTagsDraft}
												onChange={(e) => setGuildGalleryEditTagsDraft(normalizeGuildGalleryTagsInputValueOnType(e.target.value))}
												onBlur={() => setGuildGalleryEditTagsDraft((prev) => normalizeGuildGalleryTagsInputValue(prev))}
												maxLength={500}
												placeholder="쉼표(,) 또는 공백으로 구분"
											/>
											{parseGuildGalleryTagsInput(guildGalleryEditTagsDraft).length > 0 && (
												<div className={styles.tagInputPreview}>
													{parseGuildGalleryTagsInput(guildGalleryEditTagsDraft).map((tag) => (
														<button
															key={`guild-edit-tag-${tag}`}
															type="button"
															className={styles.tagPreviewChip}
															onClick={() => setGuildGalleryEditTagsDraft((prev) => removeGuildGalleryTagFromInput(prev, tag))}
														>
															<span>#{tag}</span>
															<X size={12}/>
														</button>
													))}
												</div>
											)}
										</div>
										<div className={styles.buttonRow}>
											<button
												type="button"
												className={`${styles.btn} ${styles.btnGhost}`}
												onClick={handleCancelEditGuildGalleryImage}
												disabled={updatingGuildGalleryImage}
											>
												취소
											</button>
											<button
												type="submit"
												className={`${styles.btn} ${styles.btnPrimary}`}
												disabled={updatingGuildGalleryImage}
											>
												{updatingGuildGalleryImage ? "저장 중..." : "저장"}
											</button>
										</div>
									</form>
								) : (
									<>
										<p className={styles.galleryViewerDescription}>
											{selectedGuildGalleryImage.description?.trim() || "설명이 없습니다."}
										</p>
										<div className={styles.galleryViewerStats}>
											<span>
												<Eye size={14}/>
												{selectedGuildGalleryImage.viewCount ?? 0}
											</span>
											<span>
												<Heart size={14}/>
												{selectedGuildGalleryImage.likeCount ?? 0}
											</span>
										</div>
									</>
								)}
								{selectedGuildGalleryImageCount > 1 && (
									<div className={styles.galleryViewerActions}>
										<button
											type="button"
											className={`${styles.btn} ${styles.btnGhost}`}
											onClick={handleGuildGalleryViewerPrev}
											disabled={selectedGuildGalleryImageLoading}
										>
											이전
										</button>
										<span>{selectedGuildGalleryImageCursor + 1} / {selectedGuildGalleryImageCount}</span>
										<button
											type="button"
											className={`${styles.btn} ${styles.btnGhost}`}
											onClick={handleGuildGalleryViewerNext}
											disabled={selectedGuildGalleryImageLoading}
										>
											다음
										</button>
									</div>
								)}
								<div className={styles.galleryViewerActions}>
									<button
										type="button"
										className={`${styles.btn} ${styles.btnGhost} ${styles.galleryLikeButton}`}
										onClick={() => void handleToggleGuildGalleryImageLike(selectedGuildGalleryImage)}
										disabled={!canUploadVisibleGuildContent || likingGuildGalleryImageIds.has(selectedGuildGalleryImage.id)}
										title={canUploadVisibleGuildContent ? "좋아요" : "해당 길드 승인 길드원만 좋아요를 누를 수 있습니다."}
									>
										<Heart size={13}/>
										<span>{selectedGuildGalleryImage.likeCount ?? 0}</span>
									</button>
									{canEditGuildGalleryImage(selectedGuildGalleryImage) && (
										<button
											type="button"
											className={`${styles.btn} ${styles.btnGhost}`}
											onClick={editingGuildGalleryImage ? handleCancelEditGuildGalleryImage : handleStartEditGuildGalleryImage}
											disabled={updatingGuildGalleryImage}
										>
											<Settings size={13}/>
											<span>{editingGuildGalleryImage ? "편집 취소" : "수정"}</span>
										</button>
									)}
									{canDeleteGuildGalleryImage(selectedGuildGalleryImage) && (
										<button
											type="button"
											className={`${styles.btn} ${styles.btnGhost}`}
											onClick={() => void handleDeleteGuildGalleryImage(selectedGuildGalleryImage)}
											disabled={deletingGuildGalleryImageIds.has(selectedGuildGalleryImage.id) || updatingGuildGalleryImage}
										>
											<Trash2 size={13}/>
											<span>삭제</span>
										</button>
									)}
								</div>
								{!editingGuildGalleryImage && (selectedGuildGalleryImage.tags ?? []).length > 0 && (
									<div className={styles.galleryViewerTags}>
										{(selectedGuildGalleryImage.tags ?? []).map((tag) => (
											<span key={`${selectedGuildGalleryImage.id}-${tag}`}>
												<Tag size={11}/>
												{tag}
											</span>
										))}
									</div>
								)}
							</aside>
						</div>
					</div>
				</div>
			)}
			{guildGalleryZoomImageUrl && (
				<div className={styles.imageZoomOverlay} onClick={handleCloseGuildGalleryImageZoom}>
					<div className={styles.imageZoomContent} onClick={(event) => event.stopPropagation()}>
						<button
							type="button"
							className={styles.imageZoomCloseBtn}
							onClick={handleCloseGuildGalleryImageZoom}
						>
							닫기
						</button>
						<img src={guildGalleryZoomImageUrl} alt="길드 갤러리 확대 이미지" className={styles.imageZoomImage}/>
					</div>
				</div>
			)}
			{showGuildGalleryCreateModal && guildGalleryPrimaryTempImageUrl && (
				<div
					className={styles.modalOverlay}
					role="presentation"
					onClick={creatingGuildGalleryImage || guildGalleryTempImageUrls.length > 0 ? undefined : closeGuildGalleryCreateModal}
				>
					<div
						className={styles.modalContent}
						role="dialog"
						aria-modal="true"
						aria-labelledby="guild-gallery-create-title"
						onClick={(event) => event.stopPropagation()}
					>
						<div className={styles.modalHeader}>
							<h3 id="guild-gallery-create-title">길드 갤러리 등록</h3>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnGhost} ${styles.closeBtn}`}
								onClick={closeGuildGalleryCreateModal}
								disabled={creatingGuildGalleryImage}
							>
								닫기
							</button>
						</div>
						<form className={styles.modalEditForm} onSubmit={handleCreateGuildGalleryImage}>
							<div className={styles.createPreview}>
								<div className={styles.createPreviewViewport}>
									<img
										src={guildGalleryCreateCurrentImageUrl || guildGalleryPrimaryTempImageUrl}
										alt={`guild gallery preview ${guildGalleryCreateImageCursor + 1}`}
										onLoad={handleGuildGalleryImageLoad}
										className={styles.guildGalleryImage}
									/>
									{guildGalleryCreateImageLoading && <div className={styles.imageLoadingOverlay}>로딩 중...</div>}
								</div>
								<div className={styles.createPreviewControls}>
									{guildGalleryCreateImageCount > 1 && (
										<>
											<button
												type="button"
												className={`${styles.btn} ${styles.btnGhost}`}
												onClick={handleGuildGalleryCreatePrevImage}
												disabled={guildGalleryCreateImageLoading}
											>
												이전
											</button>
											<span className={styles.createPreviewIndex}>{guildGalleryCreateImageCursor + 1} / {guildGalleryCreateImageCount}</span>
											<button
												type="button"
												className={`${styles.btn} ${styles.btnGhost}`}
												onClick={handleGuildGalleryCreateNextImage}
												disabled={guildGalleryCreateImageLoading}
											>
												다음
											</button>
										</>
									)}
									<button
										type="button"
										className={`${styles.btn} ${styles.btnGhost}`}
										onClick={handleSetGuildGalleryRepresentativeImage}
										disabled={guildGalleryCreateImageLoading || guildGalleryCreateImageCount <= 1 || guildGalleryCreateImageCursor === 0}
									>
										대표 이미지로 설정
									</button>
								</div>
							</div>
							{guildGalleryTempImageUrls.length > 1 && (
								<div className={styles.muted}>총 {guildGalleryTempImageUrls.length}장의 이미지가 함께 등록됩니다.</div>
							)}
							<div className={styles.buttonRow}>
								<button
									type="button"
									className={`${styles.btn} ${styles.btnGhost}`}
									onClick={handleAppendGuildGalleryImages}
									disabled={creatingGuildGalleryImage || uploadingGuildGalleryImage}
								>
									이미지 추가
								</button>
							</div>
							<div className={styles.field}>
								<label className={styles.label}>제목</label>
								<input
									className={styles.input}
									value={guildGalleryTitleDraft}
									onChange={(e) => setGuildGalleryTitleDraft(e.target.value)}
									maxLength={200}
									placeholder="이미지 제목"
									required
								/>
							</div>
							<div className={styles.field}>
								<label className={styles.label}>설명</label>
								<textarea
									className={styles.textarea}
									value={guildGalleryDescriptionDraft}
									onChange={(e) => setGuildGalleryDescriptionDraft(e.target.value)}
									maxLength={1000}
									placeholder="이미지 설명"
								/>
							</div>
							<div className={styles.field}>
								<label className={styles.label}>태그</label>
								<input
									className={styles.input}
									value={guildGalleryTagsDraft}
									onChange={(e) => setGuildGalleryTagsDraft(normalizeGuildGalleryTagsInputValueOnType(e.target.value))}
									onBlur={() => setGuildGalleryTagsDraft((prev) => normalizeGuildGalleryTagsInputValue(prev))}
									maxLength={500}
									placeholder="쉼표(,) 또는 공백으로 구분 (예: #전투 레이드, 공성)"
								/>
								{parseGuildGalleryTagsInput(guildGalleryTagsDraft).length > 0 && (
									<div className={styles.tagInputPreview}>
										{parseGuildGalleryTagsInput(guildGalleryTagsDraft).map((tag) => (
											<button
												key={`guild-create-tag-${tag}`}
												type="button"
												className={styles.tagPreviewChip}
												onClick={() => setGuildGalleryTagsDraft((prev) => removeGuildGalleryTagFromInput(prev, tag))}
											>
												<span>#{tag}</span>
												<X size={12}/>
											</button>
										))}
									</div>
								)}
							</div>
							{guildGalleryError && <div className={styles.errorInline}>{guildGalleryError}</div>}
							<div className={styles.modalActions}>
								<button
									type="button"
									className={`${styles.btn} ${styles.btnGhost}`}
									onClick={closeGuildGalleryCreateModal}
									disabled={creatingGuildGalleryImage}
								>
									취소
								</button>
								<button
									type="submit"
									className={`${styles.btn} ${styles.btnPrimary}`}
									disabled={creatingGuildGalleryImage || !guildGalleryTitleDraft.trim()}
								>
									{creatingGuildGalleryImage ? "등록 중..." : "등록"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
			
			{activeGuildSection === "board" && (
				<section className={`${styles.section} ${isGuildBoardWriteMode ? styles.guildBoardWriteSection : ""}`}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>
							<MessageSquare size={16}/>
							<span>
								{isGuildBoardWriteMode
									? (visibleGuild ? `${visibleGuild.guildName} 게시글 작성` : "길드 게시글 작성")
									: (visibleGuild ? `${visibleGuild.guildName} 길드 게시판` : "길드 게시판")}
							</span>
						</div>
						{visibleGuild && !isGuildBoardWriteMode && (
							<div className={styles.buttonRow}>
								{canManageVisibleGuildContent && (
									<button
										type="button"
										className={`${styles.btn} ${styles.btnGhost}`}
										onClick={() => setShowGuildBoardCategoryManager((prev) => !prev)}
									>
										{showGuildBoardCategoryManager ? "카테고리 관리 닫기" : "카테고리 관리"}
									</button>
								)}
								{canUploadVisibleGuildContent && (
									<button
										type="button"
										className={`${styles.btn} ${styles.btnPrimary}`}
										onClick={() => navigate(buildGuildBoardWritePath(toGuildSlug(visibleGuild.guildName)))}
									>
										글쓰기
									</button>
								)}
							</div>
						)}
					</div>
					{!isGuildBoardWriteMode && canManageVisibleGuildContent && showGuildBoardCategoryManager && (
						<form onSubmit={handleCreateGuildBoardCategory} className={styles.guildBoardCategoryManager}>
							<div className={styles.field}>
								<label className={styles.label}>카테고리 설정 (부마스터 이상)</label>
								<input
									className={styles.input}
									value={guildBoardCategoryNameDraft}
									onChange={(e) => setGuildBoardCategoryNameDraft(e.target.value)}
									maxLength={60}
									placeholder="새 카테고리명"
								/>
							</div>
							<div className={styles.buttonRow}>
								<button type="submit" className={`${styles.btn} ${styles.btnGhost}`}
										disabled={creatingGuildBoardCategory}>
									{creatingGuildBoardCategory ? "추가 중..." : "카테고리 추가"}
								</button>
							</div>
						</form>
					)}
					{!isGuildBoardWriteMode && (loadingGuildBoardCategories || guildBoardCategories.length > 0 || guildBoardCategoryError) && (
						<div className={styles.guildBoardCategoryList}>
							{loadingGuildBoardCategories ? (
								<span className={styles.muted}>카테고리 불러오는 중...</span>
							) : guildBoardCategories.length === 0 ? (
								<span className={styles.muted}>등록된 카테고리가 없습니다.</span>
							) : (
								guildBoardCategories.map((category) => (
									<div key={category.id} className={styles.guildBoardCategoryItem}>
										<span>{category.name}</span>
										{canManageVisibleGuildContent && (
											<button
												type="button"
												className={`${styles.btn} ${styles.btnGhost}`}
												onClick={() => void handleDeleteGuildBoardCategory(category.id)}
												disabled={deletingGuildBoardCategoryIds.has(category.id)}
											>
												삭제
											</button>
										)}
									</div>
								))
							)}
						</div>
					)}
					{!isGuildBoardWriteMode && guildBoardCategoryError &&
						<div className={styles.errorInline}>{guildBoardCategoryError}</div>}
					{canUploadVisibleGuildContent && isGuildBoardWriteMode && (
						<form onSubmit={handleCreateGuildBoardPost} className={styles.guildBoardComposer}>
							<div className={`${styles.field} ${styles.guildBoardComposerGroup}`}>
								<label className={styles.guildBoardComposerLabel}>카테고리</label>
								<select
									className={`${styles.select} ${styles.guildBoardComposerControl}`}
									value={selectedGuildBoardCategoryId}
									onChange={(e) => setSelectedGuildBoardCategoryId(e.target.value)}
								>
									<option value="">선택 안함</option>
									{guildBoardCategories.map((category) => (
										<option key={category.id} value={category.id}>{category.name}</option>
									))}
								</select>
							</div>
							<div className={`${styles.field} ${styles.guildBoardComposerGroup}`}>
								<label className={styles.guildBoardComposerLabel}>제목</label>
								<input
									className={`${styles.input} ${styles.guildBoardComposerControl}`}
									value={guildBoardTitleDraft}
									onChange={(e) => setGuildBoardTitleDraft(e.target.value)}
									maxLength={200}
									placeholder="제목"
								/>
							</div>
							<div className={`${styles.field} ${styles.guildBoardComposerGroup}`}>
								<div className={styles.guildBoardComposerContentHead}>
									<label className={styles.guildBoardComposerLabel}>내용</label>
									<div className={styles.guildBoardComposerContentActions}>
										<div className={styles.guildBoardComposerTabToggle}>
											<button
												type="button"
												className={`${styles.guildBoardComposerToggleBtn} ${!showGuildBoardComposerPreview ? styles.guildBoardComposerToggleBtnActive : ""}`}
												onClick={() => setShowGuildBoardComposerPreview(false)}
											>
												작성
											</button>
											<button
												type="button"
												className={`${styles.guildBoardComposerToggleBtn} ${showGuildBoardComposerPreview ? styles.guildBoardComposerToggleBtnActive : ""}`}
												onClick={() => setShowGuildBoardComposerPreview(true)}
											>
												미리보기
											</button>
										</div>
									</div>
								</div>
								{showGuildBoardComposerPreview ? (
									<div className={styles.guildBoardComposerPreview}>
										{guildBoardContentDraft.trim() ? (
											<ReactMarkdown
												remarkPlugins={guildBoardMarkdownRemarkPlugins}
												rehypePlugins={guildBoardMarkdownRehypePlugins}
												components={guildBoardMarkdownComponents}
											>
												{guildBoardContentDraft}
											</ReactMarkdown>
										) : (
											<span className={styles.guildBoardComposerPreviewEmpty}>내용을 입력하면 미리보기가 표시됩니다.</span>
										)}
									</div>
								) : (
									<div className={styles.guildBoardEditorWrap}>
										<MarkdownToolbar
											textareaRef={guildBoardComposerTextareaRef}
											content={guildBoardContentDraft}
											setContent={setGuildBoardContentDraft}
											floatingAction={{
												icon : <Search size={16}/>,
												title : "참조 패널",
												action : () => setShowGuildBoardReferencePanel((prev) => !prev),
												active : showGuildBoardReferencePanel,
												buttonRef : guildBoardReferenceTriggerRef
											}}
										/>
										{showGuildBoardReferencePanel && (
											<div className={styles.guildBoardReferenceFloatingLayer}>
												<div className={styles.guildBoardReferencePanel}
													 ref={guildBoardReferencePanelRef}>
													<div className={styles.guildBoardReferenceHeader}>
														<div className={styles.guildBoardReferenceHeaderText}>
															<strong>참조 패널</strong>
															<span>{guildBoardReferencePanelDescription}</span>
														</div>
														<button
															type="button"
															className={styles.guildBoardReferencePanelCloseBtn}
															onClick={() => setShowGuildBoardReferencePanel(false)}
															aria-label="참조 패널 닫기"
														>
															<X size={14}/>
														</button>
													</div>
													<div className={styles.guildBoardReferenceControls}>
														<div className={styles.guildBoardReferenceTabs}>
															<button
																type="button"
																className={`${styles.guildBoardReferenceTabBtn} ${guildBoardReferenceTab === "item" ? styles.guildBoardReferenceTabBtnActive : ""}`}
																onClick={() => setGuildBoardReferenceTab("item")}
															>
																<Package size={14}/>
																아이템
															</button>
															<button
																type="button"
																className={`${styles.guildBoardReferenceTabBtn} ${guildBoardReferenceTab === "barter" ? styles.guildBoardReferenceTabBtnActive : ""}`}
																onClick={() => setGuildBoardReferenceTab("barter")}
															>
																<ArrowLeftRight size={14}/>
																물물교환
															</button>
															<button
																type="button"
																className={`${styles.guildBoardReferenceTabBtn} ${guildBoardReferenceTab === "craft" ? styles.guildBoardReferenceTabBtnActive : ""}`}
																onClick={() => setGuildBoardReferenceTab("craft")}
															>
																<Hammer size={14}/>
																제작
															</button>
														</div>
														<div className={styles.guildBoardReferenceSearch}>
															<input
																type="text"
																value={guildBoardReferenceKeyword}
																onChange={(e) => setGuildBoardReferenceKeyword(e.target.value)}
																onKeyDown={handleGuildBoardReferenceKeywordKeyDown}
																placeholder="검색어를 입력해 주세요."
																className={styles.guildBoardReferenceInput}
															/>
															<button
																type="button"
																className={styles.guildBoardReferenceSearchBtn}
																onClick={() => void handleSearchGuildBoardReference()}
																disabled={guildBoardReferenceLoading}
															>
																<Search size={14}/>
																검색
															</button>
														</div>
													</div>
													
													{guildBoardReferenceError && <div
														className={styles.guildBoardReferenceError}>{guildBoardReferenceError}</div>}
													{guildBoardReferenceLoading &&
														<div className={styles.guildBoardReferenceLoading}>검색
															중입니다...</div>}
													{!guildBoardReferenceLoading && !guildBoardReferenceError && guildBoardReferenceKeyword.trim() && activeGuildBoardReferenceResultCount === 0 && (
														<div className={styles.guildBoardReferenceEmpty}>검색 결과가
															없습니다.</div>
													)}
													
													{!guildBoardReferenceLoading && !guildBoardReferenceError && activeGuildBoardReferenceResultCount > 0 && (
														<div className={styles.guildBoardReferenceResults}>
															{guildBoardReferenceTab === "item" && guildBoardItemReferenceResults.map((item) => (
																<div key={item.itemId}
																	 className={styles.guildBoardReferenceResultCard}>
																	<div
																		className={styles.guildBoardReferenceResultTitleRow}>
																		<Package size={14}/>
																		<strong>{toReferenceSingleLine(item.itemName) || "-"}</strong>
																	</div>
																	<div
																		className={styles.guildBoardReferenceResultMeta}>
																		<span>
																			{[
																				toReferenceSingleLine(item.itemMainMenu ?? ""),
																				toReferenceSingleLine(item.itemSubMenu ?? ""),
																				toReferenceSingleLine(item.itemType)
																			].filter(Boolean).join(" > ") || "-"}
																		</span>
																		<span>{`등급 ${toReferenceSingleLine(item.itemRarity) || "-"} · ${toReferenceSingleLine(item.itemSource) || "-"}`}</span>
																	</div>
																	<button
																		type="button"
																		className={styles.guildBoardReferenceInsertBtn}
																		onClick={() => insertGuildBoardReferenceMarkdown(buildGuildItemReferenceMarkdown(item))}
																	>
																		본문에 삽입
																	</button>
																</div>
															))}
															{guildBoardReferenceTab === "barter" && guildBoardBarterReferenceResults.map((barter) => (
																<div
																	key={`${barter.barterId}-${barter.itemId}-${barter.exchangeId}`}
																	className={styles.guildBoardReferenceResultCard}
																>
																	<div
																		className={styles.guildBoardReferenceResultTitleRow}>
																		<ArrowLeftRight size={14}/>
																		<strong>{`${toReferenceSingleLine(barter.gameItem?.itemName) || "-"} ↔ ${toReferenceSingleLine(barter.exchangeItem?.itemName) || "-"}`}</strong>
																	</div>
																	<div
																		className={styles.guildBoardReferenceResultMeta}>
																		<span>{`${toReferenceSingleLine(barter.gameRegion?.regionName) || "-"} / ${toReferenceSingleLine(barter.gameNpc?.npcName) || "-"}`}</span>
																		<span>
																			{`교환 ${toReferenceSafeInteger(barter.exchangeCost)}개 · 최대 ${toReferenceSafeInteger(barter.barterQty)}회 · 1회 보상 x${toReferenceSafeInteger(barter.itemWeight)}`}
																		</span>
																	</div>
																	<button
																		type="button"
																		className={styles.guildBoardReferenceInsertBtn}
																		onClick={() => insertGuildBoardReferenceMarkdown(buildGuildBarterReferenceMarkdown(barter))}
																	>
																		본문에 삽입
																	</button>
																</div>
															))}
															{guildBoardReferenceTab === "craft" && guildBoardCraftReferenceResults.map((craft) => (
																<div
																	key={`${craft.craftId}-${craft.craftSubId}-${craft.itemId}`}
																	className={styles.guildBoardReferenceResultCard}
																>
																	<div
																		className={styles.guildBoardReferenceResultTitleRow}>
																		<Hammer size={14}/>
																		<strong>{toReferenceSingleLine(craft.itemName || craft.gameItem?.itemName) || "-"}</strong>
																	</div>
																	<div
																		className={styles.guildBoardReferenceResultMeta}>
																		<span>{`${toReferenceSingleLine(craft.craftType) || "-"} > ${toReferenceSingleLine(craft.craftName) || "-"}`}</span>
																		<span>{`재료 ${toReferenceSingleLine(craft.ingredientName || craft.ingredientItem?.itemName) || "-"} x${toReferenceSafeInteger(craft.craftIngredientCost)}`}</span>
																		<span>{`요구 레벨 ${craft.craftableLevel ?? "-"} · 제작 ${formatReferenceProcessingTime(craft.processingTime)}`}</span>
																	</div>
																	<button
																		type="button"
																		className={styles.guildBoardReferenceInsertBtn}
																		onClick={() => insertGuildBoardReferenceMarkdown(buildGuildCraftReferenceMarkdown(craft))}
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
											ref={guildBoardComposerTextareaRef}
											className={`${styles.textarea} ${styles.guildBoardComposerTextarea} ${styles.guildBoardComposerControl}`}
											value={guildBoardContentDraft}
											onChange={(e) => setGuildBoardContentDraft(e.target.value)}
											maxLength={4000}
											placeholder="게시글 내용을 입력해 주세요."
										/>
									</div>
								)}
							</div>
							<button
								type="submit"
								className={styles.guildBoardComposerSubmitBtn}
								disabled={creatingGuildBoardPost}
							>
								{creatingGuildBoardPost ? "작성 중..." : "작성"}
							</button>
						</form>
					)}
					{!canUploadVisibleGuildContent && isLoggedIn && visibleGuild && (
						<div className={styles.muted}>해당 길드 승인 길드원만 게시글 작성이 가능합니다.</div>
					)}
					{!isGuildBoardWriteMode && visibleGuild && (
						<div className={styles.guildBoardFilters}>
							<div className={styles.guildBoardTabs}>
								<button
									type="button"
									className={`${styles.guildBoardTab} ${selectedGuildBoardFilterCategoryId === "all" ? styles.guildBoardTabActive : ""}`}
									onClick={() => setSelectedGuildBoardFilterCategoryId("all")}
								>
									전체
								</button>
								{guildBoardCategories.map((category) => (
									<button
										key={category.id}
										type="button"
										className={`${styles.guildBoardTab} ${selectedGuildBoardFilterCategoryId === String(category.id) ? styles.guildBoardTabActive : ""}`}
										onClick={() => setSelectedGuildBoardFilterCategoryId(String(category.id))}
									>
										{category.name}
									</button>
								))}
							</div>
							<form className={styles.guildBoardSearchForm} onSubmit={handleGuildBoardSearch}>
								<input
									type="text"
									className={styles.guildBoardSearchInput}
									value={guildBoardSearchInput}
									onChange={(e) => setGuildBoardSearchInput(e.target.value)}
									placeholder="제목/내용/작성자 검색"
									maxLength={120}
								/>
								<button type="submit" className={styles.guildBoardSearchButton}>검색</button>
							</form>
						</div>
					)}
					{guildBoardError && <div className={styles.errorInline}>{guildBoardError}</div>}
					{!isGuildBoardWriteMode && (
						!visibleGuild ? (
							<div className={styles.muted}>길드를 먼저 선택해 주세요.</div>
						) : loadingGuildBoardPosts ? (
							<div className={styles.muted}>불러오는 중...</div>
						) : guildBoardPosts.length === 0 ? (
							<div className={styles.muted}>작성된 길드 게시글이 없습니다.</div>
						) : filteredGuildBoardPosts.length === 0 ? (
							<div className={styles.muted}>선택한 조건에 맞는 게시글이 없습니다.</div>
						) : (
							<BoardListTable
								columns={{title : "제목", author : "작성자", date : "날짜", right : "관리"}}
								rows={guildBoardRows}
								rightColumnWidth="wide"
							/>
						)
					)}
				</section>
			)}
			
			{isInfoSection && dashboard && canRegisterGuild && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>길드 등록</div>
					</div>
					<form onSubmit={handleRegister} className={styles.formGrid}>
						<div className={styles.field}>
							<label className={styles.label}>길드명</label>
							<input className={styles.input} value={registerName}
								   onChange={(e) => setRegisterName(e.target.value)} maxLength={120}/>
						</div>
						<div className={styles.field}>
							<label className={styles.label}>서버</label>
							<select
								className={styles.select}
								value={registerServerId}
								onChange={(e) => setRegisterServerId(e.target.value)}
							>
								<option value="">서버 선택</option>
								{GUILD_SERVER_OPTIONS.map((server) => (
									<option key={server.id} value={server.id}>{server.name}</option>
								))}
							</select>
						</div>
						<div className={`${styles.field} ${styles.fieldWide}`}>
							<label className={styles.label}>설명</label>
							<textarea className={styles.textarea} value={registerDescription}
									  onChange={(e) => setRegisterDescription(e.target.value)} maxLength={500}/>
						</div>
						<div className={`${styles.field} ${styles.fieldWide}`}>
							<div className={styles.buttonRow}>
								<button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}
										disabled={submitting}>등록 신청
								</button>
							</div>
						</div>
					</form>
				</section>
			)}
			
			{isInfoSection && dashboard && shouldShowOwnedGuildRequests && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>내 길드 신청 상태</div>
					</div>
					{dashboard.ownedGuildRequests.length === 0 ? (
						<div className={styles.muted}>등록한 길드가 없습니다.</div>
					) : (
						<div className={styles.tableWrap}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>길드명</th>
										<th>상태</th>
										<th>검토일</th>
										<th>메모</th>
									</tr>
								</thead>
								<tbody>
									{dashboard.ownedGuildRequests.map((guild) => (
										<tr key={guild.guildId}>
											<td>{guild.guildName}</td>
											<td><span className={getStatusClass(guild.status)}>{guild.status}</span>
											</td>
											<td>{formatGuildDateTime(guild.reviewedAt)}</td>
											<td title={toSingleLineText(guild.reviewNote) || undefined}>
												{toTablePreviewText(guild.reviewNote, 64)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			)}
			
			{isInfoSection && dashboard && canRequestJoin && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>길드 가입 요청</div>
					</div>
					<form onSubmit={handleJoinRequest} className={styles.formGrid}>
						<div className={styles.field}>
							<label className={styles.label}>길드</label>
							<select className={styles.select} value={joinGuildId}
									onChange={(e) => setJoinGuildId(e.target.value)}>
								{dashboard.approvedGuilds.map((guild) => (
									<option key={guild.guildId} value={guild.guildId}>{guild.guildName}</option>
								))}
							</select>
						</div>
						<div className={styles.field}>
							<label className={styles.label}>캐릭터명</label>
							<input className={styles.input} value={joinMemberName}
								   onChange={(e) => setJoinMemberName(e.target.value)} maxLength={100}/>
						</div>
						<div className={`${styles.field} ${styles.fieldWide}`}>
							<div className={styles.buttonRow}>
								<button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}
										disabled={submitting}>
									<UserPlus size={14}/>
									<span>가입 요청</span>
								</button>
							</div>
						</div>
					</form>
				</section>
			)}
			
			{isInfoSection && dashboard && dashboard.myPendingJoinRequests.length > 0 && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>내 가입 대기 요청</div>
					</div>
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>길드</th>
									<th>캐릭터명</th>
									<th>상태</th>
									<th>요청일</th>
								</tr>
							</thead>
							<tbody>
								{dashboard.myPendingJoinRequests.map((member) => (
									<tr key={member.id}>
										<td>{member.guildName}</td>
										<td>{member.memberName}</td>
										<td><span
											className={getStatusClass(member.memberStatus)}>{getMemberApprovalText(member.memberStatus)}</span>
										</td>
										<td>{formatGuildDateTime(member.createdAt)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}
			
			{isInfoSection && dashboard && dashboard.myApprovedGuild && dashboard.myMembership && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>
							<Users size={16}/>
							<span>{dashboard.myApprovedGuild.guildName} 길드원 목록 (총 {sortedGuildMembers.length}명)</span>
						</div>
						{canRefreshMemberRanks && (
							<div className={styles.buttonRow}>
								{!isMemberViewerMode && canRefreshAllMemberRanks && (
									<button
										type="button"
										className={`${styles.btn} ${styles.btnGhost}`}
										onClick={() => void handleRefreshMemberRanks()}
										disabled={isAnyRankRefreshInProgress || loading}
									>
										<RefreshCw size={14}/>
										<span>{isAnyRankRefreshInProgress ? "길드원 정보 갱신 중..." : "길드원 정보 갱신"}</span>
									</button>
								)}
								{canUseMemberViewerMode && (
									<button
										type="button"
										className={`${styles.btn} ${isMemberViewerMode ? styles.btnPrimary : styles.btnGhost}`}
										onClick={() => setMemberViewerMode((prev) => !prev)}
									>
										{isMemberViewerMode ? <EyeOff size={14}/> : <Eye size={14}/>}
										<span>{isMemberViewerMode ? "관리 모드" : "뷰어 모드"}</span>
									</button>
								)}
							</div>
						)}
					</div>
					<div className={`${styles.field} ${styles.guildSearchField}`}>
						<label className={styles.label}>길드 캐릭터명 필터</label>
						<input
							className={styles.input}
							value={guildMemberKeyword}
							onChange={(e) => setGuildMemberKeyword(e.target.value)}
							placeholder="입력할 때마다 즉시 필터링"
						/>
					</div>
					{canManageMembersInCurrentView && (
						<form onSubmit={handleCreateMember} className={styles.formGrid}>
							<div className={styles.field}>
								<label className={styles.label}>길드원 추가</label>
								<input
									className={styles.input}
									value={manualMemberName}
									onChange={(e) => setManualMemberName(e.target.value)}
									maxLength={100}
									placeholder="캐릭터명"
								/>
							</div>
							<div className={styles.field}>
								<button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}
										disabled={submitting}>
									길드원 추가
								</button>
							</div>
						</form>
					)}
					{filteredGuildMembers.length === 0 ? (
						<div className={styles.muted}>검색 조건에 맞는 길드원이 없습니다.</div>
					) : (
						<div className={styles.tableWrap}>
							<table className={`${styles.table} ${styles.memberListTable}`}>
								<thead>
									<tr>
										<th className={styles.memberListNameCol}>
											<button type="button" className={styles.sortButton}
													onClick={() => handleMemberSort("memberName", "asc")}>
												이름 <span
												className={styles.sortIndicator}>{renderMemberSortIndicator("memberName")}</span>
											</button>
										</th>
										<th className={styles.memberListServerCol}>
											<button type="button" className={styles.sortButton}
													onClick={() => handleMemberSort("serverId", "asc")}>
												서버 <span
												className={styles.sortIndicator}>{renderMemberSortIndicator("serverId")}</span>
											</button>
										</th>
										<th className={styles.memberListRoleCol}>
											<button type="button" className={styles.sortButton}
													onClick={() => handleMemberSort("guildRole", "desc")}>
												역할 <span
												className={styles.sortIndicator}>{renderMemberSortIndicator("guildRole")}</span>
											</button>
										</th>
										<th className={styles.memberListStatCol}>
											<button type="button" className={styles.sortButton}
													onClick={() => handleMemberSort("userPower", "desc")}>
												전투력 <span
												className={styles.sortIndicator}>{renderMemberSortIndicator("userPower")}</span>
											</button>
										</th>
										<th className={styles.memberListStatCol}>
											<button type="button" className={styles.sortButton}
													onClick={() => handleMemberSort("userVitality", "desc")}>
												생활력 <span
												className={styles.sortIndicator}>{renderMemberSortIndicator("userVitality")}</span>
											</button>
										</th>
										<th className={styles.memberListStatCol}>
											<button type="button" className={styles.sortButton}
													onClick={() => handleMemberSort("userAttractiveness", "desc")}>
												매력 <span
												className={styles.sortIndicator}>{renderMemberSortIndicator("userAttractiveness")}</span>
											</button>
										</th>
										<th className={styles.memberListTimeCol}>
											<button type="button" className={styles.sortButton}
													onClick={() => handleMemberSort("rankUpdatedAt", "desc")}>
												갱신시각 <span
												className={styles.sortIndicator}>{renderMemberSortIndicator("rankUpdatedAt")}</span>
											</button>
										</th>
										{showActionColumn && <th className={styles.memberListActionCol}>관리</th>}
										{canManageMembersInCurrentView && (
											<th className={styles.memberListStatusCol}>
												<button type="button" className={styles.sortButton}
														onClick={() => handleMemberSort("memberStatus", "desc")}>
													승인여부 <span
													className={styles.sortIndicator}>{renderMemberSortIndicator("memberStatus")}</span>
												</button>
											</th>
										)}
									</tr>
								</thead>
								<tbody>
									{filteredGuildMembers.map((member, index) => {
										const isMyMember = isMyGuildMember(member);
										return (
											<tr key={member.id}>
												<td className={styles.memberListNameCol}>
													<div className={styles.memberNameCell}>
														<span className={styles.rowNumber}>{index + 1}.</span>
														<span>{member.memberName}</span>
														{isMyMember && (
															<span className={styles.myBadge}>
															<UserIcon size={12}/>
															<span>나</span>
														</span>
														)}
													</div>
												</td>
												<td className={styles.memberListServerCol}>{getGuildServerName(member.serverId)}</td>
												<td className={styles.memberListRoleCol}>{getGuildRoleLabel(member.guildRole)}</td>
												<td className={`${styles.statCell} ${styles.memberListStatCol}`}>{member.userPower ?? "-"}</td>
												<td className={`${styles.statCell} ${styles.memberListStatCol}`}>{member.userVitality ?? "-"}</td>
												<td className={`${styles.statCell} ${styles.memberListStatCol}`}>{member.userAttractiveness ?? "-"}</td>
												<td className={`${styles.timeCell} ${styles.memberListTimeCol}`}>{formatGuildDateTime(member.rankUpdatedAt)}</td>
												{showActionColumn && (
													<td className={`${styles.actionCell} ${styles.memberListActionCol}`}>
														{canManageMembersInCurrentView ? (
															<div className={styles.inline}>
																<select
																	className={styles.select}
																	value={normalizeGuildRole(roleDrafts[member.id] ?? member.guildRole)}
																	onChange={(e) => setRoleDrafts((prev) => ({
																		...prev,
																		[member.id] : Number(e.target.value) as GuildRole
																	}))}
																>
																	<option value={0}>길드원</option>
																	<option value={1}>부마스터</option>
																	<option value={2}>마스터</option>
																</select>
																<button
																	type="button"
																	className={`${styles.btn} ${styles.btnGhost}`}
																	onClick={() => handleRoleUpdate(member)}
																	disabled={pendingIds.has(member.id)}
																>
																	<Settings size={13}/>
																	<span>적용</span>
																</button>
																<button
																	type="button"
																	className={`${styles.btn} ${styles.btnGhost}`}
																	onClick={() => handleUpdateMemberInfo(member)}
																	disabled={pendingIds.has(member.id)}
																>
																	정보수정
																</button>
																{canRefreshAllMemberRanks && (
																	<button
																		type="button"
																		className={`${styles.btn} ${styles.btnGhost}`}
																		onClick={() => void handleRefreshSingleMemberRank(member)}
																		disabled={pendingIds.has(member.id) || isAnyRankRefreshInProgress}
																		title={
																			refreshingMemberIds.has(member.id)
																				? "갱신 중"
																				: (isAnyRankRefreshInProgress ? "다른 갱신 진행 중" : "개별 갱신")
																		}
																		aria-label={
																			refreshingMemberIds.has(member.id)
																				? "갱신 중"
																				: (isAnyRankRefreshInProgress ? "다른 갱신 진행 중" : "개별 갱신")
																		}
																	>
																		{refreshingMemberIds.has(member.id)
																			? <Loader2 size={13}
																					   className={styles.spinningIcon}/>
																			: <RefreshCw size={13}/>}
																	</button>
																)}
																<button
																	type="button"
																	className={`${styles.btn} ${styles.btnDanger}`}
																	onClick={() => handleDeleteMember(member)}
																	disabled={pendingIds.has(member.id)}
																>
																	삭제
																</button>
															</div>
														) : (
															<div className={styles.inline}>
																{isMyMember ? (
																	<button
																		type="button"
																		className={`${styles.btn} ${styles.btnGhost}`}
																		onClick={() => void handleRefreshSingleMemberRank(member)}
																		disabled={pendingIds.has(member.id) || isAnyRankRefreshInProgress}
																		title={
																			refreshingMemberIds.has(member.id)
																				? "갱신 중"
																				: (isAnyRankRefreshInProgress ? "다른 갱신 진행 중" : "내 정보 갱신")
																		}
																		aria-label={
																			refreshingMemberIds.has(member.id)
																				? "갱신 중"
																				: (isAnyRankRefreshInProgress ? "다른 갱신 진행 중" : "내 정보 갱신")
																		}
																	>
																		{refreshingMemberIds.has(member.id)
																			? <Loader2 size={13}
																					   className={styles.spinningIcon}/>
																			: <RefreshCw size={13}/>}
																	</button>
																) : (
																	<span className={styles.muted}>-</span>
																)}
															</div>
														)}
													</td>
												)}
												{canManageMembersInCurrentView && (
													<td className={styles.memberListStatusCol}>
														<span className={getStatusClass(member.memberStatus)}>
															{getMemberApprovalText(member.memberStatus)}
														</span>
													</td>
												)}
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</section>
			)}
			
			{isInfoSection && dashboard && canManageMembersInCurrentView && dashboard.pendingGuildMembers.length > 0 && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>길드 가입 승인 대기</div>
					</div>
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>캐릭터명</th>
									<th>서버</th>
									<th>요청일</th>
									<th>처리</th>
								</tr>
							</thead>
							<tbody>
								{dashboard.pendingGuildMembers.map((member) => (
									<tr key={member.id}>
										<td>{member.memberName}</td>
										<td>{getGuildServerName(member.serverId)}</td>
										<td>{formatGuildDateTime(member.createdAt)}</td>
										<td>
											<div className={styles.buttonRow}>
												<button
													type="button"
													className={`${styles.btn} ${styles.btnPrimary}`}
													onClick={() => handleApproveMember(member)}
													disabled={pendingIds.has(member.id)}
												>
													승인
												</button>
												<button
													type="button"
													className={`${styles.btn} ${styles.btnDanger}`}
													onClick={() => handleRejectMember(member)}
													disabled={pendingIds.has(member.id)}
												>
													반려
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}
			
			{isInfoSection && dashboard?.isAdmin && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>
							<Crown size={16}/>
							<span>관리자 길드 승인</span>
						</div>
					</div>
					{dashboard.adminPendingGuilds.length === 0 ? (
						<div className={styles.muted}>승인 대기 중인 길드가 없습니다.</div>
					) : (
						<div className={styles.tableWrap}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>길드명</th>
										<th>등록자</th>
										<th>설명</th>
										<th>신청일</th>
										<th>처리</th>
									</tr>
								</thead>
								<tbody>
									{dashboard.adminPendingGuilds.map((guild) => (
										<tr key={guild.guildId}>
											<td>{guild.guildName}</td>
											<td>{guild.ownerNickname || guild.ownerUserId}</td>
											<td title={toSingleLineText(guild.description) || undefined}>
												{toTablePreviewText(guild.description, 64)}
											</td>
											<td>{formatGuildDateTime(guild.createdAt)}</td>
											<td>
												<div className={styles.buttonRow}>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnPrimary}`}
														onClick={() => handleApproveGuild(guild.guildId)}
														disabled={pendingIds.has(guild.guildId)}
													>
														승인
													</button>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnDanger}`}
														onClick={() => handleRejectGuild(guild.guildId)}
														disabled={pendingIds.has(guild.guildId)}
													>
														반려
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			)}
			
			{isInfoSection && !user && (
				<section className={styles.section}>
					<div className={styles.muted}>비로그인 상태에서는 길드 정보만 표시됩니다. 길드원 목록은 로그인 후 길드원 등록 사용자에게만 표시됩니다.</div>
				</section>
			)}
		</div>
	);
};

export default GuildManagementPage;
