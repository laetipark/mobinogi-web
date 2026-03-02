package com.example.mobinogi.filter;

import com.example.mobinogi.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Populates Spring Security context from JWT bearer token.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter{

	/** JWT utility. */
	private final JwtUtil jwtUtil;

	/**
	 * Initializes JWT filter.
	 *
	 * @param jwtUtil jwt utility
	 */
	public JwtAuthenticationFilter(JwtUtil jwtUtil){
		this.jwtUtil = jwtUtil;
	}

	/**
	 * Validates bearer token and sets authentication context.
	 *
	 * @param request http request
	 * @param response http response
	 * @param filterChain filter chain
	 */
	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException{
		try{
			String token = getTokenFromRequest(request);

			if(StringUtils.hasText(token) && jwtUtil.validateToken(token)){
				Long userId = jwtUtil.getUserIdFromToken(token);

				UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
					userId,
					null,
					Collections.emptyList()
				);

				authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
				SecurityContextHolder.getContext().setAuthentication(authentication);
			}
		}catch(Exception e){
			logger.error("Could not set user authentication in security context", e);
		}

		filterChain.doFilter(request, response);
	}

	/**
	 * Extracts bearer token from Authorization header.
	 *
	 * @param request http request
	 * @return token or null
	 */
	private String getTokenFromRequest(HttpServletRequest request){
		String bearerToken = request.getHeader("Authorization");
		if(StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")){
			return bearerToken.substring(7);
		}
		return null;
	}
}
