import React, {useMemo} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {ParsedSummaryTable, SummaryGroup} from "@/types/ui";
import styles from "@/pages/game/events.module.scss";

/**
 * Utility function unwrapQuotedContent.
 */
const unwrapQuotedContent = (value:string):string => {
	const trimmed = value.trim();
	if(trimmed.length >= 2 && trimmed.startsWith("\"") && trimmed.endsWith("\"")){
		return trimmed.slice(1, -1);
	}
	return trimmed;
};

/**
 * Utility function getTableCandidates.
 */
const getTableCandidates = (value:string):string[] => {
	const base = unwrapQuotedContent(value);
	const candidates = [base];
	if(base.includes("\"\"")){
		candidates.push(base.replace(/\"\"/g, "\""));
	}
	return Array.from(new Set(candidates));
};

/**
 * Utility function normalizeTableCellText.
 */
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

/**
 * Utility function toInlineText.
 */
const toInlineText = (value:string):string =>
	value
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join(" / ");

/**
 * Utility function toTextLines.
 */
const toTextLines = (value:string):string[] =>
	value
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter(Boolean);

/**
 * Utility function looksLikeHeaderRow.
 */
const looksLikeHeaderRow = (cells:HTMLTableCellElement[]):boolean => {
	if(cells.length <= 1){
		return false;
	}
	if(cells.some((cell) => cell.tagName.toLowerCase() === "th")){
		return true;
	}
	return cells.every((cell) => Boolean(cell.querySelector("b,strong")));
};

/**
 * Utility function parseTableRows.
 */
const parseTableRows = (table:HTMLTableElement):string[][] => {
	const tableRows = Array.from(table.querySelectorAll("tr"));
	type PendingCell = {text:string; rowsLeft:number};
	const pendingCells:Array<PendingCell | null> = [];
	const parsedRows:string[][] = [];
	let maxColumns = 0;

	/**
	 * Utility function consumePendingCells.
	 */
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

/**
 * Utility function parseHtmlSummaryTables.
 */
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

/**
 * Utility function buildSummaryGroups.
 */
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

/**
 * Utility function sanitizeTableHtml.
 */
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

/**
 * Utility function getRarityClassName.
 */
const getRarityClassName = (value:string):string => {
	const normalized = value.replace(/\s+/g, "");
	if(normalized.includes("고급연금술재연소촉매")) return styles.summaryRarityAdvanced;
	if(normalized.includes("레어연금술재연소촉매")) return styles.summaryRarityRare;
	if(normalized.includes("엘리트연금술재연소촉매")) return styles.summaryRarityElite;
	if(normalized.includes("에픽연금술재연소촉매")) return styles.summaryRarityEpic;
	return "";
};

type EventSummaryContentProps = {
	content:string;
};

const EventSummaryContent:React.FC<EventSummaryContentProps> = ({content}) => {
	const parsedTables = useMemo(() => parseHtmlSummaryTables(content), [content]);
	/**
	 * Utility function renderMultiline.
	 */
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

export default EventSummaryContent;
