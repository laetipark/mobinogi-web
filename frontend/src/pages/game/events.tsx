import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {CalendarDays, ChevronLeft, ChevronRight, Clock3, ExternalLink, FileText, List, X} from "lucide-react";
import {GameEvent} from "@/types";
import type {TimelineModel} from "@/types/ui";
import {eventService} from "@/services";
import {useSeo} from "@/hooks/use-seo";
import {
	addDays,
	CALENDAR_VISIBLE_EVENTS_COMPACT,
	CALENDAR_VISIBLE_EVENTS_EXPANDED,
	dayDiff,
	EventSummaryContent,
	EventsCalendarView,
	EventsLoadingLayout,
	EventsTimelineView,
	formatDate,
	formatPeriod,
	formatTimeLeft,
	minDate,
	normalizeEvent,
	startOfDay,
	startOfWeek,
	toDayKey,
	TIMELINE_DAY_WIDTH
} from "@/features/events";
import styles from "./events.module.scss";

type EventViewMode = "timeline" | "calendar";
type CalendarDensity = "compact" | "expanded";

const EventsPage:React.FC = () => {
	useSeo({
		title : "이벤트",
		description : "진행 중인 마비노기 모바일 이벤트를 타임라인과 2주 달력으로 확인하세요.",
		canonicalPath : "/events"
	});

	const [events, setEvents] = useState<GameEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [, setTick] = useState(0);
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<EventViewMode>("timeline");
	const [calendarDensity, setCalendarDensity] = useState<CalendarDensity>("compact");
	const [calendarStart, setCalendarStart] = useState<Date>(() => startOfWeek(new Date()));
	const [selectedCalendarDayKey, setSelectedCalendarDayKey] = useState<string>(() => toDayKey(startOfDay(new Date())));
	const [summaryOpen, setSummaryOpen] = useState(false);
	const [isTimelineDragging, setIsTimelineDragging] = useState(false);
	const timelineScrollRef = useRef<HTMLDivElement | null>(null);
	const dragStateRef = useRef({dragging : false, startX : 0, startScrollLeft : 0});

	useEffect(() => {
		/**
		 * Utility function async.
		 */
		const fetchEvents = async() => {
			try{
				const data = await eventService.getActiveEvents();
				setEvents(data);
				if(data.length > 0){
					setSelectedEventId(data[0].eventId);
				}
			}catch(err){
				console.error("Failed to fetch events:", err);
			}finally{
				setLoading(false);
			}
		};
		fetchEvents();
	}, []);

	useEffect(() => {
		const interval = setInterval(() => setTick((prev) => prev + 1), 60000);
		return () => clearInterval(interval);
	}, []);

	const normalizedEvents = useMemo(() => {
		return events
			.map(normalizeEvent)
			.sort((a, b) => {
				const byEnd = a.end.getTime() - b.end.getTime();
				if(byEnd !== 0){
					return byEnd;
				}
				return a.start.getTime() - b.start.getTime();
			});
	}, [events]);

	const selectedEvent = useMemo(() => {
		if(!selectedEventId){
			return normalizedEvents[0] ?? null;
		}
		return normalizedEvents.find((event) => event.eventId === selectedEventId) ?? normalizedEvents[0] ?? null;
	}, [normalizedEvents, selectedEventId]);

	useEffect(() => {
		if(!summaryOpen){
			return;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		/**
		 * Utility function handleKeyDown.
		 */
		const handleKeyDown = (event:KeyboardEvent) => {
			if(event.key === "Escape"){
				setSummaryOpen(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [summaryOpen]);

	useEffect(() => {
		if(!selectedEvent){
			setSummaryOpen(false);
		}
	}, [selectedEvent]);

	const displayRangeEnd = useMemo(() => {
		if(normalizedEvents.length === 0){
			return addDays(startOfDay(new Date()), 14);
		}

		const finiteEvents = normalizedEvents.filter((event) => !event.permanent && event.end.getFullYear() < 2038);
		const source = finiteEvents.length > 0 ? finiteEvents : normalizedEvents;
		const latestEnd = startOfDay(new Date(Math.max(...source.map((event) => startOfDay(event.end).getTime()))));
		return addDays(latestEnd, 14);
	}, [normalizedEvents]);

	const calendarMinStart = useMemo(() => {
		if(normalizedEvents.length === 0){
			return startOfWeek(new Date());
		}
		const earliestStart = startOfDay(new Date(Math.min(...normalizedEvents.map((event) => startOfDay(event.start).getTime()))));
		return startOfWeek(earliestStart);
	}, [normalizedEvents]);

	const calendarMaxStart = useMemo(() => {
		const maxStart = startOfWeek(addDays(displayRangeEnd, -13));
		return maxStart.getTime() < calendarMinStart.getTime() ? calendarMinStart : maxStart;
	}, [calendarMinStart, displayRangeEnd]);

	const clampCalendarStart = useCallback((candidate:Date) => {
		if(candidate.getTime() < calendarMinStart.getTime()){
			return calendarMinStart;
		}
		if(candidate.getTime() > calendarMaxStart.getTime()){
			return calendarMaxStart;
		}
		return startOfWeek(candidate);
	}, [calendarMaxStart, calendarMinStart]);

	useEffect(() => {
		setCalendarStart((prev) => clampCalendarStart(prev));
	}, [clampCalendarStart]);

	const timeline = useMemo<TimelineModel>(() => {
		if(normalizedEvents.length === 0){
			const today = startOfDay(new Date());
			return {start : today, end : today, totalDays : 1, trackWidth : TIMELINE_DAY_WIDTH, days : [today]};
		}

		const start = startOfDay(new Date(Math.min(...normalizedEvents.map((event) => startOfDay(event.start).getTime()))));
		const end = displayRangeEnd.getTime() < start.getTime() ? start : displayRangeEnd;
		const totalDays = Math.max(1, dayDiff(end, start) + 1);
		const days = Array.from({length : totalDays}, (_, index) => addDays(start, index));

		return {
			start,
			end,
			totalDays,
			days,
			trackWidth : totalDays * TIMELINE_DAY_WIDTH
		};
	}, [displayRangeEnd, normalizedEvents]);

	const calendarDays = useMemo(() => {
		return Array.from({length : 14}, (_, index) => addDays(calendarStart, index));
	}, [calendarStart]);

	const calendarVisibleLimit = calendarDensity === "compact"
		? CALENDAR_VISIBLE_EVENTS_COMPACT
		: CALENDAR_VISIBLE_EVENTS_EXPANDED;

	const getDayEvents = useCallback((day:Date) => {
		const currentDay = startOfDay(day).getTime();
		return normalizedEvents.filter((event) =>
			currentDay >= startOfDay(event.start).getTime() &&
			currentDay <= minDate(startOfDay(event.end), displayRangeEnd).getTime()
		);
	}, [displayRangeEnd, normalizedEvents]);

	const selectedCalendarDay = useMemo(() => {
		return calendarDays.find((day) => toDayKey(day) === selectedCalendarDayKey) ?? calendarDays[0] ?? startOfDay(new Date());
	}, [calendarDays, selectedCalendarDayKey]);

	const selectedCalendarDayEvents = useMemo(() => {
		return getDayEvents(selectedCalendarDay);
	}, [getDayEvents, selectedCalendarDay]);

	useEffect(() => {
		if(calendarDays.length === 0){
			return;
		}
		if(!calendarDays.some((day) => toDayKey(day) === selectedCalendarDayKey)){
			setSelectedCalendarDayKey(toDayKey(calendarDays[0]));
		}
	}, [calendarDays, selectedCalendarDayKey]);

	const centerTimelineOnToday = useCallback(() => {
		const scroller = timelineScrollRef.current;
		if(!scroller){
			return;
		}

		const targetDayEl = scroller.querySelector<HTMLElement>(`[data-day-key="${toDayKey(new Date())}"]`);
		if(targetDayEl){
			const scrollerRect = scroller.getBoundingClientRect();
			const dayRect = targetDayEl.getBoundingClientRect();
			const dayCenter = scroller.scrollLeft + (dayRect.left - scrollerRect.left) + dayRect.width / 2;
			const targetScroll = Math.max(0, dayCenter - scroller.clientWidth / 2);
			const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
			scroller.scrollLeft = Math.min(targetScroll, maxScroll);
			return;
		}

		const today = startOfDay(new Date());
		const todayIndexRaw = dayDiff(today, timeline.start);
		const todayIndex = Math.min(Math.max(todayIndexRaw, 0), timeline.totalDays - 1);
		const targetCenter = todayIndex * TIMELINE_DAY_WIDTH + TIMELINE_DAY_WIDTH / 2;
		const targetScroll = Math.max(0, targetCenter - scroller.clientWidth / 2);
		const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
		scroller.scrollLeft = Math.min(targetScroll, maxScroll);
	}, [timeline.start, timeline.totalDays]);

	useEffect(() => {
		if(viewMode !== "timeline"){
			return;
		}

		const raf = requestAnimationFrame(() => centerTimelineOnToday());
		/**
		 * Utility function handleResize.
		 */
		const handleResize = () => centerTimelineOnToday();
		window.addEventListener("resize", handleResize);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", handleResize);
		};
	}, [centerTimelineOnToday, viewMode]);

	/**
	 * Utility function beginTimelineDrag.
	 */
	const beginTimelineDrag = (clientX:number) => {
		const scroller = timelineScrollRef.current;
		if(!scroller){
			return;
		}
		dragStateRef.current = {
			dragging : true,
			startX : clientX,
			startScrollLeft : scroller.scrollLeft
		};
		setIsTimelineDragging(true);
	};

	/**
	 * Utility function moveTimelineDrag.
	 */
	const moveTimelineDrag = (clientX:number) => {
		const scroller = timelineScrollRef.current;
		if(!scroller || !dragStateRef.current.dragging){
			return;
		}
		const deltaX = clientX - dragStateRef.current.startX;
		scroller.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
	};

	/**
	 * Utility function endTimelineDrag.
	 */
	const endTimelineDrag = () => {
		if(!dragStateRef.current.dragging){
			return;
		}
		dragStateRef.current.dragging = false;
		setIsTimelineDragging(false);
	};

	if(loading){
		return (
			<div className={styles.eventsPage}>
				<div className={styles.container}>
					<h1 className="page-heading">이벤트</h1>
					<EventsLoadingLayout/>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.eventsPage}>
			<div className={styles.container}>
				<h1 className="page-heading">이벤트</h1>

				{normalizedEvents.length === 0 ? (
					<div className={styles.empty}>진행 중인 이벤트가 없습니다.</div>
				) : (
					<div className={styles.layout}>
						<aside className={styles.eventList}>
							<div className={styles.eventListHeader}>
								<List size={16}/>
								<span>이벤트 목록</span>
								<span className={styles.totalCount}>{normalizedEvents.length}</span>
							</div>
							<div className={styles.eventListBody}>
								{normalizedEvents.map((event) => (
									<button
										key={event.eventId}
										type="button"
										className={`${styles.eventItem} ${selectedEvent?.eventId === event.eventId ? styles.activeEvent : ""}`}
										onClick={() => setSelectedEventId(event.eventId)}
									>
										{event.thumbnail && (
											<img
												className={styles.eventItemThumb}
												src={event.thumbnail}
												alt={event.title}
												loading="lazy"
											/>
										)}
										<div className={styles.eventItemTitle}>{event.title}</div>
										<div className={styles.eventItemMeta}>
											<span>{formatPeriod(event)}</span>
											{event.endingSoon && <span className={styles.urgentText}>{formatTimeLeft(event.end)}</span>}
										</div>
									</button>
								))}
							</div>
						</aside>

						<section className={styles.eventPanel}>
							<div className={styles.panelHeader}>
								<div className={styles.panelTitleWrap}>
									<h2>{selectedEvent?.title}</h2>
									{selectedEvent && (
										<div className={styles.panelMeta}>
											<span>{formatPeriod(selectedEvent)}</span>
											{selectedEvent.endingSoon && (
												<span className={styles.urgentText}>
													<Clock3 size={14}/>
													{formatTimeLeft(selectedEvent.end)}
												</span>
											)}
										</div>
									)}
								</div>
								{selectedEvent && (
									<div className={styles.panelActions}>
										<button
											type="button"
											className={styles.summaryButton}
											onClick={() => setSummaryOpen(true)}
										>
											<FileText size={14}/>
											이벤트 요약
										</button>
										<a
											href={`https://mabinogimobile.nexon.com/News/Events/${selectedEvent.eventId}`}
											target="_blank"
											rel="noopener noreferrer"
											className={styles.detailLink}
										>
											페이지 링크
											<ExternalLink size={14}/>
										</a>
									</div>
								)}
							</div>

							<div className={styles.panelControls}>
								<div className={styles.modeSwitch}>
									<button
										type="button"
										className={viewMode === "timeline" ? styles.activeMode : ""}
										onClick={() => setViewMode("timeline")}
									>
										타임라인
									</button>
									<button
										type="button"
										className={viewMode === "calendar" ? styles.activeMode : ""}
										onClick={() => setViewMode("calendar")}
									>
										2주 달력
									</button>
								</div>

								{viewMode === "calendar" && (
									<div className={styles.calendarControlGroup}>
										<div className={styles.calendarDensitySwitch}>
											<button
												type="button"
												className={calendarDensity === "compact" ? styles.activeDensity : ""}
												onClick={() => setCalendarDensity("compact")}
											>
												요약(5개)
											</button>
											<button
												type="button"
												className={calendarDensity === "expanded" ? styles.activeDensity : ""}
												onClick={() => setCalendarDensity("expanded")}
											>
												많이(10개)
											</button>
										</div>
										<div className={styles.calendarNav}>
											<button
												type="button"
												onClick={() => setCalendarStart((prev) => clampCalendarStart(addDays(prev, -14)))}
											>
												<ChevronLeft size={16}/>
											</button>
											<span>
												<CalendarDays size={16}/>
												{formatDate(calendarStart)} ~ {formatDate(addDays(calendarStart, 13))}
											</span>
											<button
												type="button"
												onClick={() => setCalendarStart((prev) => clampCalendarStart(addDays(prev, 14)))}
											>
												<ChevronRight size={16}/>
											</button>
										</div>
									</div>
								)}
							</div>

							{viewMode === "timeline" ? (
								<EventsTimelineView
									timelineScrollRef={timelineScrollRef}
									isTimelineDragging={isTimelineDragging}
									timeline={timeline}
									normalizedEvents={normalizedEvents}
									selectedEventId={selectedEvent?.eventId ?? null}
									onSelectEvent={setSelectedEventId}
									onBeginDrag={beginTimelineDrag}
									onMoveDrag={moveTimelineDrag}
									onEndDrag={endTimelineDrag}
								/>
							) : (
								<EventsCalendarView
									calendarDays={calendarDays}
									selectedCalendarDayKey={selectedCalendarDayKey}
									onSelectCalendarDayKey={setSelectedCalendarDayKey}
									getDayEvents={getDayEvents}
									calendarVisibleLimit={calendarVisibleLimit}
									onSelectEvent={setSelectedEventId}
									selectedEventId={selectedEvent?.eventId ?? null}
									selectedCalendarDay={selectedCalendarDay}
									selectedCalendarDayEvents={selectedCalendarDayEvents}
								/>
							)}
						</section>
					</div>
				)}

				{summaryOpen && selectedEvent && (
					<div
						className={styles.summaryModalOverlay}
						role="presentation"
						onClick={() => setSummaryOpen(false)}
					>
						<div
							className={styles.summaryModal}
							role="dialog"
							aria-modal="true"
							aria-label="이벤트 요약"
							onClick={(event) => event.stopPropagation()}
						>
							<div className={styles.summaryModalHeader}>
								<div className={styles.summaryModalTitle}>
									<FileText size={16}/>
									<h3>{selectedEvent.title}</h3>
								</div>
								<button
									type="button"
									className={styles.summaryModalClose}
									onClick={() => setSummaryOpen(false)}
									aria-label="이벤트 요약 닫기"
								>
									<X size={16}/>
								</button>
							</div>
							<div className={styles.summaryModalBody}>
								{selectedEvent.content?.trim() ? (
									<EventSummaryContent content={selectedEvent.content}/>
								) : (
									<div className={styles.summaryEmpty}>요약 내용이 아직 등록되지 않았습니다.</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default EventsPage;
