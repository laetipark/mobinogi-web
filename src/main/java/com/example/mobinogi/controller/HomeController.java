package com.example.mobinogi.controller;

import com.example.mobinogi.dto.board.BoardPostDto;
import com.example.mobinogi.service.board.BoardService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

@Controller
@RequiredArgsConstructor
public class HomeController{

	/** UTF-8 HTML media type for OG-rendered responses. */
	private static final MediaType HTML_UTF8 = MediaType.parseMediaType("text/html;charset=UTF-8");
	/** Site title used in meta tags. */
	private static final String SITE_NAME = "Sexynogi";
	/**
	 * Field DEFAULT_DESCRIPTION.
	 */
	private static final String DEFAULT_DESCRIPTION = "Sexynogi에서 마비노기 모바일 공지, 이벤트, 게시판, 아이템, 갤러리를 한 번에 확인하세요.";
	/** Default share image path. */
	private static final String DEFAULT_IMAGE_PATH = "/thumbnail.png";
	/** Markdown image pattern. */
	private static final Pattern MARKDOWN_IMAGE = Pattern.compile("!\\[[^\\]]*]\\([^)]*\\)");
	/** Markdown link pattern. */
	private static final Pattern MARKDOWN_LINK = Pattern.compile("\\[([^\\]]+)]\\([^)]*\\)");
	/** Markdown inline/fenced code pattern. */
	private static final Pattern MARKDOWN_CODE = Pattern.compile("`{1,3}[^`]*`{1,3}");
	/** HTML tag pattern. */
	private static final Pattern HTML_TAG = Pattern.compile("<[^>]*>");
	/** Markdown symbol cleanup pattern. */
	private static final Pattern MARKDOWN_SYMBOL = Pattern.compile("[#>*_~\\-]+");
	/** Multi-whitespace normalization pattern. */
	private static final Pattern MULTI_WHITESPACE = Pattern.compile("\\s+");

	/** Board preview service for OG metadata. */
	private final BoardService boardService;

	/** Public base URL fallback. */
	@Value("${app.url:https://laetipark.me}")
	/**
	 * Field appUrl.
	 */
	private String appUrl;

	/** Cached static index template. */
	private volatile String cachedIndexTemplate;

	/**
	 * Serves board list route with SEO/OG metadata.
	 *
	 * @param request HTTP request
	 * @return HTML response with dynamic meta tags
	 */
	@GetMapping(value = "/board")
	@ResponseBody
	public ResponseEntity<String> boardListWithOg(HttpServletRequest request){
		String title = "게시판";
		String description = "Sexynogi 게시판 최신 글과 커뮤니티 소식을 확인하세요.";

		try{
			BoardPostDto latest = boardService.previewLatestPost();
			title = "게시판 | " + latest.getTitle();
			description = toSeoDescription(latest.getContent());
		}catch(Exception ignored){
			// Keep default board meta when no posts are available.
		}

		String canonicalUrl = absoluteUrl("/board", request);
		String html = buildHtmlWithMeta(title, description, canonicalUrl, "website", request);
		return ResponseEntity.ok()
			.contentType(HTML_UTF8)
			.header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
			.body(html);
	}

	/**
	 * Serves board detail route with SEO/OG metadata.
	 *
	 * @param postSlug post slug
	 * @param request HTTP request
	 * @return HTML response or redirect to board list
	 */
	@GetMapping(value = "/board/{postSlug:^(?!write$|edit$)[^\\.]+$}")
	@ResponseBody
	public ResponseEntity<String> boardPostWithOg(@PathVariable String postSlug, HttpServletRequest request){
		try{
			BoardPostDto post = boardService.previewPostBySlug(postSlug);
			String canonicalPath = "/board/" + toSlug(post.getTitle());
			String title = post.getTitle();
			String description = toSeoDescription(post.getContent());
			String html = buildHtmlWithMeta(title, description, absoluteUrl(canonicalPath, request), "article", request);

			return ResponseEntity.ok()
				.contentType(HTML_UTF8)
				.header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
				.body(html);
		}catch(Exception e){
			return ResponseEntity.status(302)
				.header(HttpHeaders.LOCATION, "/board")
				.build();
		}
	}

	/**
	 * Forwards guild SPA routes to the frontend entry point.
	 *
	 * @return index forward view
	 */
	@GetMapping(value = {
		"/guild",
		"/guild/",
		"/guild/**",
		"/guild/board",
		"/guild/board/write",
		"/guild/gallery",
		"/guild/{guildSlug:^(?!board$|gallery$)[^\\.]+$}",
		"/guild/{guildSlug:^(?!board$|gallery$)[^\\.]+$}/board",
		"/guild/{guildSlug:^(?!board$|gallery$)[^\\.]+$}/board/write",
		"/guild/{guildSlug:^(?!board$|gallery$)[^\\.]+$}/gallery"
	})
	/**
	 * Returns SPA forward view for guild routes.
	 */
	public String guildFallback(){
		return "forward:/index.html";
	}

	/**
	 * Forwards non-API routes to the frontend entry point.
	 *
	 * @return index forward view
	 */
	@GetMapping(value = {
		"/",
		"/{path:^(?!api$|actuator$|ws$|error$|assets$|webjars$)[^\\.]*$}",
		"/{path:^(?!api$|actuator$|ws$|error$|assets$|webjars$)[^\\.]*$}/**"
	})
	/**
	 * Returns SPA forward view for non-API routes.
	 */
	public String fallback(){
		return "forward:/index.html";
	}

	/**
	 * Builds index HTML with dynamic SEO/OG metadata.
	 *
	 * @param pageTitle page title
	 * @param pageDescription page description
	 * @param canonicalUrl canonical URL
	 * @param ogType Open Graph type
	 * @param request HTTP request
	 * @return rendered HTML
	 */
	private String buildHtmlWithMeta(String pageTitle, String pageDescription, String canonicalUrl, String ogType, HttpServletRequest request){
		String imageUrl = absoluteUrl(DEFAULT_IMAGE_PATH, request);
		String fullTitle = buildFullTitle(pageTitle);
		String escapedTitle = htmlEscape(fullTitle);
		String escapedDescription = htmlEscape(pageDescription);
		String escapedCanonicalUrl = htmlEscape(canonicalUrl);
		String escapedImageUrl = htmlEscape(imageUrl);
		String escapedSiteName = htmlEscape(SITE_NAME);
		String escapedOgType = htmlEscape(ogType);

		String html = loadIndexTemplate();
		html = replaceTitle(html, escapedTitle);
		html = replaceMetaByName(html, "description", escapedDescription);
		html = replaceMetaByName(html, "twitter:card", "summary_large_image");
		html = replaceMetaByName(html, "twitter:title", escapedTitle);
		html = replaceMetaByName(html, "twitter:description", escapedDescription);
		html = replaceMetaByName(html, "twitter:image", escapedImageUrl);
		html = replaceMetaByProperty(html, "og:type", escapedOgType);
		html = replaceMetaByProperty(html, "og:title", escapedTitle);
		html = replaceMetaByProperty(html, "og:description", escapedDescription);
		html = replaceMetaByProperty(html, "og:url", escapedCanonicalUrl);
		html = replaceMetaByProperty(html, "og:image", escapedImageUrl);
		html = replaceMetaByProperty(html, "og:image:alt", htmlEscape("Sexynogi 썸네일"));
		html = replaceMetaByProperty(html, "og:site_name", escapedSiteName);
		html = replaceMetaByProperty(html, "og:locale", "ko_KR");
		html = replaceCanonicalLink(html, escapedCanonicalUrl);
		html = replaceMetaByName(html, "robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");

		if("article".equalsIgnoreCase(ogType)){
			html = replaceMetaByProperty(html, "article:publisher", escapedSiteName);
		}

		return html;
	}

	/**
	 * Loads and caches static index template HTML.
	 *
	 * @return index template HTML
	 */
	private String loadIndexTemplate(){
		if(cachedIndexTemplate != null){
			return cachedIndexTemplate;
		}
		synchronized(this){
			if(cachedIndexTemplate != null){
				return cachedIndexTemplate;
			}
			ClassPathResource resource = new ClassPathResource("static/index.html");
			try{
				cachedIndexTemplate = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
				return cachedIndexTemplate;
			}catch(IOException e){
				cachedIndexTemplate = "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\"><title>Sexynogi</title></head><body><div id=\"root\"></div></body></html>";
				return cachedIndexTemplate;
			}
		}
	}

	/**
	 * Replaces HTML title element.
	 *
	 * @param html source HTML
	 * @param content title content
	 * @return updated HTML
	 */
	private String replaceTitle(String html, String content){
		String tag = "<title>" + content + "</title>";
		String pattern = "(?is)<title>.*?</title>";
		if(Pattern.compile(pattern).matcher(html).find()){
			return html.replaceFirst(pattern, tag);
		}
		return insertBeforeHeadClose(html, tag);
	}

	/**
	 * Replaces meta tag by property attribute.
	 *
	 * @param html source HTML
	 * @param property meta property
	 * @param content meta content
	 * @return updated HTML
	 */
	private String replaceMetaByProperty(String html, String property, String content){
		String tag = "<meta property=\"" + property + "\" content=\"" + content + "\"/>";
		String pattern = "(?is)<meta\\b[^>]*\\bproperty\\s*=\\s*\"" + Pattern.quote(property) + "\"[^>]*>";
		if(Pattern.compile(pattern).matcher(html).find()){
			return html.replaceFirst(pattern, tag);
		}
		return insertBeforeHeadClose(html, tag);
	}

	/**
	 * Replaces meta tag by name attribute.
	 *
	 * @param html source HTML
	 * @param name meta name
	 * @param content meta content
	 * @return updated HTML
	 */
	private String replaceMetaByName(String html, String name, String content){
		String tag = "<meta name=\"" + name + "\" content=\"" + content + "\"/>";
		String pattern = "(?is)<meta\\b[^>]*\\bname\\s*=\\s*\"" + Pattern.quote(name) + "\"[^>]*>";
		if(Pattern.compile(pattern).matcher(html).find()){
			return html.replaceFirst(pattern, tag);
		}
		return insertBeforeHeadClose(html, tag);
	}

	/**
	 * Replaces canonical link element.
	 *
	 * @param html source HTML
	 * @param href canonical URL
	 * @return updated HTML
	 */
	private String replaceCanonicalLink(String html, String href){
		String tag = "<link rel=\"canonical\" href=\"" + href + "\"/>";
		String pattern = "(?is)<link\\b[^>]*\\brel\\s*=\\s*\"canonical\"[^>]*>";
		if(Pattern.compile(pattern).matcher(html).find()){
			return html.replaceFirst(pattern, tag);
		}
		return insertBeforeHeadClose(html, tag);
	}

	/**
	 * Inserts a tag before closing head tag.
	 *
	 * @param html source HTML
	 * @param tag tag HTML
	 * @return updated HTML
	 */
	private String insertBeforeHeadClose(String html, String tag){
		int index = html.toLowerCase().lastIndexOf("</head>");
		if(index < 0){
			return tag + html;
		}
		return html.substring(0, index) + tag + System.lineSeparator() + html.substring(index);
	}

	/**
	 * Builds display title for metadata.
	 *
	 * @param pageTitle page title
	 * @return composed title
	 */
	private String buildFullTitle(String pageTitle){
		String trimmed = pageTitle == null ? "" : pageTitle.trim();
		if(trimmed.isEmpty()){
			return SITE_NAME;
		}
		if(SITE_NAME.equalsIgnoreCase(trimmed)){
			return SITE_NAME;
		}
		return trimmed + " | " + SITE_NAME;
	}

	/**
	 * Converts content to SEO description text.
	 *
	 * @param value raw content
	 * @return SEO description
	 */
	private String toSeoDescription(String value){
		String plain = toPlainText(value);
		if(plain.isBlank()){
			return DEFAULT_DESCRIPTION;
		}
		return plain.length() > 160 ? plain.substring(0, 157) + "..." : plain;
	}

	/**
	 * Converts markdown/html content into plain text.
	 *
	 * @param value raw content
	 * @return plain text
	 */
	private String toPlainText(String value){
		if(value == null){
			return "";
		}
		String normalized = MARKDOWN_IMAGE.matcher(value).replaceAll(" ");
		normalized = MARKDOWN_LINK.matcher(normalized).replaceAll("$1");
		normalized = MARKDOWN_CODE.matcher(normalized).replaceAll(" ");
		normalized = HTML_TAG.matcher(normalized).replaceAll(" ");
		normalized = MARKDOWN_SYMBOL.matcher(normalized).replaceAll(" ");
		normalized = MULTI_WHITESPACE.matcher(normalized).replaceAll(" ").trim();
		return normalized;
	}

	/**
	 * Builds absolute URL for path based on request origin.
	 *
	 * @param path relative path
	 * @param request HTTP request
	 * @return absolute URL
	 */
	private String absoluteUrl(String path, HttpServletRequest request){
		String base = resolveOrigin(request);
		if(path == null || path.isBlank() || "/".equals(path.trim())){
			return base + "/";
		}
		return base + (path.startsWith("/") ? path : "/" + path);
	}

	/**
	 * Resolves request origin with proxy header support.
	 *
	 * @param request HTTP request
	 * @return origin URL
	 */
	private String resolveOrigin(HttpServletRequest request){
		if(request == null){
			return normalizeBaseUrl(appUrl);
		}

		String proto = firstHeader(request, "X-Forwarded-Proto");
		if(proto == null || proto.isBlank()){
			proto = request.getScheme();
		}
		if(proto == null || proto.isBlank()){
			proto = "https";
		}

		String host = firstHeader(request, "X-Forwarded-Host");
		if(host == null || host.isBlank()){
			host = firstHeader(request, "Host");
		}
		if(host != null){
			host = host.split(",")[0].trim();
		}

		if(host == null || host.isBlank()){
			host = request.getServerName();
			int port = request.getServerPort();
			boolean defaultPort = ("http".equalsIgnoreCase(proto) && port == 80)
				|| ("https".equalsIgnoreCase(proto) && port == 443);
			if(port > 0 && !defaultPort){
				host = host + ":" + port;
			}
		}

		if(host == null || host.isBlank()){
			return normalizeBaseUrl(appUrl);
		}

		String normalizedHost = host.replaceAll("/+$", "");
		if(isLocalHost(normalizedHost)){
			return normalizeBaseUrl(appUrl);
		}
		return proto + "://" + normalizedHost;
	}

	/**
	 * Returns first comma-separated header value.
	 *
	 * @param request HTTP request
	 * @param name header name
	 * @return first header value
	 */
	private String firstHeader(HttpServletRequest request, String name){
		String value = request.getHeader(name);
		if(value == null){
			return null;
		}
		return value.split(",")[0].trim();
	}

	/**
	 * Returns whether host is local/private address.
	 *
	 * @param host host string
	 * @return true when local host
	 */
	private boolean isLocalHost(String host){
		if(host == null || host.isBlank()){
			return true;
		}
		String normalized = host.trim().toLowerCase();

		if(normalized.startsWith("[")){
			int end = normalized.indexOf("]");
			if(end > -1){
				normalized = normalized.substring(1, end);
			}
		}else{
			int colon = normalized.indexOf(":");
			if(colon > -1){
				normalized = normalized.substring(0, colon);
			}
		}

		return normalized.equals("localhost")
			|| normalized.equals("0.0.0.0")
			|| normalized.equals("::1")
			|| normalized.equals("app")
			|| normalized.startsWith("127.")
			|| normalized.startsWith("10.")
			|| normalized.startsWith("192.168.")
			|| normalized.matches("^172\\.(1[6-9]|2\\d|3[0-1])\\..*");
	}

	/**
	 * Normalizes configured base URL value.
	 *
	 * @param value raw base URL
	 * @return normalized base URL
	 */
	private String normalizeBaseUrl(String value){
		String target = value == null ? "https://laetipark.me" : value.trim();
		if(target.isBlank()){
			target = "https://laetipark.me";
		}
		return target.replaceAll("/+$", "");
	}

	/**
	 * Converts text to URL slug.
	 *
	 * @param value raw text
	 * @return slug
	 */
	private String toSlug(String value){
		if(value == null){
			return "";
		}
		return value.trim()
			.replaceAll("[^\\p{L}\\p{N}]+", "-")
			.replaceAll("-+", "-")
			.replaceAll("^-|-$", "");
	}

	/**
	 * Escapes text for safe HTML rendering.
	 *
	 * @param value raw text
	 * @return escaped text
	 */
	private String htmlEscape(String value){
		if(value == null){
			return "";
		}
		return HtmlUtils.htmlEscape(value, StandardCharsets.UTF_8.name());
	}
}
