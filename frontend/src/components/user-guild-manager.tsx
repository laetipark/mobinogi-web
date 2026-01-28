import React, {useState, useEffect, useMemo} from "react";
import {
	Users,
	Briefcase,
	Shield,
	Trophy,
	Search,
	RefreshCw,
	Settings,
	ChevronDown,
	Filter,
	SortAsc,
	SortDesc
} from "lucide-react";
import {UserGuild, ViewMode, ViewModeConfig, JobGroup, CategoryGroup} from "../types/user-guild.ts";
import {userGuildService} from "../services/user-guild-service.ts";
import "./user-guild-manager.scss";

const UserGuildManager:React.FC = () => {
	// State management
	const [userGuilds, setUserGuilds] = useState<UserGuild[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentView, setCurrentView] = useState<ViewMode>("table");
	const [sortBy, setSortBy] = useState("memberName");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	const [selectedJob, setSelectedJob] = useState<string | null>(null);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	
	// View mode configurations
	const viewModes:ViewModeConfig[] = [
		{
			id : "table",
			title : "전체 캐릭터",
			description : "멤버명/직업/계열 표형태",
			icon : "Users"
		},
		{
			id : "jobBoard",
			title : "직업별 분류",
			description : "직업 그룹화 보드",
			icon : "Briefcase"
		},
		{
			id : "categoryBoard",
			title : "계열별 분류",
			description : "계열 그룹화 보드",
			icon : "Shield"
		},
		{
			id : "rankingTable",
			title : "공헌도 순위",
			description : "멤버명/변화량 랭킹",
			icon : "Trophy"
		}
	];
	
	// Data loading
	useEffect(() => {
		loadUserGuilds();
	}, [sortBy, sortDir]);
	
	const loadUserGuilds = async() => {
		setLoading(true);
		setError(null);
		try{
			const response = await userGuildService.getAllUserGuilds(0, 1000, sortBy, sortDir);
			setUserGuilds(response.content);
		}catch(err){
			setError("데이터를 불러오는데 실패했습니다.");
			console.error(err);
		}finally{
			setLoading(false);
		}
	};
	
	// Filtered data based on search
	const filteredUserGuilds = useMemo(() => {
		if(!searchTerm) return userGuilds;
		
		return userGuilds.filter(guild =>
			guild.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			guild.jobClass?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			guild.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			guild.subCharacter?.toLowerCase().includes(searchTerm.toLowerCase())
		);
	}, [userGuilds, searchTerm]);
	
	// Group data by job class
	const jobGroups = useMemo(():JobGroup[] => {
		const groups = filteredUserGuilds.reduce((acc, guild) => {
			const job = guild.jobClass || "미분류";
			if(!acc[job]){
				acc[job] = [];
			}
			acc[job].push(guild);
			return acc;
		}, {} as Record<string, UserGuild[]>);
		
		return Object.entries(groups).map(([jobClass, members]) => ({
			jobClass,
			members : members.sort((a, b) => a.memberName.localeCompare(b.memberName)),
			count : members.length
		})).sort((a, b) => b.count - a.count);
	}, [filteredUserGuilds]);
	
	// Group data by category
	const categoryGroups = useMemo(():CategoryGroup[] => {
		const groups = filteredUserGuilds.reduce((acc, guild) => {
			const category = guild.category || "미분류";
			if(!acc[category]){
				acc[category] = [];
			}
			acc[category].push(guild);
			return acc;
		}, {} as Record<string, UserGuild[]>);
		
		return Object.entries(groups).map(([category, members]) => ({
			category,
			members : members.sort((a, b) => a.memberName.localeCompare(b.memberName)),
			count : members.length
		})).sort((a, b) => b.count - a.count);
	}, [filteredUserGuilds]);
	
	// Ranking data (sorted by contribution change)
	const rankingData = useMemo(() => {
		return [...filteredUserGuilds].filter(guild => guild.contributionChanged !== null).sort((a, b) => {
			const aChange = a.contributionChanged || 0;
			const bChange = b.contributionChanged || 0;
			return bChange - aChange;
		});
	}, [filteredUserGuilds]);
	
	// Event handlers
	const handleViewChange = (view:ViewMode) => {
		setCurrentView(view);
		setSelectedJob(null);
		setSelectedCategory(null);
	};
	
	const handleSort = (field:string) => {
		if(sortBy === field){
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		}else{
			setSortBy(field);
			setSortDir("asc");
		}
	};
	
	const handleRefresh = () => {
		loadUserGuilds();
	};
	
	const getIconComponent = (iconName:string) => {
		const iconMap = {
			Users,
			Briefcase,
			Shield,
			Trophy
		};
		return iconMap[iconName as keyof typeof iconMap] || Users;
	};
	
	const formatNumber = (num:number | null):string => {
		if(num === null || num === undefined) return "-";
		return num.toLocaleString();
	};
	
	const renderSortIcon = (field:string) => {
		if(sortBy !== field) return null;
		return sortDir === "asc" ? <SortAsc className="w-4 h-4"/> : <SortDesc className="w-4 h-4"/>;
	};
	
	return (
		<div className="user-guild-manager">
			{/* Header */}
			<div className="guild-header">
				<div className="guild-title">
					<h1>길드원 관리</h1>
					<p>총 {userGuilds.length}명의 길드원</p>
				</div>
				
				<div className="guild-actions">
					<button onClick={handleRefresh} disabled={loading} className="refresh-btn">
						<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}/>
						새로고침
					</button>
					<button className="settings-btn">
						<Settings className="w-4 h-4"/>
					</button>
				</div>
			</div>
			
			{/* Search and Filter Bar */}
			<div className="guild-search-bar">
				<div className="search-input-wrapper">
					<Search className="search-icon w-5 h-5"/>
					<input
						type="text"
						placeholder="멤버명, 직업, 계열로 검색..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="search-input"
					/>
				</div>
				
				<div className="view-mode-selector">
					{viewModes.map((mode) => {
						const IconComponent = getIconComponent(mode.icon);
						return (
							<button
								key={mode.id}
								onClick={() => handleViewChange(mode.id)}
								className={`view-mode-btn ${currentView === mode.id ? "active" : ""}`}
								title={mode.description}
							>
								<IconComponent className="w-4 h-4"/>
								<span>{mode.title}</span>
							</button>
						);
					})}
				</div>
			</div>
			
			{/* Error Display */}
			{error && (
				<div className="error-message">
					<p>{error}</p>
					<button onClick={handleRefresh}>다시 시도</button>
				</div>
			)}
			
			{/* Loading State */}
			{loading && (
				<div className="loading-state">
					<RefreshCw className="w-6 h-6 animate-spin"/>
					<span>데이터를 불러오는 중...</span>
				</div>
			)}
			
			{/* Content based on view mode */}
			{!loading && !error && (
				<div className="guild-content">
					{currentView === "table" && (
						<TableView
							userGuilds={filteredUserGuilds}
							sortBy={sortBy}
							sortDir={sortDir}
							onSort={handleSort}
							renderSortIcon={renderSortIcon}
							formatNumber={formatNumber}
						/>
					)}
					
					{currentView === "jobBoard" && (
						<JobBoardView
							jobGroups={jobGroups}
							selectedJob={selectedJob}
							onJobSelect={setSelectedJob}
							formatNumber={formatNumber}
						/>
					)}
					
					{currentView === "categoryBoard" && (
						<CategoryBoardView
							categoryGroups={categoryGroups}
							selectedCategory={selectedCategory}
							onCategorySelect={setSelectedCategory}
							formatNumber={formatNumber}
						/>
					)}
					
					{currentView === "rankingTable" && (
						<RankingTableView
							rankingData={rankingData}
							formatNumber={formatNumber}
						/>
					)}
				</div>
			)}
		</div>
	);
};

// Table View Component
const TableView:React.FC<{
	userGuilds:UserGuild[];
	sortBy:string;
	sortDir:"asc" | "desc";
	onSort:(field:string) => void;
	renderSortIcon:(field:string) => React.ReactNode;
	formatNumber:(num:number | null) => string;
}> = ({userGuilds, sortBy, sortDir, onSort, renderSortIcon, formatNumber}) => (
	<div className="table-view">
		<div className="table-container">
			<table className="guild-table">
				<thead>
					<tr>
						<th onClick={() => onSort("memberName")} className="sortable">
							멤버명 {renderSortIcon("memberName")}
						</th>
						<th onClick={() => onSort("jobClass")} className="sortable">
							직업 {renderSortIcon("jobClass")}
						</th>
						<th onClick={() => onSort("category")} className="sortable">
							계열 {renderSortIcon("category")}
						</th>
						<th onClick={() => onSort("contributionStart")} className="sortable">
							시작 기여도 {renderSortIcon("contributionStart")}
						</th>
						<th onClick={() => onSort("contributionFinish")} className="sortable">
							마무리 기여도 {renderSortIcon("contributionFinish")}
						</th>
						<th onClick={() => onSort("contributionChanged")} className="sortable">
							변화량 {renderSortIcon("contributionChanged")}
						</th>
						<th>부캐릭터</th>
					</tr>
				</thead>
				<tbody>
					{userGuilds.map((guild) => (
						<tr key={guild.id} className="guild-row">
							<td className="member-name">
								<div className="member-info">
									<span className="name">{guild.memberName}</span>
									{guild.textInfo && (
										<span className="text-info" title={guild.textInfo}>
                      💬
                    </span>
									)}
								</div>
							</td>
							<td>
                <span className={`job-badge ${guild.jobClass?.toLowerCase().replace(/\s+/g, "-")}`}>
                  {guild.jobClass || "-"}
                </span>
							</td>
							<td>
                <span className={`category-badge ${guild.category?.toLowerCase().replace(/\s+/g, "-")}`}>
                  {guild.category || "-"}
                </span>
							</td>
							<td className="number">{formatNumber(guild.contributionStart)}</td>
							<td className="number">{formatNumber(guild.contributionFinish)}</td>
							<td className={`number change ${(guild.contributionChanged || 0) >= 0 ? "positive" : "negative"}`}>
								{guild.contributionChanged !== null ? (
									<>
										{guild.contributionChanged >= 0 ? "+" : ""}{formatNumber(guild.contributionChanged)}
									</>
								) : "-"}
							</td>
							<td className="sub-character">{guild.subCharacter || "-"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	</div>
);

// Job Board View Component
const JobBoardView:React.FC<{
	jobGroups:JobGroup[];
	selectedJob:string | null;
	onJobSelect:(job:string | null) => void;
	formatNumber:(num:number | null) => string;
}> = ({jobGroups, selectedJob, onJobSelect, formatNumber}) => (
	<div className="job-board-view">
		<div className="board-container">
			{jobGroups.map((group) => (
				<div
					key={group.jobClass}
					className={`job-group-card ${selectedJob === group.jobClass ? "expanded" : ""}`}
				>
					<div
						className="group-header"
						onClick={() => onJobSelect(selectedJob === group.jobClass ? null : group.jobClass)}
					>
						<h3>{group.jobClass}</h3>
						<span className="member-count">{group.count}명</span>
						<ChevronDown className={`expand-icon ${selectedJob === group.jobClass ? "rotated" : ""}`}/>
					</div>
					
					{selectedJob === group.jobClass && (
						<div className="group-members">
							{group.members.map((member) => (
								<div key={member.id} className="member-card">
									<div className="member-header">
										<span className="member-name">{member.memberName}</span>
										<span
											className={`category-tag ${member.category?.toLowerCase().replace(/\s+/g, "-")}`}>
                      {member.category}
                    </span>
									</div>
									<div className="member-stats">
										<div className="stat">
											<label>시작:</label>
											<span>{formatNumber(member.contributionStart)}</span>
										</div>
										<div className="stat">
											<label>마무리:</label>
											<span>{formatNumber(member.contributionFinish)}</span>
										</div>
										<div className="stat">
											<label>변화량:</label>
											<span
												className={`change ${(member.contributionChanged || 0) >= 0 ? "positive" : "negative"}`}>
                        {member.contributionChanged !== null ? (
							<>
								{member.contributionChanged >= 0 ? "+" : ""}{formatNumber(member.contributionChanged)}
							</>
						) : "-"}
                      </span>
										</div>
									</div>
									{member.subCharacter && (
										<div className="sub-character">부캐: {member.subCharacter}</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	</div>
);

// Category Board View Component
const CategoryBoardView:React.FC<{
	categoryGroups:CategoryGroup[];
	selectedCategory:string | null;
	onCategorySelect:(category:string | null) => void;
	formatNumber:(num:number | null) => string;
}> = ({categoryGroups, selectedCategory, onCategorySelect, formatNumber}) => (
	<div className="category-board-view">
		<div className="board-container">
			{categoryGroups.map((group) => (
				<div
					key={group.category}
					className={`category-group-card ${selectedCategory === group.category ? "expanded" : ""}`}
				>
					<div
						className="group-header"
						onClick={() => onCategorySelect(selectedCategory === group.category ? null : group.category)}
					>
						<h3>{group.category}</h3>
						<span className="member-count">{group.count}명</span>
						<ChevronDown className={`expand-icon ${selectedCategory === group.category ? "rotated" : ""}`}/>
					</div>
					
					{selectedCategory === group.category && (
						<div className="group-members">
							{group.members.map((member) => (
								<div key={member.id} className="member-card">
									<div className="member-header">
										<span className="member-name">{member.memberName}</span>
										<span
											className={`job-tag ${member.jobClass?.toLowerCase().replace(/\s+/g, "-")}`}>
                      {member.jobClass}
                    </span>
									</div>
									<div className="member-stats">
										<div className="stat">
											<label>시작:</label>
											<span>{formatNumber(member.contributionStart)}</span>
										</div>
										<div className="stat">
											<label>마무리:</label>
											<span>{formatNumber(member.contributionFinish)}</span>
										</div>
										<div className="stat">
											<label>변화량:</label>
											<span
												className={`change ${(member.contributionChanged || 0) >= 0 ? "positive" : "negative"}`}>
                        {member.contributionChanged !== null ? (
							<>
								{member.contributionChanged >= 0 ? "+" : ""}{formatNumber(member.contributionChanged)}
							</>
						) : "-"}
                      </span>
										</div>
									</div>
									{member.subCharacter && (
										<div className="sub-character">부캐: {member.subCharacter}</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	</div>
);

// Ranking Table View Component
const RankingTableView:React.FC<{
	rankingData:UserGuild[];
	formatNumber:(num:number | null) => string;
}> = ({rankingData, formatNumber}) => (
	<div className="ranking-table-view">
		<div className="ranking-header">
			<h2>공헌도 변화량 순위</h2>
			<p>기여도가 가장 많이 늘어난 순서대로 정렬</p>
		</div>
		
		<div className="table-container">
			<table className="ranking-table">
				<thead>
					<tr>
						<th className="rank">순위</th>
						<th>멤버명</th>
						<th>직업</th>
						<th>계열</th>
						<th>시작 기여도</th>
						<th>마무리 기여도</th>
						<th className="change-column">변화량</th>
					</tr>
				</thead>
				<tbody>
					{rankingData.map((guild, index) => (
						<tr key={guild.id} className={`ranking-row rank-${index + 1}`}>
							<td className="rank">
								<div className="rank-badge">
									{index + 1}
									{index === 0 && <span className="medal gold">🥇</span>}
									{index === 1 && <span className="medal silver">🥈</span>}
									{index === 2 && <span className="medal bronze">🥉</span>}
								</div>
							</td>
							<td className="member-name">
								<div className="member-info">
									<span className="name">{guild.memberName}</span>
									{guild.textInfo && (
										<span className="text-info" title={guild.textInfo}>💬</span>
									)}
								</div>
							</td>
							<td>
                <span className={`job-badge ${guild.jobClass?.toLowerCase().replace(/\s+/g, "-")}`}>
                  {guild.jobClass || "-"}
                </span>
							</td>
							<td>
                <span className={`category-badge ${guild.category?.toLowerCase().replace(/\s+/g, "-")}`}>
                  {guild.category || "-"}
                </span>
							</td>
							<td className="number">{formatNumber(guild.contributionStart)}</td>
							<td className="number">{formatNumber(guild.contributionFinish)}</td>
							<td className={`number change ${(guild.contributionChanged || 0) >= 0 ? "positive" : "negative"}`}>
								{guild.contributionChanged !== null ? (
									<>
										{guild.contributionChanged >= 0 ? "+" : ""}{formatNumber(guild.contributionChanged)}
									</>
								) : "-"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			
			{rankingData.length === 0 && (
				<div className="empty-ranking">
					<Trophy className="w-12 h-12 opacity-50"/>
					<p>변화량 데이터가 있는 멤버가 없습니다.</p>
				</div>
			)}
		</div>
	</div>
);

export default UserGuildManager;
