import React from "react";
import type {NormalizedGameEvent} from "@/types/ui";
import {formatDate, formatPeriod, isSameDay, toDayKey} from "../events-date-utils";
import styles from "@/pages/game/events.module.scss";

type EventsCalendarViewProps = {
	calendarDays:Date[];
	selectedCalendarDayKey:string;
	onSelectCalendarDayKey:(dayKey:string) => void;
	getDayEvents:(day:Date) => NormalizedGameEvent[];
	calendarVisibleLimit:number;
	onSelectEvent:(eventId:string) => void;
	selectedEventId:string | null;
	selectedCalendarDay:Date;
	selectedCalendarDayEvents:NormalizedGameEvent[];
};

const EventsCalendarView:React.FC<EventsCalendarViewProps> = ({
	calendarDays,
	selectedCalendarDayKey,
	onSelectCalendarDayKey,
	getDayEvents,
	calendarVisibleLimit,
	onSelectEvent,
	selectedEventId,
	selectedCalendarDay,
	selectedCalendarDayEvents
}) => (
	<div className={styles.calendarView}>
		<div className={styles.weekHeader}>
			{["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day}>{day}</span>)}
		</div>
		<div className={styles.calendarGrid}>
			{calendarDays.map((day) => {
				const dayEvents = getDayEvents(day);
				const dayKey = toDayKey(day);
				const isSelectedDay = dayKey === selectedCalendarDayKey;

				return (
					<div
						key={day.toISOString()}
						className={`${styles.dayCell} ${isSameDay(day, new Date()) ? styles.today : ""} ${isSelectedDay ? styles.selectedDay : ""}`}
						onClick={() => onSelectCalendarDayKey(dayKey)}
					>
						<div className={styles.dayNumber}>
							{day.getMonth() + 1}.{day.getDate()}
						</div>
						<div className={styles.dayEvents}>
							{dayEvents.slice(0, calendarVisibleLimit).map((event) => (
								<button
									type="button"
									key={`${event.eventId}-${day.toISOString()}`}
									className={`${styles.dayEvent} ${event.endingSoon ? styles.dayEventUrgent : ""}`}
									onClick={(e) => {
										e.stopPropagation();
										onSelectCalendarDayKey(dayKey);
										onSelectEvent(event.eventId);
									}}
								>
									{event.title}
								</button>
							))}
							{dayEvents.length > calendarVisibleLimit && (
								<span className={styles.moreEvents}>+{dayEvents.length - calendarVisibleLimit}</span>
							)}
						</div>
					</div>
				);
			})}
		</div>
		<div className={styles.calendarDetail}>
			<div className={styles.calendarDetailHeader}>
				<strong>{formatDate(selectedCalendarDay)}</strong>
				<span>{selectedCalendarDayEvents.length}개 이벤트</span>
			</div>
			{selectedCalendarDayEvents.length === 0 ? (
				<div className={styles.calendarDetailEmpty}>해당 날짜에 진행 중인 이벤트가 없습니다.</div>
			) : (
				<div className={styles.calendarDetailList}>
					{selectedCalendarDayEvents.map((event) => (
						<button
							key={`detail-${event.eventId}-${toDayKey(selectedCalendarDay)}`}
							type="button"
							className={`${styles.detailEventItem} ${selectedEventId === event.eventId ? styles.detailEventItemActive : ""}`}
							onClick={() => onSelectEvent(event.eventId)}
						>
							<span className={styles.detailEventTitle}>{event.title}</span>
							<span className={styles.detailEventMeta}>{formatPeriod(event)}</span>
						</button>
					))}
				</div>
			)}
		</div>
	</div>
);

export default EventsCalendarView;
