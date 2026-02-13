import React, {useState} from "react";
import {TodoMemo} from "../../types";
import {Plus, Trash2} from "lucide-react";
import styles from "./todo.module.scss";

interface MemoTaskModalProps{
	title:string;
	memos:TodoMemo[];
	onSave:(memos:TodoMemo[]) => void;
	onClose:() => void;
}

const MemoTaskModal:React.FC<MemoTaskModalProps> = ({title, memos, onSave, onClose}) => {
	const [items, setItems] = useState<TodoMemo[]>(memos.map(m => ({...m})));
	const [newLabel, setNewLabel] = useState("");
	
	const addMemo = () => {
		const label = newLabel.trim();
		if(!label) return;
		setItems([...items, {id : crypto.randomUUID(), label, completed : false}]);
		setNewLabel("");
	};
	
	const removeMemo = (id:string) => {
		setItems(items.filter(m => m.id !== id));
	};
	
	const updateLabel = (id:string, label:string) => {
		setItems(items.map(m => m.id === id ? {...m, label} : m));
	};
	
	const handleKeyDown = (e:React.KeyboardEvent) => {
		if(e.key === "Enter"){
			e.preventDefault();
			addMemo();
		}
	};
	
	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{maxWidth : 420}}>
				<div className={styles.modalHeader}>
					<h3>{title}</h3>
					<button className={styles.modalClose} onClick={onClose}>&times;</button>
				</div>
				<div className={styles.modalBody}>
					<div className={styles.memoAddRow}>
						<input
							className={styles.memoInput}
							type="text"
							value={newLabel}
							onChange={(e) => setNewLabel(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="새 메모 추가..."
							autoFocus
						/>
						<button
							className={styles.memoAddBtn}
							onClick={addMemo}
							disabled={!newLabel.trim()}
						>
							<Plus size={16}/>
						</button>
					</div>
					{items.length > 0 && (
						<div className={styles.memoList}>
							{items.map(memo => (
								<div key={memo.id} className={styles.memoRow}>
									<input
										className={styles.memoInput}
										type="text"
										value={memo.label}
										onChange={(e) => updateLabel(memo.id, e.target.value)}
									/>
									<button
										className={styles.memoDeleteBtn}
										onClick={() => removeMemo(memo.id)}
									>
										<Trash2 size={14}/>
									</button>
								</div>
							))}
						</div>
					)}
				</div>
				<div className={styles.modalFooter}>
					<button className={styles.modalCancelBtn} onClick={onClose}>취소</button>
					<button className={styles.modalSaveBtn} onClick={() => onSave(items)}>저장</button>
				</div>
			</div>
		</div>
	);
};

export default MemoTaskModal;
