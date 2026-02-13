import React, {useState} from "react";
import {
	DndContext,
	closestCenter,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	DragEndEvent
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
	arrayMove
} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {GripVertical, Eye, EyeOff} from "lucide-react";
import styles from "./todo.module.scss";

interface TaskDef{
	key:string;
	label:string;
}

interface TaskSettingsModalProps{
	title:string;
	taskDefs:TaskDef[];
	order?:string[];
	hiddenTasks?:string[];
	onSave:(order:string[], hiddenTasks:string[]) => void;
	onClose:() => void;
}

interface SortableTaskItemProps{
	taskKey:string;
	label:string;
	hidden:boolean;
	onToggleHidden:() => void;
}

const SortableTaskItem:React.FC<SortableTaskItemProps> = ({taskKey, label, hidden, onToggleHidden}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging
	} = useSortable({id: taskKey});

	const style:React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
		zIndex: isDragging ? 10 : undefined
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`${styles.settingsTaskItem} ${isDragging ? styles.dragging : ""} ${hidden ? styles.hidden : ""}`}
		>
			<button className={styles.dragHandle} {...attributes} {...listeners}>
				<GripVertical size={16}/>
			</button>
			<span className={styles.settingsTaskLabel}>{label}</span>
			<button className={styles.visibilityBtn} onClick={onToggleHidden}>
				{hidden ? <EyeOff size={16}/> : <Eye size={16}/>}
			</button>
		</div>
	);
};

const TaskSettingsModal:React.FC<TaskSettingsModalProps> = ({title, taskDefs, order, hiddenTasks, onSave, onClose}) => {
	const [items, setItems] = useState<string[]>(() => {
		const ordered = order && order.length > 0 ? [...order] : taskDefs.map(t => t.key);
		taskDefs.forEach(t => {
			if(!ordered.includes(t.key)) ordered.push(t.key);
		});
		return ordered.filter(key => taskDefs.some(t => t.key === key));
	});
	const [hiddenSet, setHiddenSet] = useState<Set<string>>(() => new Set(hiddenTasks || []));

	const sensors = useSensors(
		useSensor(PointerSensor, {activationConstraint: {distance: 5}}),
		useSensor(TouchSensor, {activationConstraint: {delay: 150, tolerance: 5}})
	);

	const handleDragEnd = (event:DragEndEvent) => {
		const {active, over} = event;
		if(!over || active.id === over.id) return;
		const oldIndex = items.indexOf(String(active.id));
		const newIndex = items.indexOf(String(over.id));
		setItems(arrayMove(items, oldIndex, newIndex));
	};

	const toggleHidden = (key:string) => {
		setHiddenSet(prev => {
			const next = new Set(prev);
			if(next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const labelMap = new Map(taskDefs.map(t => [t.key, t.label]));

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{maxWidth: 400}}>
				<div className={styles.modalHeader}>
					<h3>{title}</h3>
					<button className={styles.modalClose} onClick={onClose}>&times;</button>
				</div>
				<div className={styles.modalBody}>
					<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
						<SortableContext items={items} strategy={verticalListSortingStrategy}>
							<div className={styles.settingsTaskList}>
								{items.map(key => (
									<SortableTaskItem
										key={key}
										taskKey={key}
										label={labelMap.get(key) || key}
										hidden={hiddenSet.has(key)}
										onToggleHidden={() => toggleHidden(key)}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
				</div>
				<div className={styles.modalFooter}>
					<button className={styles.modalCancelBtn} onClick={onClose}>취소</button>
					<button className={styles.modalSaveBtn} onClick={() => onSave(items, Array.from(hiddenSet))}>저장</button>
				</div>
			</div>
		</div>
	);
};

export default TaskSettingsModal;
