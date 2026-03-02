import React, {useEffect, useState} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import type {BoardCategory, BoardPost} from "@/types";
import {boardService} from "@/services/board-service";
import {useAuth} from "@/hooks/use-auth";
import {useSeo} from "@/hooks/use-seo";
import {createBoardPostPath} from "@/utils/board-url";
import BoardListTable, {type BoardListTableRow} from "@/components/board/board-list-table";
import styles from "./board-list.module.scss";

/**
 * Utility function toPlainText.
 */
const toPlainText = (value:string):string => {
	return value
		.replace(/!\[[^\]]*]\([^)]+\)/g, " ")
		.replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
		.replace(/`{1,3}[^`]*`{1,3}/g, " ")
		.replace(/<[^>]*>/g, " ")
		.replace(/[#>*_~\-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
};

/**
 * Utility function toSeoDescription.
 */
const toSeoDescription = (value:string):string => {
	const text = toPlainText(value);
	if(!text){
		return "게시판 최신 글과 커뮤니티 소식을 확인하세요.";
	}
	return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

const BoardListPage:React.FC = () => {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const {user} = useAuth();

	const [categories, setCategories] = useState<BoardCategory[]>([]);
	const [posts, setPosts] = useState<BoardPost[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalPages, setTotalPages] = useState(0);

	const selectedCategory = searchParams.get("category") ? parseInt(searchParams.get("category")!, 10) : null;
	const searchKeyword = searchParams.get("keyword") || "";
	const currentPage = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 0;

	const latestPost = posts[0] ?? null;
	const seoTitle = latestPost
		? `게시판 | ${latestPost.title}`
		: "게시판";
	const seoDescription = latestPost
		? toSeoDescription(latestPost.content || latestPost.title)
		: searchKeyword
			? `'${searchKeyword}' 게시글 검색 결과입니다.`
			: "Sexynogi 게시판 최신 글을 확인하세요.";

	useSeo({
		title : seoTitle,
		description : seoDescription,
		canonicalPath : "/board"
	});

	const [keywordInput, setKeywordInput] = useState(searchKeyword);

	useEffect(() => {
		void loadCategories();
	}, []);

	useEffect(() => {
		void loadPosts();
	}, [selectedCategory, searchKeyword, currentPage]);

	/**
	 * Utility function async.
	 */
	const loadCategories = async() => {
		try{
			const data = await boardService.getCategories();
			setCategories(data);
		}catch(err){
			console.error("카테고리 로드 실패:", err);
		}
	};

	/**
	 * Utility function async.
	 */
	const loadPosts = async() => {
		try{
			setLoading(true);
			const data = await boardService.getPosts(
				currentPage,
				20,
				selectedCategory,
				searchKeyword || null
			);
			setPosts(data.content);
			setTotalPages(data.totalPages);
		}catch(err){
			console.error("게시글 로드 실패:", err);
		}finally{
			setLoading(false);
		}
	};

	/**
	 * Utility function updateParams.
	 */
	const updateParams = (updates:Record<string, string | null>) => {
		const params:Record<string, string> = {};
		const current = Object.fromEntries(searchParams.entries());

		for(const [key, value] of Object.entries(current)){
			if(value){
				params[key] = value;
			}
		}

		for(const [key, value] of Object.entries(updates)){
			if(value === null){
				delete params[key];
			}else{
				params[key] = value;
			}
		}

		if(!("page" in updates)){
			delete params.page;
		}

		setSearchParams(params);
	};

	/**
	 * Utility function handleSearch.
	 */
	const handleSearch = (e:React.FormEvent) => {
		e.preventDefault();
		updateParams({keyword : keywordInput.trim() || null, page : null});
	};

	/**
	 * Utility function handlePostClick.
	 */
	const handlePostClick = (post:BoardPost) => {
		navigate(createBoardPostPath(post.title), {state : {postId : post.postId}});
	};

	/**
	 * Utility function formatDate.
	 */
	const formatDate = (dateString:string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if(days < 1){
			return date.toLocaleTimeString("ko-KR", {hour : "2-digit", minute : "2-digit"});
		}
		return date.toLocaleDateString("ko-KR", {month : "short", day : "numeric"});
	};

	const boardRows:BoardListTableRow[] = posts.map((post, index) => ({
		key : post.postId ?? `post-${index}`,
		categoryLabel : post.categoryName || null,
		title : post.title,
		titleBadges : (
			<>
				{post.isWiki && <span className={`${styles.badge} ${styles.wiki}`}>위키</span>}
			</>
		),
		titleTrailing : post.commentCount > 0 ? <span className={styles.commentCount}>[{post.commentCount}]</span> : null,
		author : post.authorNickname || "익명",
		date : formatDate(post.createdAt),
		right : post.viewCount,
		onClick : () => handlePostClick(post),
		hideRightOnMobile : true
	}));

	return (
		<div className={styles.boardPage}>
			<div className={styles.container}>
				<div className={styles.pageHero}>
					<h1 className="page-heading">게시판</h1>
					{user && (
						<button className={styles.writeBtn} onClick={() => navigate("/board/write")}>
							글쓰기
						</button>
					)}
				</div>

				<div className={styles.filters}>
					<div className={styles.categoryTabs}>
						<button
							className={`${styles.tab} ${selectedCategory === null ? styles.active : ""}`}
							onClick={() => updateParams({category : null, source : null})}
						>
							전체
						</button>
						{categories.map((category) => (
							<button
								key={category.categoryId}
								className={`${styles.tab} ${selectedCategory === category.categoryId ? styles.active : ""}`}
								onClick={() => updateParams({category : category.categoryId.toString(), source : null})}
							>
								{category.categoryName}
							</button>
						))}
					</div>

					<form className={styles.searchForm} onSubmit={handleSearch}>
						<input
							type="text"
							placeholder="검색..."
							value={keywordInput}
							onChange={(e) => setKeywordInput(e.target.value)}
							className={styles.searchInput}
						/>
						<button type="submit" className={styles.searchBtn}>검색</button>
					</form>
				</div>

				{loading ? (
					<div className={styles.loading}>로딩 중...</div>
				) : posts.length === 0 ? (
					<div className={styles.empty}>게시글이 없습니다.</div>
				) : (
					<>
						<BoardListTable
							columns={{title : "제목", author : "작성자", date : "날짜", right : "조회"}}
							rows={boardRows}
							rightColumnWidth="narrow"
						/>

						{totalPages > 1 && (
							<div className={styles.pagination}>
								<button
									disabled={currentPage === 0}
									onClick={() => updateParams({page : (currentPage - 1).toString()})}
									className={styles.pageBtn}
								>
									이전
								</button>
								<span className={styles.pageInfo}>{currentPage + 1} / {totalPages}</span>
								<button
									disabled={currentPage >= totalPages - 1}
									onClick={() => updateParams({page : (currentPage + 1).toString()})}
									className={styles.pageBtn}
								>
									다음
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default BoardListPage;
