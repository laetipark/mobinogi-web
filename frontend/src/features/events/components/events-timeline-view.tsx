import React from "react";
import type {NormalizedGameEvent, TimelineModel} from "@/types/ui";
import {TIMELINE_DAY_WIDTH} from "../events-domain";
import {dayDiff, formatDate, formatPeriod, formatShortDate, minDate, startOfDay, toDayKey} from "../events-date-utils";
import styles from "@/pages/game/events.module.scss";

type EventsTimelineViewProps = {
	timelineScrollRef:React.RefObject<HTMLDivElement | null>;
	isTimelineDragging:boolean;
	timeline:TimelineModel;
	normalizedEvents:NormalizedGameEvent[];
	selectedEventId:string | null;
	onSelectEvent:(eventId:string) => void;
	onBeginDrag:(clientX:number) => void;
	onMoveDrag:(clientX:number) => void;
	onEndDrag:() => void;
};

const EventsTimelineView:React.FC<EventsTimelineViewProps> = ({
	timelineScrollRef,
	isTimelineDragging,
	timeline,
	normalizedEvents,
	selectedEventId,
	onSelectEvent,
	onBeginDrag,
	onMoveDrag,
	onEndDrag
}) => (
	<div className={styles.timelineView}>
		<div className={styles.timelineRange}>
			<span>{formatDate(timeline.start)}</span>
			<span>{formatDate(timeline.end)}</span>
		</div>
		<div className={styles.timelineGuide}>가로로 드래그해서 전체 일정을 확인하세요</div>
		<div
			ref={timelineScrollRef}
			className={`${styles.timelineViewport} ${isTimelineDragging ? styles.dragging : ""}`}
			onMouseDown={(e) => onBeginDrag(e.clientX)}
			onMouseMove={(e) => onMoveDrag(e.clientX)}
			onMouseUp={onEndDrag}
			onMouseLeave={onEndDrag}
			onTouchStart={(e) => onBeginDrag(e.touches[0].clientX)}
			onTouchMove={(e) => {
				onMoveDrag(e.touches[0].clientX);
				if(isTimelineDragging){
					e.preventDefault();
				}
			}}
			onTouchEnd={onEndDrag}
		>
			<div className={styles.timelineCanvas}>
				<div className={styles.timelineHeaderRow}>
					<div className={styles.timelineHeaderLabel}/>
					<div className={styles.timelineHeaderTrack} style={{width : `${timeline.trackWidth}px`}}>
						{timeline.days.map((day) => (
							<div
								key={`day-${day.toISOString()}`}
								className={styles.timelineHeaderDay}
								style={{width : `${TIMELINE_DAY_WIDTH}px`}}
								data-day-key={toDayKey(day)}
							>
								{formatShortDate(day)}
							</div>
						))}
					</div>
				</div>

				<div className={styles.timelineRows}>
					{normalizedEvents.map((event) => {
						const eventStart = startOfDay(event.start);
						const eventEnd = minDate(startOfDay(event.end), timeline.end);
						const left = dayDiff(eventStart, timeline.start) * TIMELINE_DAY_WIDTH;
						const durationDays = Math.max(1, dayDiff(eventEnd, eventStart) + 1);
						const width = Math.max(18, durationDays * TIMELINE_DAY_WIDTH - 4);
						const isSelected = selectedEventId === event.eventId;

						return (
							<div
								key={`timeline-${event.eventId}`}
								className={`${styles.timelineRow} ${isSelected ? styles.selectedRow : ""}`}
								onClick={() => onSelectEvent(event.eventId)}
							>
								<div className={styles.timelineLabel}>{event.title}</div>
								<div className={styles.timelineTrack} style={{width : `${timeline.trackWidth}px`}}>
									<div className={styles.timelineDayLines}/>
									<div
										className={`${styles.timelineBar} ${event.permanent ? styles.permanentBar : ""} ${event.endingSoon ? styles.urgentBar : ""}`}
										style={{left : `${left}px`, width : `${width}px`}}
									>
										<span>{event.permanent ? "상시" : formatPeriod(event)}</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	</div>
);

export default EventsTimelineView;
