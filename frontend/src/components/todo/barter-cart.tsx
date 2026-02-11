import React, {useState, useEffect} from "react";
import styles from "./todo.module.scss";
import {UserTodoBarter} from "../../types";
import {todoService} from "../../services/todo-service";
import BarterSettingsModal from "./barter-settings-modal";

interface BarterCartProps{
	characterId:number;
	cycle:number;
	cycleLabel:string;
}

const BarterCart:React.FC<BarterCartProps> = ({characterId, cycle, cycleLabel}) => {
	const [barters, setBarters] = useState<UserTodoBarter[]>([]);
	const [loading, setLoading] = useState(true);
	const [showSettings, setShowSettings] = useState(false);

	useEffect(() => {
		loadBarters();
	}, [characterId]);

	const loadBarters = async() => {
		try{
			setLoading(true);
			const data = await todoService.getBarterCart(characterId);
			setBarters(data);
		}catch(err){
			console.error("Failed to load barter cart:", err);
		}finally{
			setLoading(false);
		}
	};

	const handleToggle = async(id:number) => {
		try{
			const updatedList = await todoService.toggleBarterComplete(characterId, id);
			const updatedMap = new Map(updatedList.map(u => [u.id, u]));
			setBarters(prev => prev.map(b => {
				const updated = updatedMap.get(b.id);
				if(updated){
					return {
						...updated,
						itemName: updated.itemName || b.itemName,
						exchangeItemName: updated.exchangeItemName || b.exchangeItemName,
						regionName: updated.regionName || b.regionName,
						npcName: updated.npcName || b.npcName
					};
				}
				return b;
			}));
		}catch(err){
			console.error("Failed to toggle barter:", err);
		}
	};

	const handleRemove = async(id:number) => {
		try{
			await todoService.removeBarterItem(characterId, id);
			setBarters(prev => prev.filter(b => b.id !== id));
		}catch(err){
			console.error("Failed to remove barter:", err);
		}
	};

	// 사이클별 필터링
	const filteredBarters = barters.filter(b => {
		if(b.barterInitCycle !== undefined && b.barterInitCycle !== null){
			return b.barterInitCycle === cycle;
		}
		// barterInitCycle이 없으면 barterCycle 문자열로 판단
		if(cycle === 1) return b.barterCycle === "daily";
		return b.barterCycle === "weekly";
	});

	if(loading){
		return <div className={styles.loading}>로딩 중...</div>;
	}

	const completedCount = filteredBarters.filter(b => b.completed).length;

	return (
		<div className={styles.barterCart}>
			<div className={styles.sectionHeader}>
				<div className={styles.progressInfo}>
					<span className={styles.taskLabel}>{cycleLabel} 물물교환</span>
					{filteredBarters.length > 0 && (
						<span className={styles.counterText}>{completedCount}/{filteredBarters.length}</span>
					)}
				</div>
				<button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>&#9881;</button>
			</div>
			{filteredBarters.length > 0 ? (
				<div className={styles.barterList}>
					{filteredBarters.map(barter => (
						<div key={barter.id} className={`${styles.barterItem} ${barter.completed ? styles.completed : ""}`}>
							<button
								className={`${styles.checkCircle} ${barter.completed ? styles.completed : ""}`}
								onClick={() => handleToggle(barter.id)}
							/>
							<div className={styles.barterInfo}>
								<span className={styles.barterItemName}>{barter.itemName || "물물교환"}</span>
								{barter.regionName && barter.npcName && (
									<span className={styles.barterDetail}>{barter.regionName} - {barter.npcName}</span>
								)}
								{barter.exchangeItemName && (
									<span className={styles.barterDetail}>교환: {barter.exchangeItemName} x{barter.exchangeCost}</span>
								)}
								{(barter.barterServer || barter.barterNpc) && (
									<span className={styles.barterDetail}>
										{barter.barterServer && "서버 공유"}
										{barter.barterServer && barter.barterNpc && " / "}
										{barter.barterNpc && "NPC 공유"}
									</span>
								)}
							</div>
							<button className={styles.removeBtn} onClick={() => handleRemove(barter.id)}>&times;</button>
						</div>
					))}
				</div>
			) : (
				<div className={styles.emptyTracked}>설정에서 물물교환을 추가하세요</div>
			)}

			{showSettings && (
				<BarterSettingsModal
					characterId={characterId}
					cycle={cycle}
					cycleLabel={cycleLabel}
					existingBarters={filteredBarters}
					onUpdate={(updated) => {
						// 다른 사이클의 물물교환은 유지하고 현재 사이클만 교체
						const otherBarters = barters.filter(b => {
							if(b.barterInitCycle !== undefined && b.barterInitCycle !== null){
								return b.barterInitCycle !== cycle;
							}
							if(cycle === 1) return b.barterCycle !== "daily";
							return b.barterCycle !== "weekly";
						});
						setBarters([...otherBarters, ...updated]);
					}}
					onClose={() => setShowSettings(false)}
				/>
			)}
		</div>
	);
};

export default BarterCart;
