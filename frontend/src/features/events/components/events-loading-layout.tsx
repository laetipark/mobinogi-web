import React from "react";
import {List} from "lucide-react";
import styles from "@/pages/game/events.module.scss";

const EventsLoadingLayout:React.FC = () => (
	<div className={`${styles.layout} ${styles.loadingLayout}`} aria-busy="true" aria-live="polite">
		<aside className={styles.eventList}>
			<div className={styles.eventListHeader}>
				<List size={16}/>
				<span>이벤트 목록</span>
				<span className={styles.totalCount}>...</span>
			</div>
			<div className={styles.eventListBody}>
				{Array.from({length : 4}).map((_, index) => (
					<div key={index} className={styles.skeletonEventItem}>
						<div className={`${styles.skeletonBlock} ${styles.skeletonThumb}`}/>
						<div className={`${styles.skeletonBlock} ${styles.skeletonLineLg}`}/>
						<div className={`${styles.skeletonBlock} ${styles.skeletonLineMd}`}/>
						<div className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`}/>
					</div>
				))}
			</div>
		</aside>
		<section className={styles.eventPanel}>
			<div className={styles.skeletonPanelHeader}>
				<div className={styles.skeletonPanelTitleWrap}>
					<div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`}/>
					<div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`}/>
				</div>
				<div className={styles.skeletonPanelActions}>
					<div className={`${styles.skeletonBlock} ${styles.skeletonChip}`}/>
					<div className={`${styles.skeletonBlock} ${styles.skeletonChip}`}/>
				</div>
			</div>
			<div className={styles.skeletonPanelBody}>
				<div className={`${styles.skeletonBlock} ${styles.skeletonToolbar}`}/>
				<div className={`${styles.skeletonBlock} ${styles.skeletonBodyBlock}`}/>
				<div className={`${styles.skeletonBlock} ${styles.skeletonBodyBlock}`}/>
			</div>
		</section>
	</div>
);

export default EventsLoadingLayout;
