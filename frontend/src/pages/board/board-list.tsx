import React, {useState, useEffect} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import type {BoardPost, BoardCategory} from "@/types";
import {boardService} from "@/services/board-service";
import {useAuth} from "@/hooks/use-auth";
import styles from "./board-list.module.scss";

const BoardListPage:React.FC = () => {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const {user} = useAuth();
	
	const [categories, setCategories] = useState<BoardCategory[]>([]);
	const [posts, setPosts] = useState<BoardPost[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalPages, setTotalPages] = useState(0);
	
	const selectedCategory = searchParams.get("category") ? parseInt(searchParams.get("category")!) : null;
	const selectedSource = searchParams.get("source") || null;
	const searchKeyword = searchParams.get("keyword") || "";
	const currentPage = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 0;
	
	const [keywordInput, setKeywordInput] = useState(searchKeyword);
	
	useEffect(() => {
		loadCategories();
	}, []);
	
	useEffect(() => {
		loadPosts();
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
			
			if(selectedSource === "DISCORD"){
				// Discord 캐시에서 로드
				const discordPosts = await boardService.getDiscordPosts();
				setPosts(discordPosts);
				setTotalPages(1);
			}else if(selectedCategory || searchKeyword){
				// 카테고리 필터 또는 검색 → DB만
				const data = await boardService.getPosts(
					currentPage, 20, selectedCategory, null, searchKeyword || null
				);
				setPosts(data.content);
				setTotalPages(data.totalPages);
			}else{
				// 전체: DB(USER) + Discord 캐시 병합
				const [dbData, discordPosts] = await Promise.all([
					boardService.getPosts(currentPage, 20),
					boardService.getDiscordPosts()
				]);
				
				// DB 게시글 + 외부 캐시 병합 후 작성일 내림차순 정렬
				const allPosts = [...dbData.content, ...discordPosts];
				allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				
				setPosts(allPosts);
				setTotalPages(1);
			}
		}catch(err){
			console.error("게시글 로드 실패:", err);
		}finally{
			setLoading(false);
		}
	};
	
	const updateParams = (updates:Record<string, string | null>) => {
		const params:Record<string, string> = {};
		const current = Object.fromEntries(searchParams.entries());
		
		// 기존 파라미터 유지
		for(const [key, value] of Object.entries(current)){
			if(value) params[key] = value;
		}
		
		// 업데이트 적용
		for(const [key, value] of Object.entries(updates)){
			if(value === null){
				delete params[key];
			}else{
				params[key] = value;
			}
		}
		
		// 필터 변경 시 페이지 초기화
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
			// 외부 게시글은 state로 데이터 전달
			navigate("/board/external", {state : {post}});
			return;
		}
		navigate(`/board/${post.postId}`);
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
		if(sourceType === "DISCORD") return <span className={`${styles.badge} ${styles.discord}`}>Discord</span>;
		return null;
	};
	
	return (
		<div className={styles.boardPage}>
			<div className={styles.container}>
				<div className={styles.header}>
					<h2 className={styles.pageTitle}>게시판</h2>
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
						{categories.map(cat => (
							<button
								key={cat.categoryId}
								className={`${styles.tab} ${selectedCategory === cat.categoryId ? styles.active : ""}`}
								onClick={() => updateParams({category : cat.categoryId.toString(), source : null})}
							>
								{cat.categoryName}
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
									<span className={styles.colAuthor}>
										{post.authorNickname || post.externalAuthor || "익명"}
									</span>
									<span className={styles.colDate}>{formatDate(post.createdAt)}</span>
									<span className={styles.colViews}>{post.viewCount}</span>
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
