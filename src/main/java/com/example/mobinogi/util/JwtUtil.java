package com.example.mobinogi.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Utility function JWT generation and validation.
 */
@Component
public class JwtUtil{

	/** JWT HMAC secret key text. */
	@Value("${jwt.secret}")
	/**
	 * Field secretKey.
	 */
	private String secretKey;

	/** JWT expiration duration in milliseconds. */
	@Value("${jwt.expiration}")
	/**
	 * Field expiration.
	 */
	private Long expiration;

	/**
	 * Builds signing key from configured secret.
	 *
	 * @return HMAC signing key
	 */
	private SecretKey getSigningKey(){
		byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
		return Keys.hmacShaKeyFor(keyBytes);
	}

	/**
	 * Generates JWT token with user ID and Kakao ID claims.
	 *
	 * @param userId application user ID
	 * @param kakaoId Kakao account ID
	 * @return signed JWT token
	 */
	public String generateToken(Long userId, Long kakaoId){
		Date now = new Date();
		Date expiryDate = new Date(now.getTime() + expiration);

		return Jwts.builder()
			.subject(String.valueOf(userId))
			.claim("kakaoId", kakaoId)
			.issuedAt(now)
			.expiration(expiryDate)
			.signWith(getSigningKey())
			.compact();
	}

	/**
	 * Extracts user ID from JWT token.
	 *
	 * @param token jwt token
	 * @return user ID
	 */
	public Long getUserIdFromToken(String token){
		Claims claims = Jwts.parser()
			.verifyWith(getSigningKey())
			.build()
			.parseSignedClaims(token)
			.getPayload();

		return Long.parseLong(claims.getSubject());
	}

	/**
	 * Extracts Kakao ID claim from JWT token.
	 *
	 * @param token jwt token
	 * @return Kakao ID
	 */
	public Long getKakaoIdFromToken(String token){
		Claims claims = Jwts.parser()
			.verifyWith(getSigningKey())
			.build()
			.parseSignedClaims(token)
			.getPayload();

		return claims.get("kakaoId", Long.class);
	}

	/**
	 * Validates token signature and structure.
	 *
	 * @param token jwt token
	 * @return `true` when token is valid
	 */
	public boolean validateToken(String token){
		try{
			Jwts.parser()
				.verifyWith(getSigningKey())
				.build()
				.parseSignedClaims(token);
			return true;
		}catch(JwtException | IllegalArgumentException e){
			return false;
		}
	}

	/**
	 * Checks whether token is expired.
	 *
	 * @param token jwt token
	 * @return `true` when token is expired or invalid
	 */
	public boolean isTokenExpired(String token){
		try{
			Claims claims = Jwts.parser()
				.verifyWith(getSigningKey())
				.build()
				.parseSignedClaims(token)
				.getPayload();

			return claims.getExpiration().before(new Date());
		}catch(JwtException | IllegalArgumentException e){
			return true;
		}
	}
}
