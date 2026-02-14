import React, {useState, useEffect} from "react";
import {UserCharacter, UserCharacterRequest, GameClassItem} from "@/types";
import {characterService, gameClassService} from "@/services";
import styles from "./character-manager.module.scss";

interface CharacterManagerProps{
	onClose?:() => void;
	isModal?:boolean;
}

const DEFAULT_FORM:UserCharacterRequest = {
	characterName : "",
	serverId : 2,
	classId : undefined
};

const SERVERS:{id:number; name:string}[] = [
	{id : 1, name : "데이안"},
	{id : 2, name : "아이라"},
	{id : 3, name : "던컨"},
	{id : 4, name : "알리사"},
	{id : 5, name : "메이븐"},
	{id : 6, name : "라사"},
	{id : 7, name : "칼릭스"}
];

const CharacterManager:React.FC<CharacterManagerProps> = ({onClose, isModal = false}) => {
	const [characters, setCharacters] = useState<UserCharacter[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isAdding, setIsAdding] = useState<boolean>(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState<UserCharacterRequest>(DEFAULT_FORM);
	const [classes, setClasses] = useState<GameClassItem[]>([]);
	
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
			setError(err.message || "ĳ���� ����� �ҷ����µ� �����߽��ϴ�.");
		}finally{
			setLoading(false);
		}
	};
	
	const handleNameChange = (e:React.ChangeEvent<HTMLInputElement>) => {
		const {value} = e.target;
		setFormData(prev => ({...prev, characterName : value}));
	};
	
	const handleServerChange = (e:React.ChangeEvent<HTMLSelectElement>) => {
		const {value} = e.target;
		setFormData(prev => ({...prev, serverId : value ? Number(value) : undefined}));
	};
	
	const handleClassChange = (e:React.ChangeEvent<HTMLSelectElement>) => {
		const {value} = e.target;
		setFormData(prev => ({...prev, classId : value ? Number(value) : undefined}));
	};
	
	const resetForm = () => {
		setFormData(DEFAULT_FORM);
	};
	
	const handleSubmit = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!formData.characterName.trim()){
			setError("ĳ���� �̸��� �Է����ּ���.");
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
			resetForm();
		}catch(err:any){
			setError(err.message || "ĳ���� ���忡 �����߽��ϴ�.");
		}
	};
	
	const handleEdit = (character:UserCharacter) => {
		setEditingId(character.characterId);
		setFormData({
			characterName : character.characterName,
			serverId : character.serverId ?? undefined,
			classId : character.classId ?? undefined
		});
		setIsAdding(true);
	};
	
	const handleDelete = async(characterId:number) => {
		if(!window.confirm("���� �����Ͻðڽ��ϱ�?")){
			return;
		}
		
		try{
			setError(null);
			await characterService.deleteCharacter(characterId);
			setCharacters(prev => prev.filter(c => c.characterId !== characterId));
		}catch(err:any){
			setError(err.message || "ĳ���� ������ �����߽��ϴ�.");
		}
	};
	
	const handleCancel = () => {
		setIsAdding(false);
		setEditingId(null);
		resetForm();
		setError(null);
	};
	
	const containerClass = isModal ? `${styles.container} ${styles.modal}` : styles.container;
	
	return (
		<div className={containerClass}>
			<div className={styles.header}>
				<h2>�� ĳ���� ����</h2>
				{isModal && onClose && (
					<button className={styles.closeBtn} onClick={onClose}>&times;</button>
				)}
			</div>
			
			{error && <div className={styles.error}>{error}</div>}
			
			{!isAdding && (
				<button className={styles.addBtn} onClick={() => setIsAdding(true)}>
					+ ĳ���� �߰�
				</button>
			)}
			
			{isAdding && (
				<form className={styles.form} onSubmit={handleSubmit}>
					<div className={styles.formGroup}>
						<label htmlFor="characterName">ĳ���� �̸� *</label>
						<input
							type="text"
							id="characterName"
							name="characterName"
							value={formData.characterName}
							onChange={handleNameChange}
							placeholder="ĳ���� �̸� �Է�"
							autoFocus
						/>
					</div>
					
					<div className={styles.formGroup}>
						<label htmlFor="serverId">����</label>
						<select
							id="serverId"
							name="serverId"
							value={formData.serverId ?? ""}
							onChange={handleServerChange}
						>
							<option value="">���þ���</option>
							{SERVERS.map(server => (
								<option key={server.id} value={server.id}>{server.name}</option>
							))}
						</select>
					</div>
					
					<div className={styles.formGroup}>
						<label htmlFor="classId">����</label>
						<select
							id="classId"
							name="classId"
							value={formData.classId ?? ""}
							onChange={handleClassChange}
						>
							<option value="">���þ���</option>
							{classes.map(cls => (
								<option key={cls.classId} value={cls.classId}>{cls.className}</option>
							))}
						</select>
					</div>
					
					<div className={styles.formActions}>
						<button type="submit" className={styles.submitBtn}>
							{editingId ? "����" : "�߰�"}
						</button>
						<button type="button" className={styles.cancelBtn} onClick={handleCancel}>
							���
						</button>
					</div>
				</form>
			)}
			
			{loading ? (
				<div className={styles.loading}>�ε� ��...</div>
			) : characters.length === 0 ? (
				<div className={styles.empty}>��ϵ� ĳ���Ͱ� �����ϴ�.</div>
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
									����
								</button>
								<button
									className={styles.deleteBtn}
									onClick={() => handleDelete(character.characterId)}
								>
									����
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