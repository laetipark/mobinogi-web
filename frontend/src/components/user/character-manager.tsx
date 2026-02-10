import React, {useState, useEffect} from "react";
import {UserCharacter, UserCharacterRequest} from "@/types";
import {characterService, gameClassService} from "@/services";
import {GameClassItem} from "@/services/game-class-service.ts";
import styles from "./character-manager.module.scss";

interface CharacterManagerProps{
	onClose?:() => void;
	isModal?:boolean;
}

const CharacterManager:React.FC<CharacterManagerProps> = ({onClose, isModal = false}) => {
	const [characters, setCharacters] = useState<UserCharacter[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isAdding, setIsAdding] = useState<boolean>(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState<UserCharacterRequest>({
		characterName : "",
		serverName : "아이라",
		className : ""
	});
	const [classes, setClasses] = useState<GameClassItem[]>([]);
	
	const servers = ["데이안", "아이라", "던컨", "알리사", "메이븐", "라사", "칼릭스"];
	
	useEffect(() => {
		loadCharacters();
		gameClassService.getClasses().then(setClasses).catch(() => {
		});
	}, []);
	
	const loadCharacters = async() => {
		try{
			setLoading(true);
			setError(null);
			const data = await characterService.getMyCharacters();
			setCharacters(data);
		}catch(err:any){
			setError(err.message || "캐릭터 목록을 불러오는데 실패했습니다.");
		}finally{
			setLoading(false);
		}
	};
	
	const handleInputChange = (e:React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const {name, value} = e.target;
		setFormData(prev => ({...prev, [name] : value}));
	};
	
	const handleSubmit = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!formData.characterName.trim()){
			setError("캐릭터 이름을 입력해주세요.");
			return;
		}
		
		try{
			setError(null);
			if(editingId){
				const updated = await characterService.updateCharacter(editingId, formData);
				setCharacters(prev => prev.map(c => c.characterId === editingId ? updated : c));
				setEditingId(null);
			}else{
				const created = await characterService.createCharacter(formData);
				setCharacters(prev => [created, ...prev]);
				setIsAdding(false);
			}
			setFormData({characterName : "", serverName : "아이라", className : ""});
		}catch(err:any){
			setError(err.message || "캐릭터 저장에 실패했습니다.");
		}
	};
	
	const handleEdit = (character:UserCharacter) => {
		setEditingId(character.characterId);
		setFormData({
			characterName : character.characterName,
			serverName : character.serverName || "",
			className : character.className || ""
		});
		setIsAdding(true);
	};
	
	const handleDelete = async(characterId:number) => {
		if(!window.confirm("정말 삭제하시겠습니까?")){
			return;
		}
		
		try{
			setError(null);
			await characterService.deleteCharacter(characterId);
			setCharacters(prev => prev.filter(c => c.characterId !== characterId));
		}catch(err:any){
			setError(err.message || "캐릭터 삭제에 실패했습니다.");
		}
	};
	
	const handleCancel = () => {
		setIsAdding(false);
		setEditingId(null);
		setFormData({characterName : "", serverName : "아이라", className : ""});
		setError(null);
	};
	
	const containerClass = isModal ? `${styles.container} ${styles.modal}` : styles.container;
	
	return (
		<div className={containerClass}>
			<div className={styles.header}>
				<h2>내 캐릭터 관리</h2>
				{isModal && onClose && (
					<button className={styles.closeBtn} onClick={onClose}>&times;</button>
				)}
			</div>
			
			{error && <div className={styles.error}>{error}</div>}
			
			{!isAdding && (
				<button className={styles.addBtn} onClick={() => setIsAdding(true)}>
					+ 캐릭터 추가
				</button>
			)}
			
			{isAdding && (
				<form className={styles.form} onSubmit={handleSubmit}>
					<div className={styles.formGroup}>
						<label htmlFor="characterName">캐릭터 이름 *</label>
						<input
							type="text"
							id="characterName"
							name="characterName"
							value={formData.characterName}
							onChange={handleInputChange}
							placeholder="캐릭터 이름 입력"
							autoFocus
						/>
					</div>
					
					<div className={styles.formGroup}>
						<label htmlFor="serverName">서버</label>
						<select
							id="serverName"
							name="serverName"
							value={formData.serverName}
							onChange={handleInputChange}
						>
							<option value="">선택안함</option>
							{servers.map(server => (
								<option key={server} value={server}>{server}</option>
							))}
						</select>
					</div>
					
					<div className={styles.formGroup}>
						<label htmlFor="className">직업</label>
						<select
							id="className"
							name="className"
							value={formData.className}
							onChange={handleInputChange}
						>
							<option value="">선택안함</option>
							{classes.map(cls => (
								<option key={cls.classId} value={cls.className}>{cls.className}</option>
							))}
						</select>
					</div>
					
					<div className={styles.formActions}>
						<button type="submit" className={styles.submitBtn}>
							{editingId ? "수정" : "추가"}
						</button>
						<button type="button" className={styles.cancelBtn} onClick={handleCancel}>
							취소
						</button>
					</div>
				</form>
			)}
			
			{loading ? (
				<div className={styles.loading}>로딩 중...</div>
			) : characters.length === 0 ? (
				<div className={styles.empty}>등록된 캐릭터가 없습니다.</div>
			) : (
				<ul className={styles.characterList}>
					{characters.map(character => (
						<li key={character.characterId} className={styles.characterItem}>
							<div className={styles.characterInfo}>
								<span className={styles.characterName}>{character.characterName}</span>
								{character.serverName && (
									<span className={styles.serverName}>{character.serverName}</span>
								)}
								{character.className && (
									<span className={styles.className}>{character.className}</span>
								)}
							</div>
							<div className={styles.characterActions}>
								<button
									className={styles.editBtn}
									onClick={() => handleEdit(character)}
								>
									수정
								</button>
								<button
									className={styles.deleteBtn}
									onClick={() => handleDelete(character.characterId)}
								>
									삭제
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default CharacterManager;
