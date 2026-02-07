import React, {useState} from "react";
import styles from "./todo.module.scss";
import {GameMonster} from "../../types";

interface BossSettingsModalProps{
	title:string;
	monsters:GameMonster[];
	trackedIds:number[];
	onSave:(trackedIds:number[]) => void;
	onClose:() => void;
}

const BossSettingsModal:React.FC<BossSettingsModalProps> = ({title, monsters, trackedIds, onSave, onClose}) => {
	const [selected, setSelected] = useState<number[]>([...trackedIds]);

	const handleToggle = (monsterId:number) => {
		setSelected(prev =>
			prev.includes(monsterId)
				? prev.filter(id => id !== monsterId)
				: [...prev, monsterId]
		);
	};

	const handleSelectAll = () => {
		setSelected(monsters.map(m => m.monsterId));
	};

	const handleDeselectAll = () => {
		setSelected([]);
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>{title} 설정</h3>
					<button className={styles.modalClose} onClick={onClose}>&times;</button>
				</div>
				<div className={styles.modalBody}>
					<div className={styles.modalActions}>
						<button className={styles.modalActionBtn} onClick={handleSelectAll}>전체 선택</button>
						<button className={styles.modalActionBtn} onClick={handleDeselectAll}>전체 해제</button>
						<span className={styles.modalCount}>{selected.length}개 선택</span>
					</div>
					<div className={styles.monsterList}>
						{monsters.map(monster => (
							<label key={monster.monsterId} className={styles.monsterOption}>
								<input
									type="checkbox"
									checked={selected.includes(monster.monsterId)}
									onChange={() => handleToggle(monster.monsterId)}
								/>
								<span className={styles.monsterOptionName}>{monster.monsterName}</span>
								<span className={styles.monsterOptionDetail}>{monster.monsterDifficulty}</span>
							</label>
						))}
					</div>
				</div>
				<div className={styles.modalFooter}>
					<button className={styles.modalCancelBtn} onClick={onClose}>취소</button>
					<button className={styles.modalSaveBtn} onClick={() => onSave(selected)}>확인</button>
				</div>
			</div>
		</div>
	);
};

export default BossSettingsModal;
