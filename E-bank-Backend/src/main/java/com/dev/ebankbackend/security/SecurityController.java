package com.dev.ebankbackend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin("*")
@RequestMapping("/auth")
public class SecurityController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtEncoder jwtEncoder;

    @GetMapping("/profile")
    public org.apache.tomcat.util.net.openssl.ciphers.Authentication authentication(org.apache.tomcat.util.net.openssl.ciphers.Authentication authentication) {
        return authentication;
    }
    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> credentials) {
        String login = credentials.get("email");
        if (login == null || login.isBlank()) {
            login = credentials.get("username");
        }
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(login, credentials.get("password"))
            );

            Instant now = Instant.now();
            String scope = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.joining(" "));

            JwtClaimsSet claims = JwtClaimsSet.builder()
                    .subject(authentication.getName())
                    .issuedAt(now)
                    .expiresAt(now.plus(30, ChronoUnit.MINUTES))
                    .claim("scope", scope)
                    .build();

            String token = jwtEncoder.encode(JwtEncoderParameters.from(
                    JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

            return Map.of("access-token", token);
        } catch (AuthenticationException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication failed. Please check your credentials.");
        } catch (JwtEncodingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Token signing failed. Check JWT_SECRET length.");
        }
    }

}
