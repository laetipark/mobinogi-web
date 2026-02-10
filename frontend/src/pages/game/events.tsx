import React, {useEffect, useState} from "react";
import {AlertTriangle} from "lucide-react";
import {GameEvent} from "@/types";
import {eventService} from "@/services";
import styles from "./events.module.scss";

const formatDate = (dateStr:string):string => {
	const date = new Date(dateStr);
	return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
};

const EventCard:React.FC<{event:GameEvent; urgent?:boolean}> = ({event, urgent}) => {
	const eventUrl = `https://mabinogimobile.nexon.com/News/Events/${event.eventId}`;

	return (
		<a
			className={`${styles.eventCard} ${urgent ? styles.urgent : ""}`}
			href={eventUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			{event.thumbnail && (
				<img
					className={styles.thumbnail}
					src={event.thumbnail}
					alt={event.title}
					loading="lazy"
				/>
			)}
			<div className={styles.cardBody}>
				<div className={styles.cardHeader}>
					<h3 className={styles.eventTitle}>{event.title}</h3>
					{event.endingSoon && (
						<span className={`${styles.badge} ${styles.badgeUrgent}`}>D-{event.daysLeft}</span>
					)}
					{event.permanent && (
						<span className={`${styles.badge} ${styles.badgePermanent}`}>상시</span>
					)}
				</div>
				<p className={styles.period}>
					{event.permanent
						? "상시 이벤트"
						: `${formatDate(event.startDate)} ~ ${formatDate(event.endDate)}`
					}
				</p>
			</div>
		</a>
	);
};

const EventsPage:React.FC = () => {
	const [events, setEvents] = useState<GameEvent[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchEvents = async () => {
			try{
				const data = await eventService.getActiveEvents();
				setEvents(data);
			}catch(err){
				console.error("Failed to fetch events:", err);
			}finally{
				setLoading(false);
			}
		};
		fetchEvents();
	}, []);

	const urgentEvents = events.filter(e => e.endingSoon);
	const allEvents = events.filter(e => !e.endingSoon);

	if(loading){
		return (
			<div className={styles.eventsPage}>
				<div className={styles.container}>
					<div className={styles.loading}>이벤트를 불러오는 중...</div>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.eventsPage}>
			<div className={styles.container}>
				<h1 className={styles.pageTitle}>이벤트</h1>

				{events.length === 0 && (
					<div className={styles.empty}>진행 중인 이벤트가 없습니다.</div>
				)}

				{urgentEvents.length > 0 && (
					<section className={styles.urgentSection}>
						<h2 className={styles.sectionTitle}>
							<AlertTriangle size={18}/>
							마감 임박
						</h2>
						<div className={styles.urgentGrid}>
							{urgentEvents.map(event => (
								<EventCard key={event.eventId} event={event} urgent/>
							))}
						</div>
					</section>
				)}

				{allEvents.length > 0 && (
					<section>
						{urgentEvents.length > 0 && (
							<h2 className={styles.sectionTitle}>전체 이벤트</h2>
						)}
						<div className={styles.eventGrid}>
							{allEvents.map(event => (
								<EventCard key={event.eventId} event={event}/>
							))}
						</div>
					</section>
				)}
			</div>
		</div>
	);
};

export default EventsPage;
