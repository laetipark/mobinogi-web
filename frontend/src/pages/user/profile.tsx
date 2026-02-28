import React, {useState, useEffect, useRef, useMemo} from "react";
import {useAuth} from "@/hooks/use-auth";
import {UserCharacter, UserCharacterRequest, GameClassItem} from "@/types";
import characterService from "@/services/character-service";
import {gameClassService} from "@/services/game-class-service";
import {getGameClassColorStyle} from "@/utils";
import profileService from "@/services/profile-service";
import {uploadService} from "@/services/upload-service";
import {discordService} from "@/services/discord-service";
import {useSeo} from "@/hooks/use-seo";
import {
	User,
	Camera,
	Plus,
	Edit2,
	Trash2,
	Save,
	X,
	RefreshCw,
	Gamepad2,
	Link,
	Upload,
	ArrowUpDown,
	Check
} from "lucide-react";
import SortableCharacterList, {SortableCharacterItem} from "@/components/user/sortable-character-list";
import styles from "./profile.module.scss";

const ProfilePage:React.FC = () => {
	const {user, checkLoginStatus} = useAuth();
	useSeo({
		title : "프로필",
		description : "프로필, 캐릭터, 디스코드 연동 정보를 관리하세요.",
		canonicalPath : "/profile",
		noindex : true
	});
	const fileInputRef = useRef<HTMLInputElement>(null);
	
	// 프로필 상태
	const [nickname, setNickname] = useState("");
	const [profileImage, setProfileImage] = useState("");
	const [profileLoading, setProfileLoading] = useState(false);
	const [profileMessage, setProfileMessage] = useState<{type:"success" | "error"; text:string} | null>(null);
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);
	const [useUrlInput, setUseUrlInput] = useState(false);
	
	// 캐릭터 상태
	const [characters, setCharacters] = useState<UserCharacter[]>([]);
	const [charactersLoading, setCharactersLoading] = useState(true);
	const [editingCharacter, setEditingCharacter] = useState<UserCharacter | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	
	// 캐릭터 순서 변경 상태
	const [reorderMode, setReorderMode] = useState(false);
	const [reorderList, setReorderList] = useState<SortableCharacterItem[]>([]);
	const [reorderSaving, setReorderSaving] = useState(false);
	
	// 캐릭터 폼 상태
	const [characterForm, setCharacterForm] = useState<UserCharacterRequest>({
		characterName : "",
		serverId : 2,
		classId : undefined
	});
	const [classes, setClasses] = useState<GameClassItem[]>([]);
	const classCodeById = useMemo(() => new Map(classes.map((cls) => [cls.classId, cls.classCode])), [classes]);
	const classCodeByName = useMemo(() => new Map(classes.map((cls) => [cls.className, cls.classCode])), [classes]);
	const resolveClassCode = (classId?:number, className?:string | null) => {
		if(classId && classCodeById.has(classId)){
			return classCodeById.get(classId);
		}
		if(className && classCodeByName.has(className)){
			return classCodeByName.get(className);
		}
		return undefined;
	};
	const servers:{id:number; name:string}[] = [
		{id : 1, name : "데이안"}, {id : 2, name : "아이라"}, {id : 3, name : "던컨"}, {id : 4, name : "알리사"},
		{id : 5, name : "메이븐"}, {id : 6, name : "라사"}, {id : 7, name : "칼릭스"}
	];
	
	// Rank 로딩 상태
	const [rankLoading, setRankLoading] = useState<Set<number>>(new Set());
	const RANK_STALE_MS = 10 * 60 * 1000;
	const isRankStale = (rankUpdatedAt?:string):boolean => {
		if(!rankUpdatedAt){
			return true;
		}
		const updatedAtMs = new Date(rankUpdatedAt).getTime();
		if(Number.isNaN(updatedAtMs)){
			return true;
		}
		return Date.now() - updatedAtMs >= RANK_STALE_MS;
	};
	
	// Discord 연동 상태
	const [discordLoading, setDiscordLoading] = useState(false);
	const [discordMessage, setDiscordMessage] = useState<{type:"success" | "error"; text:string} | null>(null);
	
	// 초기화
	useEffect(() => {
		if(user){
			setNickname(user.nickname || "");
			setProfileImage(user.profileImage || "");
			loadCharacters();
		}
		gameClassService.getClasses().then(setClasses).catch(() => {
		});
	}, [user]);
	
	// 캐릭터 로드
	const loadCharacters = async() => {
		setCharactersLoading(true);
		try{
			const data = await characterService.getMyCharacters();
			setCharacters(data);
			fetchRanks(data);
		}catch(error){
			console.error("캐릭터 로드 실패:", error);
		}finally{
			setCharactersLoading(false);
		}
	};
	
	const fetchRanks = (chars:UserCharacter[]) => {
		const targets = chars.filter(c =>
			c.serverId != null &&
			Boolean(c.characterName?.trim()) &&
			isRankStale(c.rankUpdatedAt)
		);
		if(targets.length === 0){
			return;
		}
		
		const loadingIds = new Set(targets.map(c => c.characterId));
		setRankLoading(loadingIds);
		
		targets.forEach(c => {
			characterService.fetchRank(c.characterName, c.serverId!).then(rank => {
				setCharacters(prev => prev.map(ch =>
					ch.characterId === c.characterId
						? {
							...ch,
							userPower : rank.userPower ?? undefined,
							userVitality : rank.userVitality ?? undefined,
							userAttractiveness : rank.userAttractiveness ?? undefined,
							rankUpdatedAt : rank.updatedAt ?? ch.rankUpdatedAt
						}
						: ch
				));
			}).catch((error) => {
				console.warn(`Failed to fetch rank for character ${c.characterId} (${c.characterName})`, error);
			}).finally(() => {
				setRankLoading(prev => {
					const next = new Set(prev);
					next.delete(c.characterId);
					return next;
				});
			});
		});
	};
	
	// 프로필 이미지 업로드
	const handleProfileImageUpload = async(file:File) => {
		setUploadProgress(0);
		setProfileMessage(null);
		try{
			const result = await uploadService.uploadImage(file, "profile", (progress) => {
				setUploadProgress(progress);
			});
			if(result.success && result.url){
				setProfileImage(result.url);
				setProfileMessage({type : "success", text : "이미지가 업로드되었습니다. 프로필 저장을 눌러주세요."});
			}else{
				setProfileMessage({type : "error", text : result.message || "이미지 업로드에 실패했습니다."});
			}
		}catch(error:any){
			setProfileMessage({
				type : "error",
				text : error?.response?.data?.message || error?.message || "이미지 업로드에 실패했습니다."
			});
		}finally{
			setUploadProgress(null);
		}
	};
	
	const handleFileSelect = (e:React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if(file) handleProfileImageUpload(file);
		e.target.value = "";
	};
	
	const handleImageClick = () => {
		if(!useUrlInput){
			fileInputRef.current?.click();
		}
	};
	
	// 프로필 저장
	const handleProfileSave = async() => {
		setProfileLoading(true);
		setProfileMessage(null);
		try{
			await profileService.updateProfile({nickname, profileImage});
			setProfileMessage({type : "success", text : "프로필이 저장되었습니다."});
			// 로그인 상태 갱신
			if(checkLoginStatus){
				await checkLoginStatus();
			}
		}catch(error:any){
			setProfileMessage({type : "error", text : error.message || "프로필 저장에 실패했습니다."});
		}finally{
			setProfileLoading(false);
		}
	};
	
	// 캐릭터 추가
	const handleAddCharacter = async() => {
		if(!characterForm.characterName.trim()){
			return;
		}
		try{
			const newCharacter = await characterService.createCharacter(characterForm);
			setCharacters(prev => [...prev, newCharacter]);
			setCharacterForm({characterName : "", serverId : 2, classId : undefined});
			setShowAddForm(false);
		}catch(error:any){
			console.error("캐릭터 추가 실패:", error);
		}
	};
	
	// 캐릭터 수정
	const handleEditCharacter = async() => {
		if(!editingCharacter || !characterForm.characterName.trim()){
			return;
		}
		try{
			const updated = await characterService.updateCharacter(editingCharacter.characterId, characterForm);
			setCharacters(prev => prev.map(c => c.characterId === updated.characterId ? updated : c));
			setEditingCharacter(null);
			setCharacterForm({characterName : "", serverId : 2, classId : undefined});
		}catch(error:any){
			console.error("캐릭터 수정 실패:", error);
		}
	};
	
	// 캐릭터 삭제
	const handleDeleteCharacter = async(characterId:number) => {
		if(!confirm("정말 이 캐릭터를 삭제하시겠습니까?")){
			return;
		}
		try{
			await characterService.deleteCharacter(characterId);
			setCharacters(prev => prev.filter(c => c.characterId !== characterId));
		}catch(error:any){
			console.error("캐릭터 삭제 실패:", error);
		}
	};
	
	// 수정 모드 시작
	const startEditCharacter = (character:UserCharacter) => {
		setEditingCharacter(character);
		setCharacterForm({
			characterName : character.characterName,
			serverId : character.serverId || undefined,
			classId : character.classId || undefined
		});
		setShowAddForm(false);
	};
	
	// 수정 모드 취소
	const cancelEdit = () => {
		setEditingCharacter(null);
		setCharacterForm({characterName : "", serverId : 2, classId : undefined});
	};
	
	// 추가 모드 시작
	const startAddCharacter = () => {
		setShowAddForm(true);
		setEditingCharacter(null);
		setCharacterForm({characterName : "", serverId : 2, classId : undefined});
	};
	
	// 순서 변경 모드
	const startReorderMode = () => {
		setReorderList(characters.map(c => ({
			characterId : c.characterId,
			characterName : c.characterName,
			serverName : c.serverName
		})));
		setReorderMode(true);
		setShowAddForm(false);
		setEditingCharacter(null);
	};
	
	const cancelReorderMode = () => {
		setReorderMode(false);
		setReorderList([]);
	};
	
	const handleReorderSave = async() => {
		setReorderSaving(true);
		try{
			await characterService.reorderCharacters(reorderList.map(c => c.characterId));
			await loadCharacters();
			setReorderMode(false);
			setReorderList([]);
		}catch(error:any){
			console.error("순서 변경 실패:", error);
		}finally{
			setReorderSaving(false);
		}
	};
	
	// Discord 연동
	const handleDiscordLink = async() => {
		setDiscordLoading(true);
		setDiscordMessage(null);
		try{
			const authUrl = await discordService.getAuthorizeUrl();
			// Discord OAuth 페이지로 이동
			window.location.href = authUrl;
		}catch(error:any){
			setDiscordMessage({type : "error", text : error.message || "Discord 연동 실패"});
			setDiscordLoading(false);
		}
	};
	
	// Discord 연동 해제
	const handleDiscordUnlink = async() => {
		if(!confirm("Discord 연동을 해제하시겠습니까?")){
			return;
		}
		setDiscordLoading(true);
		setDiscordMessage(null);
		try{
			const result = await discordService.unlinkDiscord();
			setDiscordMessage({type : "success", text : result.message});
			// 로그인 상태 갱신
			if(checkLoginStatus){
				await checkLoginStatus();
			}
		}catch(error:any){
			setDiscordMessage({type : "error", text : error.message || "연동 해제 실패"});
		}finally{
			setDiscordLoading(false);
		}
	};
	
	if(!user){
		return (
			<div className={styles.profilePage}>
				<div className={styles.notLoggedIn}>
					로그인이 필요합니다.
				</div>
			</div>
		);
	}
	
	return (
		<div className={styles.profilePage}>
			<div className={styles.container}>
				<div className="page-heading">
					<h1>프로필 설정</h1>
					<p className="page-heading-subtitle">프로필, Discord 연동, 캐릭터 정보를 한 번에 관리하세요</p>
				</div>
				
				{/* 프로필 섹션 */}
				<section className={styles.section}>
					<h2 className={styles.sectionTitle}>
						<User size={20}/>
						<span>내 프로필</span>
					</h2>
					
					<div className={styles.profileForm}>
						<div className={styles.profileImageSection}>
							<div className={styles.profileImageWrapper} onClick={handleImageClick}>
								{profileImage ? (
									<img src={profileImage} alt="프로필" className={styles.profileImage}/>
								) : (
									<div className={styles.profileImagePlaceholder}>
										<User size={48}/>
									</div>
								)}
								<div className={styles.cameraOverlay}>
									<Camera size={20}/>
								</div>
							</div>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/jpeg,image/png,image/gif,image/webp"
								onChange={handleFileSelect}
								className={styles.fileInput}
							/>
							{uploadProgress !== null && (
								<div className={styles.uploadProgress}>
									<div className={styles.progressBar}>
										<div className={styles.progressFill} style={{width : `${uploadProgress}%`}}/>
									</div>
								</div>
							)}
						</div>
						
						<div className={styles.formFields}>
							<div className={styles.formGroup}>
								<label>닉네임</label>
								<input
									type="text"
									value={nickname}
									onChange={(e) => setNickname(e.target.value)}
									placeholder="닉네임을 입력하세요"
									maxLength={20}
								/>
							</div>
							
							<div className={styles.formGroup}>
								<div className={styles.imageInputHeader}>
									<label>프로필 이미지</label>
									<button
										type="button"
										className={styles.toggleInputBtn}
										onClick={() => setUseUrlInput(!useUrlInput)}
									>
										{useUrlInput ? (
											<><Upload size={13}/> 파일 업로드</>
										) : (
											<><Link size={13}/> URL 입력</>
										)}
									</button>
								</div>
								{useUrlInput ? (
									<input
										type="text"
										value={profileImage}
										onChange={(e) => setProfileImage(e.target.value)}
										placeholder="이미지 URL을 입력하세요"
									/>
								) : (
									<button
										type="button"
										className={styles.fileSelectBtn}
										onClick={() => fileInputRef.current?.click()}
										disabled={uploadProgress !== null}
									>
										<Upload size={14}/>
										{uploadProgress !== null ? "업로드 중..." : "이미지 파일 선택"}
									</button>
								)}
							</div>
							
							{profileMessage && (
								<div className={`${styles.message} ${styles[profileMessage.type]}`}>
									{profileMessage.text}
								</div>
							)}
							
							<button
								className={styles.saveBtn}
								onClick={handleProfileSave}
								disabled={profileLoading}
							>
								{profileLoading ? (
									<>
										<RefreshCw size={16} className={styles.spinning}/>
										저장 중...
									</>
								) : (
									<>
										<Save size={16}/>
										프로필 저장
									</>
								)}
							</button>
						</div>
					</div>
				</section>
				
				{/* Discord 연동 섹션 */}
				<section className={styles.section}>
					<h2 className={styles.sectionTitle}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
						</svg>
						<span>Discord 연동</span>
					</h2>
					
					<div className={styles.discordSection}>
						{user.discordId ? (
							<div className={styles.discordLinked}>
								<div className={styles.discordInfo}>
									{user.discordAvatar && (
										<img src={user.discordAvatar} alt="Discord" className={styles.discordAvatar}/>
									)}
									<div>
										<div className={styles.discordUsername}>{user.discordUsername}</div>
										<div className={styles.discordId}>ID: {user.discordId}</div>
									</div>
								</div>
								<button
									className={styles.unlinkBtn}
									onClick={handleDiscordUnlink}
									disabled={discordLoading}
								>
									{discordLoading ? "처리 중..." : "연동 해제"}
								</button>
							</div>
						) : (
							<div className={styles.discordUnlinked}>
								<p>Discord 계정을 연동하면 Discord에서 작성한 게시물이 내 게시물로 표시됩니다.</p>
								<button
									className={styles.linkBtn}
									onClick={handleDiscordLink}
									disabled={discordLoading}
								>
									{discordLoading ? "처리 중..." : "Discord 연동하기"}
								</button>
							</div>
						)}
						
						{discordMessage && (
							<div className={`${styles.message} ${styles[discordMessage.type]}`}>
								{discordMessage.text}
							</div>
						)}
					</div>
				</section>
				
				{/* 캐릭터 섹션 */}
				<section className={styles.section}>
					<div className={styles.sectionHeader}>
						<h2 className={styles.sectionTitle}>
							<Gamepad2 size={20}/>
							<span>내 캐릭터</span>
							<span className={styles.count}>{characters.length}</span>
						</h2>
						{!showAddForm && !editingCharacter && !reorderMode && (
							<div className={styles.headerActions}>
								{characters.length >= 2 && (
									<button className={styles.reorderToggleBtn} onClick={startReorderMode}>
										<ArrowUpDown size={16}/>
										순서 변경
									</button>
								)}
								<button className={styles.addBtn} onClick={startAddCharacter}>
									<Plus size={16}/>
									캐릭터 추가
								</button>
							</div>
						)}
					</div>
					
					{/* 캐릭터 추가/수정 폼 */}
					{(showAddForm || editingCharacter) && (
						<div className={styles.characterForm}>
							<h3>{editingCharacter ? "캐릭터 수정" : "새 캐릭터 추가"}</h3>
							<div className={styles.formRow}>
								<div className={styles.formGroup}>
									<label>캐릭터 이름 *</label>
									<input
										type="text"
										value={characterForm.characterName}
										onChange={(e) => setCharacterForm(prev => ({
											...prev,
											characterName : e.target.value
										}))}
										placeholder="캐릭터 이름"
									/>
								</div>
								<div className={styles.formGroup}>
									<label>서버</label>
									<select
										value={characterForm.serverId ?? ""}
										onChange={(e) => setCharacterForm(prev => ({
											...prev,
											serverId : e.target.value ? Number(e.target.value) : undefined
										}))}
									>
										<option value="">선택안함</option>
										{servers.map(server => (
											<option key={server.id} value={server.id}>{server.name}</option>
										))}
									</select>
								</div>
								<div className={styles.formGroup}>
									<label>직업</label>
									<select
										value={characterForm.classId ?? ""}
										onChange={(e) => setCharacterForm(prev => ({
											...prev,
											classId : e.target.value ? Number(e.target.value) : undefined
										}))}
										style={getGameClassColorStyle(resolveClassCode(characterForm.classId))}
									>
										<option value="">선택안함</option>
										{classes.map(cls => (
											<option key={cls.classId} value={cls.classId}>{cls.className}</option>
										))}
									</select>
								</div>
							</div>
							<div className={styles.formActions}>
								<button
									className={styles.cancelBtn}
									onClick={() => {
										setShowAddForm(false);
										cancelEdit();
									}}
								>
									<X size={16}/>
									취소
								</button>
								<button
									className={styles.confirmBtn}
									onClick={editingCharacter ? handleEditCharacter : handleAddCharacter}
									disabled={!characterForm.characterName.trim()}
								>
									<Save size={16}/>
									{editingCharacter ? "수정" : "추가"}
								</button>
							</div>
						</div>
					)}
					
					{/* 캐릭터 목록 */}
					{charactersLoading ? (
						<div className={styles.loading}>
							<RefreshCw size={24} className={styles.spinning}/>
							<span>캐릭터 로딩 중...</span>
						</div>
					) : characters.length === 0 ? (
						<div className={styles.emptyCharacters}>
							<Gamepad2 size={48}/>
							<p>등록된 캐릭터가 없습니다.</p>
							<button className={styles.addBtn} onClick={startAddCharacter}>
								<Plus size={16}/>
								첫 캐릭터 추가하기
							</button>
						</div>
					) : reorderMode ? (
						<>
							<SortableCharacterList
								items={reorderList}
								onReorder={setReorderList}
							/>
							<div className={styles.reorderActions}>
								<button className={styles.cancelBtn} onClick={cancelReorderMode}>
									<X size={16}/>
									취소
								</button>
								<button
									className={styles.confirmBtn}
									onClick={handleReorderSave}
									disabled={reorderSaving}
								>
									{reorderSaving ? (
										<><RefreshCw size={16} className={styles.spinning}/> 저장 중...</>
									) : (
										<><Check size={16}/> 저장</>
									)}
								</button>
							</div>
						</>
					) : (
						<div className={styles.characterList}>
							{characters.map((character) => (
								<div key={character.characterId} className={styles.characterCard}>
									<div className={styles.characterInfo}>
										<span className={styles.characterName}>{character.characterName}</span>
										{character.serverName && (
											<span className={styles.characterMeta}>{character.serverName}</span>
										)}
										{character.className && (
											<span
												className={`${styles.characterMeta} ${styles.classBadge}`}
												style={getGameClassColorStyle(resolveClassCode(character.classId, character.className))}
											>
												{character.className}
											</span>
										)}
										{rankLoading.has(character.characterId) && character.userPower == null && character.userVitality == null && character.userAttractiveness == null ? (
											<div className={styles.characterStats}>
												<span className={styles.statLoading}>랭크 로딩중...</span>
											</div>
										) : (character.userPower != null || character.userVitality != null || character.userAttractiveness != null) && (
											<div className={styles.characterStats}>
												{character.userPower != null && <span
													className={styles.statPower}>전투력 {character.userPower.toLocaleString()}</span>}
												{character.userVitality != null && <span
													className={styles.statVitality}>생활력 {character.userVitality.toLocaleString()}</span>}
												{character.userAttractiveness != null && <span
													className={styles.statAttractiveness}>매력 {character.userAttractiveness.toLocaleString()}</span>}
											</div>
										)}
									</div>
									<div className={styles.characterActions}>
										<button
											className={styles.editBtn}
											onClick={() => startEditCharacter(character)}
											title="수정"
										>
											<Edit2 size={16}/>
										</button>
										<button
											className={styles.deleteBtn}
											onClick={() => handleDeleteCharacter(character.characterId)}
											title="삭제"
										>
											<Trash2 size={16}/>
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</section>
			</div>
		</div>
	);
};

export default ProfilePage;
