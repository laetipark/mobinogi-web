package com.example.mobinogi.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil{

	@Value("${jwt.secret}")
	private String secretKey;

	@Value("${jwt.expiration}")
	private Long expiration;

	private SecretKey getSigningKey(){
		byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
		return Keys.hmacShaKeyFor(keyBytes);
	}

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

	public Long getUserIdFromToken(String token){
		Claims claims = Jwts.parser()
			.verifyWith(getSigningKey())
			.build()
			.parseSignedClaims(token)
			.getPayload();

		return Long.parseLong(claims.getSubject());
	}

	public Long getKakaoIdFromToken(String token){
		Claims claims = Jwts.parser()
			.verifyWith(getSigningKey())
			.build()
			.parseSignedClaims(token)
			.getPayload();

		return claims.get("kakaoId", Long.class);
	}

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
