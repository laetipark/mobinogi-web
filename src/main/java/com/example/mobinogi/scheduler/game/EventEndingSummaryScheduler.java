package com.example.mobinogi.scheduler.game;

import com.example.mobinogi.entity.board.BoardPost;
import com.example.mobinogi.entity.game.GameEvent;
import com.example.mobinogi.repository.BoardPostRepository;
import com.example.mobinogi.repository.GameEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventEndingSummaryScheduler{

	/** Scheduler time zone. */
	private static final ZoneId SEOUL_ZONE = ZoneId.of("Asia/Seoul");

	/** Date-time formatter for event end date display. */
	private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

	/** Date formatter for summary title. */
	private static final DateTimeFormatter TITLE_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy'\uB144' MM'\uC6D4' dd'\uC77C'");

	/** Event detail base URL. */
	private static final String EVENT_LINK_BASE_URL = "https://mabinogimobile.nexon.com/News/Events/";

	/** Fixed board category ID used by auto-posted summaries. */
	private static final long FIXED_CATEGORY_ID = 11L;

	/** Maximum bytes for one board content payload. */
	private static final int MAX_CONTENT_BYTES = 3_000_000;

	/** Maximum bytes for one summary section. */
	private static final int SUMMARY_MAX_BYTES = 120_000;

	/** Pattern to keep table blocks as-is in rendered summary. */
	private static final Pattern TABLE_BLOCK_PATTERN = Pattern.compile("(?is)<table[\\s\\S]*?</table>");

	/** Game event repository. */
	private final GameEventRepository gameEventRepository;

	/** Board post repository. */
	private final BoardPostRepository boardPostRepository;

	/** Master toggle for scheduler execution. */
	@Value("${event.ending-summary.enabled:true}")
	/**
	 * Field enabled.
	 */
	private boolean enabled;

	/** Window length (days before end date) for target events. */
	@Value("${event.ending-summary.days-before-end:2}")
	/**
	 * Field daysBeforeEnd.
	 */
	private long daysBeforeEnd;

	/**
	 * Runs once on application startup.
	 */
	@EventListener(ApplicationReadyEvent.class)
	@Transactional
	public void publishEndingSoonEventSummariesOnStartup(){
		runPublishJob("startup");
	}

	/**
	 * Runs by scheduled cron expression.
	 */
	@Scheduled(cron = "${event.ending-summary.cron:0 0 * * * *}", zone = "Asia/Seoul")
	@Transactional
	public void publishEndingSoonEventSummaries(){
		runPublishJob("scheduled");
	}

	/**
	 * Executes the ending-event summary publish flow.
	 *
	 * @param trigger trigger source label
	 */
	private void runPublishJob(String trigger){
		if(!enabled){
			log.debug("Skipping ending event summary publish. reason=disabled, trigger={}", trigger);
			return;
		}
		
		long rangeDays = daysBeforeEnd > 0 ? daysBeforeEnd : 2;
		LocalDateTime now = LocalDateTime.now(SEOUL_ZONE);
		LocalDateTime windowEnd = now.plusDays(rangeDays);
		
		List<GameEvent> events = gameEventRepository
			.findByDeletedAtIsNullAndEndDateAfterAndEndDateLessThanEqualOrderByEndDateAsc(now, windowEnd);
		
		if(events.isEmpty()){
			log.info("No ending events to publish. trigger={}, window={}~{}", trigger, now, windowEnd);
			return;
		}
		
		List<GameEvent> unpostedEvents = events.stream()
			.filter(event -> !boardPostRepository.existsByTitle(buildTrackerTitle(event)))
			.toList();
		
		if(unpostedEvents.isEmpty()){
			log.info("No new ending events to publish. trigger={}, checkedEvents={}", trigger, events.size());
			return;
		}
		
		List<GameEvent> remainingEvents = new ArrayList<>(unpostedEvents);
		LocalDateTime trackerDeletedAt = LocalDateTime.now(SEOUL_ZONE);
		int postedEvents = 0;
		int postedBatches = 0;
		
		while(!remainingEvents.isEmpty()){
			BatchPayload payload = buildBatchPayload(remainingEvents);
			if(payload.includedEvents().isEmpty()){
				log.warn(
					"Skipped ending event summary post because batch payload is empty after size control. trigger={}, remainingEvents={}",
					trigger,
					remainingEvents.size()
				);
				break;
			}
			
			postedBatches++;
			String batchTitle = buildBatchTitle(payload.includedEvents(), postedBatches);
			
			BoardPost post = BoardPost.builder()
				.categoryId(FIXED_CATEGORY_ID)
				.title(batchTitle)
				.content(payload.content())
				.viewCount(0)
				.isWiki(false)
				.build();
			boardPostRepository.save(post);
			
			for(GameEvent event : payload.includedEvents()){
				BoardPost tracker = BoardPost.builder()
					.categoryId(FIXED_CATEGORY_ID)
					.title(buildTrackerTitle(event))
					.content(buildTrackerContent(event))
					.viewCount(0)
					.isWiki(false)
					.deletedAt(trackerDeletedAt)
					.build();
				boardPostRepository.save(tracker);
			}
			
			postedEvents += payload.includedEvents().size();
			remainingEvents.removeAll(payload.includedEvents());
		}
		
		log.info(
			"Ending event summary published. trigger={}, checkedEvents={}, postedEvents={}, deferredEvents={}, batches={}",
			trigger,
			events.size(),
			postedEvents,
			remainingEvents.size(),
			postedBatches
		);
	}

	/**
	 * Builds one batch payload under content size limit.
	 *
	 * @param events target events
	 * @return batch payload
	 */
	private BatchPayload buildBatchPayload(List<GameEvent> events){
		StringBuilder builder = new StringBuilder();
		
		List<GameEvent> includedEvents = new ArrayList<>();
		for(GameEvent event : events){
			String section = buildEventSection(event, includedEvents.size() + 1);
			String separator = includedEvents.isEmpty() ? "" : "\n\n----------------------------------------\n\n";
			String candidate = separator + section;
			
			if(utf8ByteLength(builder + candidate) > MAX_CONTENT_BYTES){
				break;
			}
			
			builder.append(candidate);
			includedEvents.add(event);
		}
		
		return new BatchPayload(includedEvents, builder.toString());
	}

	/**
	 * Builds summary post title.
	 *
	 * @param events included events
	 * @param batchIndex batch index
	 * @return title text
	 */
	private String buildBatchTitle(List<GameEvent> events, int batchIndex){
		LocalDateTime baseEndDate = events.stream()
			.map(GameEvent::getEndDate)
			.filter(Objects::nonNull)
			.findFirst()
			.orElse(LocalDateTime.now(SEOUL_ZONE));
		
		String dayOfWeek = baseEndDate.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.KOREAN);
        String title = String.format("%s(%s) \uB05D\uB098\uB294 \uC774\uBCA4\uD2B8", baseEndDate.format(TITLE_DATE_FORMATTER), dayOfWeek);
		if(batchIndex > 1){
            title += " " + batchIndex + "\uCC28";
		}
		return shortenText(title);
	}

	/**
	 * Builds markdown section for one event.
	 *
	 * @param event target event
	 * @param order section order number
	 * @return event section text
	 */
	private String buildEventSection(GameEvent event, int order){
		String title = normalizeOrDash(event.getTitle());
		String link = buildEventLink(event.getEventId());
		String endDate = formatDate(event.getEndDate());
		String summary = formatSummaryForSection(extractSummary(event.getContent()));
		
		return "### " + order + ". " + "\uC774\uBCA4\uD2B8 \uBA85: [" + title + "](" + link + ")" + "\n" +
			"   **\uC774\uBCA4\uD2B8 \uC885\uB8CC\uC77C:** " + endDate + "\n" +
			"   **\uC774\uBCA4\uD2B8 \uC694\uC57D:**" + "\n" + summary + "\n";
	}

	/**
	 * Builds hidden tracker title for duplicate check.
	 *
	 * @param event target event
	 * @return tracker title
	 */
	private String buildTrackerTitle(GameEvent event){
		return shortenText("[tracker] " + normalizeOrDash(event.getTitle()));
	}

	/**
	 * Builds hidden tracker content payload.
	 *
	 * @param event target event
	 * @return tracker content
	 */
	private String buildTrackerContent(GameEvent event){
		return "tracker:" + buildEventLink(event.getEventId());
	}

	/**
	 * Builds event detail link.
	 *
	 * @param eventId event ID
	 * @return event URL
	 */
	private String buildEventLink(String eventId){
		return EVENT_LINK_BASE_URL + URLEncoder.encode(normalizeOrDash(eventId), StandardCharsets.UTF_8);
	}

	/**
	 * Extracts and truncates summary content.
	 *
	 * @param rawContent raw event content
	 * @return sanitized summary
	 */
	private String extractSummary(String rawContent){
		String cleanedHtml = sanitizeSummaryHtml(rawContent);
		if(cleanedHtml.isEmpty()){
			return "";
		}
		if(utf8ByteLength(cleanedHtml) <= SUMMARY_MAX_BYTES){
			return cleanedHtml;
		}
		String summaryText = normalizeSummaryText(cleanedHtml);
		if(summaryText.isEmpty()){
			return "";
		}
		return truncateUtf8(summaryText);
	}

	/**
	 * Removes unsafe or irrelevant HTML blocks from summary.
	 *
	 * @param value raw content
	 * @return sanitized HTML
	 */
	private String sanitizeSummaryHtml(String value){
		if(value == null){
			return "";
		}
		return value
			.replaceAll("(?is)<script[\\s\\S]*?</script>", " ")
			.replaceAll("(?is)<style[\\s\\S]*?</style>", " ")
			.replaceAll("(?is)<!--.*?-->", " ")
			.replaceAll("(?i)Some events are deferred to the next run because of content length limits\\.", " ")
			.trim();
	}

	/**
	 * Converts HTML summary to normalized plain text.
	 *
	 * @param value raw summary
	 * @return normalized text
	 */
	private String normalizeSummaryText(String value){
		if(value == null){
			return "";
		}
		String withLineBreaks = value
			.replaceAll("(?i)<br\\s*/?>", "\n")
			.replaceAll("(?i)</p\\s*>", "\n")
			.replaceAll("(?i)</li\\s*>", "\n")
			.replaceAll("(?i)</tr\\s*>", "\n")
			.replaceAll("(?i)</h[1-6]\\s*>", "\n")
			.replaceAll("(?i)<hr\\s*/?>", "\n");
		
		String withoutTags = withLineBreaks.replaceAll("(?is)<[^>]+>", " ");
		
		return withoutTags
			.replace("&nbsp;", " ")
			.replace("&amp;", "&")
			.replace("&lt;", "<")
			.replace("&gt;", ">")
			.replace("&quot;", "\"")
			.replace("&#39;", "'")
			.replaceAll("[ \\t\\x0B\\f\\r]+", " ")
			.replaceAll("\\n{3,}", "\n\n")
			.replaceAll(" *\\n *", "\n")
			.trim();
	}

	/**
	 * Formats summary as table-friendly section content.
	 *
	 * @param summary summary text/html
	 * @return formatted summary block
	 */
	private String formatSummaryForSection(String summary){
		if(summary == null || summary.isBlank()){
			return "<table><tbody><tr><th>\uC694\uC57D</th><td>No summary available</td></tr></tbody></table>";
		}
		String tableOnlySummary = extractTableOnlySummary(summary);
		if(!tableOnlySummary.isBlank()){
			return tableOnlySummary;
		}
		String normalizedText = normalizeSummaryText(summary);
		if(normalizedText.isEmpty()){
			return "<table><tbody><tr><th>\uC694\uC57D</th><td>No summary available</td></tr></tbody></table>";
		}
		return "<table><tbody><tr><th>\uC694\uC57D</th><td>" + escapeHtml(normalizedText).replace("\n", "<br/>") + "</td></tr></tbody></table>";
	}

	/**
	 * Extracts table blocks only from summary HTML.
	 *
	 * @param summary summary HTML
	 * @return concatenated table HTML
	 */
	private String extractTableOnlySummary(String summary){
		Matcher matcher = TABLE_BLOCK_PATTERN.matcher(summary);
		StringBuilder tables = new StringBuilder();
		while(matcher.find()){
			if(!tables.isEmpty()){
				tables.append("<br/>");
			}
			tables.append(matcher.group());
		}
		return tables.toString().trim();
	}

	/**
	 * Escapes HTML special characters.
	 *
	 * @param value raw text
	 * @return escaped text
	 */
	private String escapeHtml(String value){
		return value
			.replace("&", "&amp;")
			.replace("<", "&lt;")
			.replace(">", "&gt;")
			.replace("\"", "&quot;")
			.replace("'", "&#39;");
	}

	/**
	 * Formats date to scheduler display pattern.
	 *
	 * @param value date value
	 * @return formatted date or dash
	 */
	private String formatDate(LocalDateTime value){
		return value == null ? "-" : value.format(DATE_TIME_FORMATTER);
	}

	/**
	 * Normalizes string and falls back to dash.
	 *
	 * @param value raw text
	 * @return normalized text or dash
	 */
	private String normalizeOrDash(String value){
		String normalized = normalize(value);
		return normalized.isEmpty() ? "-" : normalized;
	}

	/**
	 * Trims nullable text.
	 *
	 * @param value raw text
	 * @return normalized text
	 */
	private String normalize(String value){
		return value == null ? "" : value.trim();
	}

	/**
	 * Truncates text to title-safe length.
	 *
	 * @param value raw text
	 * @return truncated text
	 */
	private String shortenText(String value){
		if(value.length() <= 200){
			return value;
		}
		return value.substring(0, 200 - 3) + "...";
	}

	/**
	 * Returns UTF-8 byte length.
	 *
	 * @param value text value
	 * @return byte length
	 */
	private int utf8ByteLength(String value){
		return value.getBytes(StandardCharsets.UTF_8).length;
	}

	/**
	 * Truncates text under UTF-8 summary byte limit.
	 *
	 * @param value summary text
	 * @return truncated summary
	 */
	private String truncateUtf8(String value){
		byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
		if(bytes.length <= EventEndingSummaryScheduler.SUMMARY_MAX_BYTES){
			return value;
		}
		
		int end = value.length();
		while(end > 0 && value.substring(0, end).getBytes(StandardCharsets.UTF_8).length > EventEndingSummaryScheduler.SUMMARY_MAX_BYTES){
			end--;
		}
		return end > 3 ? value.substring(0, end - 3) + "..." : value.substring(0, end);
	}

	/**
	 * Batch payload container.
	 *
	 * @param includedEvents included events
	 * @param content summary content
	 */
	private record BatchPayload(List<GameEvent> includedEvents, String content){
	}
}

