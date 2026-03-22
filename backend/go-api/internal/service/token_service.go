package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"time"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/platform/jwt"
	"saas-starter/backend/go-api/internal/repository"
)

type TokenService struct {
	tokens repository.TokenRepository
	jwt    *jwt.Manager
}

func NewTokenService(tokens repository.TokenRepository, jwtMgr *jwt.Manager) *TokenService {
	return &TokenService{tokens: tokens, jwt: jwtMgr}
}

// IssueTokenPair creates a new access + refresh token pair.
// A new token family is created for each login — all refresh tokens
// issued via rotation share the same family_id for theft detection.
func (s *TokenService) IssueTokenPair(ctx context.Context, userID uint, role string, rememberMe bool) (*dto.TokenPair, error) {
	familyID := mustRandomHex(16)
	return s.issueWithFamily(ctx, userID, role, rememberMe, familyID)
}

// RotateResult holds the metadata from a validated refresh token,
// allowing the caller to look up the current user role before
// issuing a new token pair.
type RotateResult struct {
	UserID   uint
	FamilyID string
}

// ValidateAndRevokeRefreshToken checks the incoming refresh token,
// revokes it, and returns the associated metadata.
// If the token was already revoked, the entire family is invalidated
// (token theft detection).
func (s *TokenService) ValidateAndRevokeRefreshToken(ctx context.Context, rawToken string) (*RotateResult, error) {
	tokenHash := domain.HashToken(rawToken)

	stored, err := s.tokens.FindRefreshTokenByHash(ctx, tokenHash)
	if err != nil {
		return nil, domain.NewError(domain.ErrTokenInvalid, "invalid refresh token")
	}

	if stored.Revoked {
		if revokeErr := s.tokens.RevokeTokenFamily(ctx, stored.FamilyID); revokeErr != nil {
			log.Printf("Failed to revoke token family %s: %v", stored.FamilyID, revokeErr)
		}
		return nil, domain.NewError(domain.ErrTokenRevoked, "token reuse detected, all sessions in this family revoked")
	}

	if time.Now().After(stored.ExpiresAt) {
		return nil, domain.NewError(domain.ErrTokenExpired, "refresh token expired")
	}

	if err := s.tokens.RevokeRefreshTokenByHash(ctx, tokenHash); err != nil {
		return nil, err
	}

	return &RotateResult{UserID: stored.UserID, FamilyID: stored.FamilyID}, nil
}

// IssueRotatedPair creates a new token pair within an existing family.
func (s *TokenService) IssueRotatedPair(ctx context.Context, userID uint, role, familyID string) (*dto.TokenPair, error) {
	return s.issueWithFamily(ctx, userID, role, false, familyID)
}

// RevokeRefreshToken revokes a single refresh token by its raw value.
func (s *TokenService) RevokeRefreshToken(ctx context.Context, rawToken string) error {
	return s.tokens.RevokeRefreshTokenByHash(ctx, domain.HashToken(rawToken))
}

// RevokeAllUserTokens revokes every active refresh token for a user.
func (s *TokenService) RevokeAllUserTokens(ctx context.Context, userID uint) error {
	return s.tokens.RevokeAllUserRefreshTokens(ctx, userID)
}

func (s *TokenService) issueWithFamily(ctx context.Context, userID uint, role string, rememberMe bool, familyID string) (*dto.TokenPair, error) {
	accessToken, err := s.jwt.Generate(userID, role, 15*time.Minute)
	if err != nil {
		return nil, err
	}

	rawRT := mustRandomHex(32)

	expiry := 24 * time.Hour
	if rememberMe {
		expiry = 7 * 24 * time.Hour
	}

	rt := &domain.RefreshToken{
		UserID:    userID,
		TokenHash: domain.HashToken(rawRT),
		FamilyID:  familyID,
		ExpiresAt: time.Now().Add(expiry),
	}
	if err := s.tokens.CreateRefreshToken(ctx, rt); err != nil {
		return nil, err
	}

	return &dto.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: rawRT,
		ExpiresIn:    900,
		TokenType:    "Bearer",
	}, nil
}

func mustRandomHex(nBytes int) string {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		panic("crypto/rand failed")
	}
	return hex.EncodeToString(b)
}
