package com.example.mobinogi.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Custom CORS filter applied before security filters.
 */
@Component
@Order(1)
@Slf4j
public class CorsFilter implements Filter{

	/** Allow localhost/127.0.0.1 origins with optional port. */
	private static final Pattern LOCALHOST_PATTERN = Pattern.compile("^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$");

	/** Allow internal mobile tethering/dev subnet origins. */
	private static final Pattern INTERNAL_PATTERN = Pattern.compile("^https?://172\\.30\\.1\\.\\d+(?::\\d+)?$");

	/** Allow fixed production origins. */
	private static final List<String> ALLOWED_FIXED_ORIGINS = List.of(
		"http://laetipark.me",
		"https://laetipark.me",
		"http://www.laetipark.me",
		"https://www.laetipark.me"
	);

	/**
	 * Validates whether request origin is allowed.
	 *
	 * @param origin request origin header value
	 * @return `true` when origin is whitelisted
	 */
	private boolean isAllowedOrigin(String origin){
		if(origin == null || origin.isBlank()){
			return false;
		}

		if(ALLOWED_FIXED_ORIGINS.contains(origin)){
			return true;
		}

		return LOCALHOST_PATTERN.matcher(origin).matches() || INTERNAL_PATTERN.matcher(origin).matches();
	}

	/**
	 * Applies CORS headers and handles preflight requests.
	 *
	 * @param request servlet request
	 * @param response servlet response
	 * @param chain filter chain
	 */
	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
		throws IOException, ServletException{

		HttpServletRequest httpRequest = (HttpServletRequest) request;
		HttpServletResponse httpResponse = (HttpServletResponse) response;

		String origin = httpRequest.getHeader("Origin");
		String method = httpRequest.getMethod();
		String uri = httpRequest.getRequestURI();

		log.info("CORS request: {} {} from origin: {}", method, uri, origin);

		if(isAllowedOrigin(origin)){
			httpResponse.setHeader("Access-Control-Allow-Origin", origin);
		}
		httpResponse.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
		httpResponse.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
		httpResponse.setHeader("Access-Control-Allow-Credentials", "true");
		httpResponse.setHeader("Access-Control-Max-Age", "3600");
		httpResponse.setHeader("Vary", "Origin");

		if("OPTIONS".equalsIgnoreCase(method)){
			log.info("OPTIONS preflight handled: {}", uri);
			httpResponse.setStatus(HttpServletResponse.SC_OK);
			return;
		}

		log.info("Continue request: {} {}", method, uri);
		chain.doFilter(request, response);
	}
}
