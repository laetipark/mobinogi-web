import React, {useState, useEffect, useRef, useMemo} from "react";
import {useAuth} from "@/hooks/use-auth";
import {UserCharacter, UserCharacterRequest, GameClassItem} from "@/types";
import characterService from "@/services/character-service";
import {gameClassService} from "@/services/game-class-service";
import {getGameClassColorStyle} from "@/utils";
import profileService from "@/services/profile-service";
import {uploadService} from "@/services/upload-service";
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
		description : "프로필과 캐릭터 정보를 관리하세요.",
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
	/**
	 * Utility function resolveClassCode.
	 */
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
	/**
	 * Utility function isRankStale.
	 */
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
	/**
	 * Utility function async.
	 */
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
	
	/**
	 * Utility function fetchRanks.
	 */
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
	/**
	 * Utility function async.
	 */
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
	
	/**
	 * Utility function handleFileSelect.
	 */
	const handleFileSelect = (e:React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if(file) handleProfileImageUpload(file);
		e.target.value = "";
	};
	
	/**
	 * Utility function handleImageClick.
	 */
	const handleImageClick = () => {
		if(!useUrlInput){
			fileInputRef.current?.click();
		}
	};
	
	// 프로필 저장
	/**
	 * Utility function async.
	 */
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
	/**
	 * Utility function async.
	 */
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
	/**
	 * Utility function async.
	 */
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
	/**
	 * Utility function async.
	 */
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
	/**
	 * Utility function startEditCharacter.
	 */
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
	/**
	 * Utility function cancelEdit.
	 */
	const cancelEdit = () => {
		setEditingCharacter(null);
		setCharacterForm({characterName : "", serverId : 2, classId : undefined});
	};
	
	// 추가 모드 시작
	/**
	 * Utility function startAddCharacter.
	 */
	const startAddCharacter = () => {
		setShowAddForm(true);
		setEditingCharacter(null);
		setCharacterForm({characterName : "", serverId : 2, classId : undefined});
	};
	
	// 순서 변경 모드
	/**
	 * Utility function startReorderMode.
	 */
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
	
	/**
	 * Utility function cancelReorderMode.
	 */
	const cancelReorderMode = () => {
		setReorderMode(false);
		setReorderList([]);
	};
	
	/**
	 * Utility function async.
	 */
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
				<h1 className="page-heading">프로필 설정</h1>
				
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
