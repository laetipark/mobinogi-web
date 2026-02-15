import React from "react";
import type {SortableCharacterListProps, SortableItemProps} from "@/types/ui";
export type {SortableCharacterItem} from "@/types/ui";
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
import {GripVertical} from "lucide-react";
import styles from "./sortable-character-list.module.scss";

const SortableItem:React.FC<SortableItemProps> = ({item, index}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging
	} = useSortable({id : item.characterId});
	
	const style:React.CSSProperties = {
		transform : CSS.Transform.toString(transform),
		transition,
		opacity : isDragging ? 0.5 : 1,
		zIndex : isDragging ? 10 : undefined
	};
	
	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`${styles.item} ${isDragging ? styles.dragging : ""}`}
		>
			<button
				className={styles.dragHandle}
				{...attributes}
				{...listeners}
			>
				<GripVertical size={16}/>
			</button>
			<span className={styles.index}>{index + 1}</span>
			<span className={styles.name}>
				{item.characterName}
				{item.serverName && <span className={styles.server}>{item.serverName}</span>}
			</span>
		</div>
	);
};

const SortableCharacterList:React.FC<SortableCharacterListProps> = ({items, onReorder}) => {
	const sensors = useSensors(
		useSensor(PointerSensor, {activationConstraint : {distance : 5}}),
		useSensor(TouchSensor, {activationConstraint : {delay : 150, tolerance : 5}})
	);
	
	const handleDragEnd = (event:DragEndEvent) => {
		const {active, over} = event;
		if(!over || active.id === over.id) return;
		
		const oldIndex = items.findIndex(i => i.characterId === active.id);
		const newIndex = items.findIndex(i => i.characterId === over.id);
		onReorder(arrayMove(items, oldIndex, newIndex));
	};
	
	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={items.map(i => i.characterId)} strategy={verticalListSortingStrategy}>
				<div className={styles.list}>
					{items.map((item, index) => (
						<SortableItem key={item.characterId} item={item} index={index}/>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
};

export default SortableCharacterList;
