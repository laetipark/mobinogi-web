import React from "react";
import styles from "./board-list-table.module.scss";

export type BoardListTableRow = {
	key:React.Key;
	categoryLabel?:string | null;
	title:React.ReactNode;
	titleBadges?:React.ReactNode;
	titleTrailing?:React.ReactNode;
	author:React.ReactNode;
	date:React.ReactNode;
	right:React.ReactNode;
	onClick?:() => void;
	hideRightOnMobile?:boolean;
};

type BoardListTableProps = {
	rows:BoardListTableRow[];
	columns:{
		title:string;
		author:string;
		date:string;
		right:string;
	};
	rightColumnWidth?:"narrow" | "wide";
};

const BoardListTable:React.FC<BoardListTableProps> = ({
	rows,
	columns,
	rightColumnWidth = "narrow"
}) => {
	/**
	 * Utility function handleKeyDown.
	 */
	const handleKeyDown = (event:React.KeyboardEvent<HTMLDivElement>, onClick?:() => void) => {
		if(!onClick){
			return;
		}
		if(event.key === "Enter" || event.key === " "){
			event.preventDefault();
			onClick();
		}
	};

	return (
		<div className={`${styles.postList} ${rightColumnWidth === "wide" ? styles.wideRight : ""}`}>
			<div className={styles.listHeader}>
				<span className={styles.colTitle}>{columns.title}</span>
				<span className={styles.colAuthor}>{columns.author}</span>
				<span className={styles.colDate}>{columns.date}</span>
				<span className={styles.colRight}>{columns.right}</span>
			</div>
			{rows.map((row) => (
				<div
					key={row.key}
					className={`${styles.postRow} ${row.onClick ? styles.clickableRow : ""}`}
					onClick={row.onClick}
					onKeyDown={(event) => handleKeyDown(event, row.onClick)}
					role={row.onClick ? "button" : undefined}
					tabIndex={row.onClick ? 0 : undefined}
				>
					<div className={styles.colTitle}>
						{row.categoryLabel && <span className={styles.categoryTag}>[{row.categoryLabel}]</span>}
						<span className={styles.title}>{row.title}</span>
						{row.titleBadges}
						{row.titleTrailing}
					</div>
					<div className={styles.rowMeta}>
						<span className={styles.colAuthor}>{row.author}</span>
						<span className={styles.colDate}>{row.date}</span>
						<span className={`${styles.colRight} ${row.hideRightOnMobile ? styles.mobileHidden : ""}`}>
							{row.right}
						</span>
					</div>
				</div>
			))}
		</div>
	);
};

export default BoardListTable;
