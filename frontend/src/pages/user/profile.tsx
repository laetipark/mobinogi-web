import React, {useState, useEffect} from "react";
import {useAuth} from "@/hooks/use-auth";
import {UserCharacter, UserCharacterRequest} from "@/types";
import characterService from "@/services/character-service";
import profileService from "@/services/profile-service";
import {User, Camera, Plus, Edit2, Trash2, Save, X, RefreshCw, Gamepad2} from "lucide-react";
import styles from "./profile.module.scss";

const ProfilePage:React.FC = () => {
	const {user, checkLoginStatus} = useAuth();

	// 프로필 상태
	const [nickname, setNickname] = useState("");
	const [profileImage, setProfileImage] = useState("");
	const [profileLoading, setProfileLoading] = useState(false);
	const [profileMessage, setProfileMessage] = useState<{type:"success" | "error"; text:string} | null>(null);

	// 캐릭터 상태
	const [characters, setCharacters] = useState<UserCharacter[]>([]);
	const [charactersLoading, setCharactersLoading] = useState(true);
	const [editingCharacter, setEditingCharacter] = useState<UserCharacter | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);

	// 캐릭터 폼 상태
	const [characterForm, setCharacterForm] = useState<UserCharacterRequest>({
		characterName: "",
		serverName: "",
		className: ""
	});

	// 초기화
	useEffect(() => {
		if(user){
			setNickname(user.nickname || "");
			setProfileImage(user.profileImage || "");
			loadCharacters();
		}
	}, [user]);

	// 캐릭터 로드
	const loadCharacters = async() => {
		setCharactersLoading(true);
		try{
			const data = await characterService.getMyCharacters();
			setCharacters(data);
		}catch(error){
			console.error("캐릭터 로드 실패:", error);
		}finally{
			setCharactersLoading(false);
		}
	};

	// 프로필 저장
	const handleProfileSave = async() => {
		setProfileLoading(true);
		setProfileMessage(null);
		try{
			await profileService.updateProfile({nickname, profileImage});
			setProfileMessage({type: "success", text: "프로필이 저장되었습니다."});
			// 로그인 상태 갱신
			if(checkLoginStatus){
				await checkLoginStatus();
			}
		}catch(error:any){
			setProfileMessage({type: "error", text: error.message || "프로필 저장에 실패했습니다."});
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
			setCharacterForm({characterName: "", serverName: "", className: ""});
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
			setCharacterForm({characterName: "", serverName: "", className: ""});
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
			characterName: character.characterName,
			serverName: character.serverName || "",
			className: character.className || ""
		});
		setShowAddForm(false);
	};

	// 수정 모드 취소
	const cancelEdit = () => {
		setEditingCharacter(null);
		setCharacterForm({characterName: "", serverName: "", className: ""});
	};

	// 추가 모드 시작
	const startAddCharacter = () => {
		setShowAddForm(true);
		setEditingCharacter(null);
		setCharacterForm({characterName: "", serverName: "", className: ""});
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
				<h1 className={styles.pageTitle}>프로필 설정</h1>

				{/* 프로필 섹션 */}
				<section className={styles.section}>
					<h2 className={styles.sectionTitle}>
						<User size={20}/>
						<span>내 프로필</span>
					</h2>

					<div className={styles.profileForm}>
						<div className={styles.profileImageSection}>
							<div className={styles.profileImageWrapper}>
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
								<label>프로필 이미지 URL</label>
								<input
									type="text"
									value={profileImage}
									onChange={(e) => setProfileImage(e.target.value)}
									placeholder="이미지 URL을 입력하세요"
								/>
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
						{!showAddForm && !editingCharacter && (
							<button className={styles.addBtn} onClick={startAddCharacter}>
								<Plus size={16}/>
								캐릭터 추가
							</button>
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
										onChange={(e) => setCharacterForm(prev => ({...prev, characterName: e.target.value}))}
										placeholder="캐릭터 이름"
									/>
								</div>
								<div className={styles.formGroup}>
									<label>서버</label>
									<input
										type="text"
										value={characterForm.serverName}
										onChange={(e) => setCharacterForm(prev => ({...prev, serverName: e.target.value}))}
										placeholder="서버 이름"
									/>
								</div>
								<div className={styles.formGroup}>
									<label>직업</label>
									<input
										type="text"
										value={characterForm.className}
										onChange={(e) => setCharacterForm(prev => ({...prev, className: e.target.value}))}
										placeholder="직업"
									/>
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
											<span className={styles.characterMeta}>{character.className}</span>
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
