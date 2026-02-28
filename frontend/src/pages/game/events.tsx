import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {CalendarDays, ChevronLeft, ChevronRight, Clock3, ExternalLink, FileText, List, X} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {GameEvent} from "@/types";
import {eventService} from "@/services";
import {useSeo} from "@/hooks/use-seo";
import styles from "./events.module.scss";
import type {NormalizedGameEvent, TimelineModel, ParsedSummaryTable, SummaryGroup} from "@/types/ui";

type EventViewMode = "timeline" | "calendar";
type CalendarDensity = "compact" | "expanded";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const TIMELINE_DAY_WIDTH = 44;
const CALENDAR_VISIBLE_EVENTS_COMPACT = 5;
const CALENDAR_VISIBLE_EVENTS_EXPANDED = 10;

const unwrapQuotedContent = (value:string):string => {
	const trimmed = value.trim();
	if(trimmed.length >= 2 && trimmed.startsWith("\"") && trimmed.endsWith("\"")){
		return trimmed.slice(1, -1);
	}
	return trimmed;
};

const getTableCandidates = (value:string):string[] => {
	const base = unwrapQuotedContent(value);
	const candidates = [base];
	if(base.includes("\"\"")){
		candidates.push(base.replace(/\"\"/g, "\""));
	}
	return Array.from(new Set(candidates));
};

const normalizeTableCellText = (cell:HTMLTableCellElement):string => {
	const clone = cell.cloneNode(true) as HTMLElement;
	clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
	const paragraphNodes = Array.from(clone.querySelectorAll("p"));
	paragraphNodes.forEach((paragraph, index) => {
		if(index < paragraphNodes.length - 1){
			paragraph.insertAdjacentText("beforeend", "\n");
		}
	});
	return (clone.textContent || "")
		.replace(new RegExp(String.fromCharCode(160), "g"), " ")
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join("\n");
};

const toInlineText = (value:string):string =>
	value
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join(" / ");

const toTextLines = (value:string):string[] =>
	value
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter(Boolean);

const looksLikeHeaderRow = (cells:HTMLTableCellElement[]):boolean => {
	if(cells.length <= 1){
		return false;
	}
	if(cells.some((cell) => cell.tagName.toLowerCase() === "th")){
		return true;
	}
	return cells.every((cell) => Boolean(cell.querySelector("b,strong")));
};

const parseTableRows = (table:HTMLTableElement):string[][] => {
	const tableRows = Array.from(table.querySelectorAll("tr"));
	type PendingCell = {text:string; rowsLeft:number};
	const pendingCells:Array<PendingCell | null> = [];
	const parsedRows:string[][] = [];
	let maxColumns = 0;

	const consumePendingCells = (row:string[], start:number):number => {
		let column = start;
		while(pendingCells[column]){
			const pending = pendingCells[column];
			if(pending){
				row[column] = pending.text;
				pending.rowsLeft -= 1;
				if(pending.rowsLeft <= 0){
					pendingCells[column] = null;
				}
			}
			column += 1;
		}
		return column;
	};

	for(const tableRow of tableRows){
		const row:string[] = [];
		let column = consumePendingCells(row, 0);
		const cells = Array.from(tableRow.children).filter(
			(node):node is HTMLTableCellElement => node instanceof HTMLTableCellElement
		);

		for(const cell of cells){
			while(row[column] !== undefined){
				column += 1;
			}

			column = consumePendingCells(row, column);

			const text = normalizeTableCellText(cell);
			const colSpan = Math.max(1, Number(cell.getAttribute("colspan") || "1"));
			const rowSpan = Math.max(1, Number(cell.getAttribute("rowspan") || "1"));

			for(let offset = 0 ; offset < colSpan ; offset += 1){
				row[column + offset] = text;
				if(rowSpan > 1){
					// Preserve merged-cell semantics: subsequent rowspan rows keep this column empty.
					pendingCells[column + offset] = {text : "", rowsLeft : rowSpan - 1};
				}
			}

			column += colSpan;
			column = consumePendingCells(row, column);
		}

		consumePendingCells(row, column);
		maxColumns = Math.max(maxColumns, row.length);
		parsedRows.push(row);
	}

	return parsedRows
		.map((row) => Array.from({length : maxColumns}, (_, index) => row[index] || ""))
		.filter((row) => row.some((cell) => cell.trim() !== ""));
};

const parseHtmlSummaryTables = (content:string):ParsedSummaryTable[] => {
	const candidates = getTableCandidates(content);

	for(const candidate of candidates){
		if(!candidate.toLowerCase().includes("<table")){
			continue;
		}

		const doc = new DOMParser().parseFromString(candidate, "text/html");
		const tables = Array.from(doc.querySelectorAll("table"));
		if(tables.length === 0){
			continue;
		}

		const parsed = tables
			.map((table) => {
				const normalizedRows = parseTableRows(table);
				if(normalizedRows.length === 0){
					return null;
				}

				const columnCount = normalizedRows[0]?.length || 0;
				if(columnCount === 0){
					return null;
				}

				const firstRowCells = Array.from(table.querySelectorAll("tr:first-child > th, tr:first-child > td"))
					.filter((node):node is HTMLTableCellElement => node instanceof HTMLTableCellElement);
				const hasHeader = normalizedRows.length > 1 && looksLikeHeaderRow(firstRowCells);
				const headers = hasHeader
					? normalizedRows[0].map((cell, idx) => toInlineText(cell) || `컬럼 ${idx + 1}`)
					: Array.from({length : columnCount}, (_, idx) => idx === 0 ? "항목" : `내용 ${idx}`);
				const rows = hasHeader ? normalizedRows.slice(1) : normalizedRows;
				const hasSpan = Boolean(
					table.querySelector("[rowspan]:not([rowspan='1']), [colspan]:not([colspan='1'])")
				);

				return {
					headers,
					rows,
					columnCount,
					hasHeader,
					hasSpan,
					rawHtml : table.outerHTML
				};
			})
			.filter((table):table is ParsedSummaryTable => table !== null)
			.filter((table) => table.rows.length > 0);

		if(parsed.length > 0){
			return parsed;
		}
	}

	return [];
};

const buildSummaryGroups = (rows:Array<{left:string; right:string}>):SummaryGroup[] => {
	const groups:SummaryGroup[] = [];
	for(const row of rows){
		const normalizedTitle = row.left?.trim() || "-";
		const lastGroup = groups[groups.length - 1];

		if(lastGroup && lastGroup.title === normalizedTitle){
			lastGroup.rows.push(row.right || "-");
			continue;
		}

		groups.push({title : normalizedTitle, rows : [row.right || "-"]});
	}
	return groups;
};

const sanitizeTableHtml = (html:string):string => {
	const doc = new DOMParser().parseFromString(html, "text/html");
	doc.querySelectorAll("script, iframe, object, embed, style, link, meta, base").forEach((node) => node.remove());
	doc.querySelectorAll("table, thead, tbody, tfoot, tr, th, td, colgroup, col").forEach((element) => {
		element.removeAttribute("style");
		element.removeAttribute("width");
		element.removeAttribute("height");
	});

	Array.from(doc.querySelectorAll("*")).forEach((el) => {
		Array.from(el.attributes).forEach((attr) => {
			const name = attr.name.toLowerCase();
			const value = attr.value.trim().toLowerCase();
			if(name.startsWith("on")){
				el.removeAttribute(attr.name);
				return;
			}
			if((name === "href" || name === "src") && (value.startsWith("javascript:") || value.startsWith("data:text/html"))){
				el.removeAttribute(attr.name);
			}
		});
	});

	return doc.body.innerHTML;
};

const getRarityClassName = (value:string):string => {
	const normalized = value.replace(/\s+/g, "");
	if(normalized.includes("고급연금술재연소촉매")) return styles.summaryRarityAdvanced;
	if(normalized.includes("레어연금술재연소촉매")) return styles.summaryRarityRare;
	if(normalized.includes("엘리트연금술재연소촉매")) return styles.summaryRarityElite;
	if(normalized.includes("에픽연금술재연소촉매")) return styles.summaryRarityEpic;
	return "";
};

const EventSummaryContent:React.FC<{content:string}> = ({content}) => {
	const parsedTables = useMemo(() => parseHtmlSummaryTables(content), [content]);
	const renderMultiline = (value:string) => {
		const lines = toTextLines(value);
		if(lines.length === 0){
			return "-";
		}
		return lines.map((line, index) => (
			<React.Fragment key={`${line}-${index}`}>
				{index > 0 && <br/>}
				{line}
			</React.Fragment>
		));
	};

	if(parsedTables.length > 0){
		return (
			<div className={styles.summaryBlocks}>
				{parsedTables.map((table, tableIndex) => {
					if(table.rawHtml){
						return (
							<div
								key={`summary-html-${tableIndex}`}
								className={styles.summaryHtmlWrap}
								dangerouslySetInnerHTML={{__html : sanitizeTableHtml(table.rawHtml)}}
							/>
						);
					}

					if(table.columnCount >= 4){
						return (
							<div key={`summary-data-${tableIndex}`} className={styles.summaryDataWrap}>
								<table className={styles.summaryDataTable}>
									<thead>
										<tr>
											{table.headers.map((header, headerIndex) => (
												<th key={`summary-data-head-${tableIndex}-${headerIndex}`}>
													{toInlineText(header) || `컬럼 ${headerIndex + 1}`}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{table.rows.map((row, rowIndex) => (
											<tr key={`summary-data-row-${tableIndex}-${rowIndex}`}>
												{Array.from({length : table.columnCount}, (_, colIndex) => {
													const cellRaw = row[colIndex] || "";
													const rarityClass = getRarityClassName(toInlineText(cellRaw));
													return (
														<td
															key={`summary-data-cell-${tableIndex}-${rowIndex}-${colIndex}`}
															className={rarityClass}
														>
															{renderMultiline(cellRaw)}
														</td>
													);
												})}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						);
					}

					if(table.columnCount === 1){
						const lines = table.rows.flatMap((row) => toTextLines(row[0] || ""));
						if(lines.length === 0){
							return null;
						}

						return (
							<section key={`summary-text-${tableIndex}`} className={styles.summaryTextCard}>
								{table.hasHeader && table.headers[0] && (
									<h4 className={styles.summaryTextTitle}>{toInlineText(table.headers[0])}</h4>
								)}
								<div className={styles.summaryTextList}>
									{lines.map((line, lineIndex) => (
										<p key={`summary-text-line-${tableIndex}-${lineIndex}`} className={styles.summaryTextLine}>
											{line}
										</p>
									))}
								</div>
							</section>
						);
					}

					if(table.columnCount === 2){
						return (
							<div key={`summary-simple-${tableIndex}`} className={styles.summarySimpleList}>
								{table.rows.map((row, rowIndex) => (
									<div key={`summary-simple-row-${tableIndex}-${rowIndex}`} className={styles.summarySimpleItem}>
										<span className={styles.summarySimpleKey}>{toInlineText(row[0] || "-") || "-"}</span>
										<span className={styles.summarySimpleValue}>{toInlineText(row[1] || "-") || "-"}</span>
									</div>
								))}
							</div>
						);
					}

					const hasMergedFirstColumn = table.rows.some((row) => !toInlineText(row[0] || ""));
					if(table.columnCount === 3 && hasMergedFirstColumn){
						type MatrixRow = {
							groupIndex:number;
							left:string;
							leftRowSpan:number | null;
							middle:string;
							right:string;
						};
						const matrixRows:MatrixRow[] = [];
						let groupIndex = -1;

						for(let rowIndex = 0 ; rowIndex < table.rows.length ; rowIndex += 1){
							const row = table.rows[rowIndex];
							const leftValue = toInlineText(row[0] || "");

							if(leftValue){
								groupIndex += 1;
								let span = 1;
								let probe = rowIndex + 1;
								while(probe < table.rows.length && !toInlineText(table.rows[probe][0] || "")){
									span += 1;
									probe += 1;
								}

								matrixRows.push({
									groupIndex,
									left : row[0] || "-",
									leftRowSpan : span,
									middle : row[1] || "-",
									right : row[2] || "-"
								});

								for(let tail = rowIndex + 1 ; tail < probe ; tail += 1){
									matrixRows.push({
										groupIndex,
										left : "",
										leftRowSpan : null,
										middle : table.rows[tail][1] || "-",
										right : table.rows[tail][2] || "-"
									});
								}
								rowIndex = probe - 1;
								continue;
							}

							const safeGroupIndex = Math.max(groupIndex, 0);
							matrixRows.push({
								groupIndex : safeGroupIndex,
								left : "",
								leftRowSpan : null,
								middle : row[1] || "-",
								right : row[2] || "-"
							});
						}

						return (
							<div key={`summary-matrix-${tableIndex}`} className={styles.summaryMatrixWrap}>
								<table className={styles.summaryMatrixTable}>
									<thead>
										<tr>
											<th>{toInlineText(table.headers[0]) || "항목"}</th>
											<th>{toInlineText(table.headers[1]) || "내용"}</th>
											<th>{toInlineText(table.headers[2]) || "수량"}</th>
										</tr>
									</thead>
									<tbody>
										{matrixRows.map((matrixRow, matrixIndex) => {
											const rowToneClass = matrixRow.groupIndex % 2 === 1 ? styles.summaryMatrixAlt : "";
											const rarityClass = getRarityClassName(toInlineText(matrixRow.middle || ""));
											return (
												<tr key={`summary-matrix-row-${tableIndex}-${matrixIndex}`} className={rowToneClass}>
													{matrixRow.leftRowSpan ? (
														<td rowSpan={matrixRow.leftRowSpan} className={styles.summaryMatrixPeriod}>
															{renderMultiline(matrixRow.left)}
														</td>
													) : null}
													<td className={`${styles.summaryMatrixGift} ${rarityClass}`}>
														{renderMultiline(matrixRow.middle)}
													</td>
													<td className={styles.summaryMatrixQty}>
														{renderMultiline(matrixRow.right)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						);
					}

					let currentLeft = "";
					const condensedRows = table.rows.map((row) => {
						const leftRaw = toInlineText(row[0] || "");
						if(leftRaw){
							currentLeft = leftRaw;
						}
						const left = leftRaw || currentLeft || "-";
						const rightParts:string[] = [];

						for(let col = 1 ; col < table.columnCount ; col += 1){
							const value = toInlineText(row[col] || "");
							if(!value){
								continue;
							}
							const header = toInlineText(table.headers[col] || "");
							rightParts.push(header ? `${header}: ${value}` : value);
						}

						return {left, right : rightParts.join(" / ") || "-"};
					});

					const groups = buildSummaryGroups(condensedRows);

					return (
						<div key={`summary-group-${tableIndex}`} className={styles.summaryGroupGrid}>
							{groups.map((group, groupIndex) => (
								<section key={`summary-group-card-${tableIndex}-${groupIndex}`} className={styles.summaryGroupCard}>
									<h4 className={styles.summaryGroupTitle}>{group.title}</h4>
									<div className={styles.summaryGroupRows}>
										{group.rows.map((line, rowIndex) => (
											<div key={`summary-group-row-${tableIndex}-${groupIndex}-${rowIndex}`} className={styles.summaryGroupRow}>
												<span className={styles.summaryGroupCell}>{line || "-"}</span>
											</div>
										))}
									</div>
								</section>
							))}
						</div>
					);
				})}
			</div>
		);
	}

	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			components={{
				table: ({children, ...props}) => (
					<div className={styles.summaryTableWrap}>
						<table {...props}>{children}</table>
					</div>
				)
			}}
		>
			{content}
		</ReactMarkdown>
	);
};

const toDate = (value:string):Date => {
	const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if(matched){
		const [, year, month, day] = matched;
		return new Date(Number(year), Number(month) - 1, Number(day));
	}

	const parsed = new Date(value);
	if(Number.isNaN(parsed.getTime())){
		return new Date();
	}

	return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const startOfDay = (date:Date):Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfWeek = (date:Date):Date => {
	const day = date.getDay();
	const start = new Date(date);
	start.setDate(date.getDate() - day);
	return startOfDay(start);
};
const addDays = (date:Date, days:number):Date => {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
};
const dayDiff = (a:Date, b:Date) => Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_IN_MS);
const minDate = (a:Date, b:Date) => a.getTime() <= b.getTime() ? a : b;

const normalizeEvent = (event:GameEvent):NormalizedGameEvent => {
	const start = toDate(event.startDate);
	const eventEnd = toDate(event.endDate);
	const fallbackEnd = addDays(start, 30);
	const end = event.permanent ? (Number.isNaN(eventEnd.getTime()) ? fallbackEnd : eventEnd) : eventEnd;
	if(end.getTime() < start.getTime()){
		return {...event, start, end: start};
	}
	return {...event, start, end};
};

const formatDate = (date:Date):string =>
	`${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

const formatShortDate = (date:Date):string =>
	`${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

const toDayKey = (date:Date):string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatPeriod = (event:NormalizedGameEvent):string => {
	if(event.permanent){
		return "상시 이벤트";
	}
	return `${formatDate(event.start)} ~ ${formatDate(event.end)}`;
};

const formatTimeLeft = (endDate:Date):string => {
	const diff = endDate.getTime() - Date.now();
	if(diff <= 0) return "종료";
	const days = Math.floor(diff / DAY_IN_MS);
	const hours = Math.floor((diff % DAY_IN_MS) / 3600000);
	const minutes = Math.floor((diff % 3600000) / 60000);
	if(days > 0) return `D-${days} ${hours}시간`;
	if(hours > 0) return `${hours}시간 ${minutes}분`;
	return `${minutes}분`;
};

const isSameDay = (a:Date, b:Date) =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

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
	const dragStateRef = useRef({dragging: false, startX: 0, startScrollLeft: 0});

	useEffect(() => {
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
			return {start: today, end: today, totalDays: 1, trackWidth: TIMELINE_DAY_WIDTH, days: [today]};
		}

		const start = startOfDay(new Date(Math.min(...normalizedEvents.map((event) => startOfDay(event.start).getTime()))));
		const end = displayRangeEnd.getTime() < start.getTime() ? start : displayRangeEnd;
		const totalDays = Math.max(1, dayDiff(end, start) + 1);
		const days = Array.from({length: totalDays}, (_, index) => addDays(start, index));

		return {
			start,
			end,
			totalDays,
			days,
			trackWidth: totalDays * TIMELINE_DAY_WIDTH
		};
	}, [displayRangeEnd, normalizedEvents]);

	const calendarDays = useMemo(() => {
		return Array.from({length: 14}, (_, index) => addDays(calendarStart, index));
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

		const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
		const targetDayEl = scroller.querySelector<HTMLElement>(`[data-day-key="${todayKey}"]`);

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
		const handleResize = () => centerTimelineOnToday();
		window.addEventListener("resize", handleResize);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", handleResize);
		};
	}, [centerTimelineOnToday, viewMode]);

	const beginTimelineDrag = (clientX:number) => {
		const scroller = timelineScrollRef.current;
		if(!scroller){
			return;
		}
		dragStateRef.current = {
			dragging: true,
			startX: clientX,
			startScrollLeft: scroller.scrollLeft
		};
		setIsTimelineDragging(true);
	};

	const moveTimelineDrag = (clientX:number) => {
		const scroller = timelineScrollRef.current;
		if(!scroller || !dragStateRef.current.dragging){
			return;
		}
		const deltaX = clientX - dragStateRef.current.startX;
		scroller.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
	};

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
					<div className="page-heading">
						<h1>이벤트</h1>
						<p className="page-heading-subtitle">종료 임박 순으로 이벤트를 확인하고 타임라인/2주 달력으로 일정을 보세요</p>
					</div>
					<div className={`${styles.layout} ${styles.loadingLayout}`} aria-busy="true" aria-live="polite">
						<aside className={styles.eventList}>
							<div className={styles.eventListHeader}>
								<List size={16}/>
								<span>이벤트 목록</span>
								<span className={styles.totalCount}>...</span>
							</div>
							<div className={styles.eventListBody}>
								{Array.from({length: 4}).map((_, index) => (
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
				</div>
			</div>
		);
	}

	return (
		<div className={styles.eventsPage}>
			<div className={styles.container}>
				<div className="page-heading">
					<h1>이벤트</h1>
					<p className="page-heading-subtitle">종료 임박 순으로 이벤트를 확인하고 타임라인/2주 달력으로 일정을 보세요</p>
				</div>

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
								<div className={styles.timelineView}>
									<div className={styles.timelineRange}>
										<span>{formatDate(timeline.start)}</span>
										<span>{formatDate(timeline.end)}</span>
									</div>
									<div className={styles.timelineGuide}>가로로 드래그해서 전체 일정을 확인하세요</div>
									<div
										ref={timelineScrollRef}
										className={`${styles.timelineViewport} ${isTimelineDragging ? styles.dragging : ""}`}
										onMouseDown={(e) => beginTimelineDrag(e.clientX)}
										onMouseMove={(e) => moveTimelineDrag(e.clientX)}
										onMouseUp={endTimelineDrag}
										onMouseLeave={endTimelineDrag}
										onTouchStart={(e) => beginTimelineDrag(e.touches[0].clientX)}
										onTouchMove={(e) => {
											moveTimelineDrag(e.touches[0].clientX);
											if(dragStateRef.current.dragging){
												e.preventDefault();
											}
										}}
										onTouchEnd={endTimelineDrag}
									>
										<div className={styles.timelineCanvas}>
											<div className={styles.timelineHeaderRow}>
												<div className={styles.timelineHeaderLabel}/>
												<div className={styles.timelineHeaderTrack} style={{width: `${timeline.trackWidth}px`}}>
													{timeline.days.map((day) => (
														<div
															key={`day-${day.toISOString()}`}
															className={styles.timelineHeaderDay}
															style={{width: `${TIMELINE_DAY_WIDTH}px`}}
															data-day-key={`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`}
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
													const isSelected = selectedEvent?.eventId === event.eventId;

													return (
														<div
															key={`timeline-${event.eventId}`}
															className={`${styles.timelineRow} ${isSelected ? styles.selectedRow : ""}`}
															onClick={() => setSelectedEventId(event.eventId)}
														>
															<div className={styles.timelineLabel}>{event.title}</div>
															<div className={styles.timelineTrack} style={{width: `${timeline.trackWidth}px`}}>
																<div className={styles.timelineDayLines}/>
																<div
																	className={`${styles.timelineBar} ${event.permanent ? styles.permanentBar : ""} ${event.endingSoon ? styles.urgentBar : ""}`}
																	style={{left: `${left}px`, width: `${width}px`}}
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
							) : (
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
													onClick={() => setSelectedCalendarDayKey(dayKey)}
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
																	setSelectedCalendarDayKey(dayKey);
																	setSelectedEventId(event.eventId);
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
														className={`${styles.detailEventItem} ${selectedEvent?.eventId === event.eventId ? styles.detailEventItemActive : ""}`}
														onClick={() => setSelectedEventId(event.eventId)}
													>
														<span className={styles.detailEventTitle}>{event.title}</span>
														<span className={styles.detailEventMeta}>{formatPeriod(event)}</span>
													</button>
												))}
											</div>
										)}
									</div>
								</div>
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
