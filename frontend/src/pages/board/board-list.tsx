import React, {useEffect, useState} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import type {BoardCategory, BoardPost} from "@/types";
import {boardService} from "@/services/board-service";
import {useAuth} from "@/hooks/use-auth";
import {useSeo} from "@/hooks/use-seo";
import {createBoardPostPath} from "@/utils/board-url";
import styles from "./board-list.module.scss";

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
	const selectedSource = searchParams.get("source") || null;
	const searchKeyword = searchParams.get("keyword") || "";
	const currentPage = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 0;

	const latestPost = posts[0] ?? null;
	const seoTitle = latestPost
		? `게시판 | ${latestPost.title}`
		: selectedSource === "DISCORD"
			? "게시판 - 디스코드"
			: "게시판";
	const seoDescription = latestPost
		? toSeoDescription(latestPost.content || latestPost.title)
		: searchKeyword
			? `'${searchKeyword}' 게시글 검색 결과입니다.`
			: "Sexynogi 게시판에서 유저 글과 디스코드 연동 글을 확인하세요.";

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
	}, [selectedCategory, selectedSource, searchKeyword, currentPage]);

	const loadCategories = async() => {
		try{
			const data = await boardService.getCategories();
			setCategories(data);
		}catch(err){
			console.error("카테고리 로드 실패:", err);
		}
	};

	const loadPosts = async() => {
		try{
			setLoading(true);
			const data = await boardService.getPosts(
				currentPage,
				20,
				selectedCategory,
				selectedSource,
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

	const handleSearch = (e:React.FormEvent) => {
		e.preventDefault();
		updateParams({keyword : keywordInput.trim() || null, page : null});
	};

	const handlePostClick = (post:BoardPost) => {
		if(post.sourceType !== "USER"){
			navigate("/board/external", {state : {post}});
			return;
		}
		navigate(createBoardPostPath(post.title), {state : {postId : post.postId}});
	};

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

	const getSourceBadge = (sourceType:string) => {
		if(sourceType === "DISCORD"){
			return <span className={`${styles.badge} ${styles.discord}`}>Discord</span>;
		}
		return null;
	};

	return (
		<div className={styles.boardPage}>
			<div className={styles.container}>
				<div className={styles.pageHero}>
					<div className="page-heading">
						<h1>게시판</h1>
						<p>자유 글, 위키, Discord 연동 글을 한곳에서 확인하세요.</p>
					</div>
					{user && (
						<button className={styles.writeBtn} onClick={() => navigate("/board/write")}>
							글쓰기
						</button>
					)}
				</div>

				<div className={styles.filters}>
					<div className={styles.categoryTabs}>
						<button
							className={`${styles.tab} ${selectedCategory === null && selectedSource === null ? styles.active : ""}`}
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
						<button
							className={`${styles.tab} ${styles.discordTab} ${selectedSource === "DISCORD" ? styles.active : ""}`}
							onClick={() => updateParams({source : "DISCORD", category : null})}
						>
							Discord
						</button>
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
						<div className={styles.postList}>
							<div className={styles.listHeader}>
								<span className={styles.colTitle}>제목</span>
								<span className={styles.colAuthor}>작성자</span>
								<span className={styles.colDate}>날짜</span>
								<span className={styles.colViews}>조회</span>
							</div>
							{posts.map((post, index) => (
								<div
									key={post.postId ?? `external-${index}`}
									className={styles.postRow}
									onClick={() => handlePostClick(post)}
								>
									<div className={styles.colTitle}>
										{post.categoryName && (
											<span className={styles.categoryTag}>[{post.categoryName}]</span>
										)}
										<span className={styles.title}>{post.title}</span>
										{post.isWiki && <span className={`${styles.badge} ${styles.wiki}`}>위키</span>}
										{getSourceBadge(post.sourceType)}
										{post.commentCount > 0 && (
											<span className={styles.commentCount}>[{post.commentCount}]</span>
										)}
									</div>
									<div className={styles.rowMeta}>
										<span className={styles.colAuthor}>
											{post.authorNickname || post.externalAuthor || "익명"}
										</span>
										<span className={styles.colDate}>{formatDate(post.createdAt)}</span>
										<span className={styles.colViews}>{post.viewCount}</span>
									</div>
								</div>
							))}
						</div>

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
