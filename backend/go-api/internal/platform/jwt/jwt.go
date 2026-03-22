package jwt

import (
	"errors"
	"fmt"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID uint   `json:"user_id"`
	Role   string `json:"role"`
	jwtlib.RegisteredClaims
}

type Manager struct {
	secret   []byte
	issuer   string
	audience string
}

func NewManager(secret, issuer, audience string) *Manager {
	return &Manager{
		secret:   []byte(secret),
		issuer:   issuer,
		audience: audience,
	}
}

func (m *Manager) Generate(userID uint, role string, duration time.Duration) (string, error) {
	if duration <= 0 {
		return "", errors.New("jwt: duration must be positive")
	}

	now := time.Now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwtlib.RegisteredClaims{
			Issuer:    m.issuer,
			Audience:  jwtlib.ClaimStrings{m.audience},
			ExpiresAt: jwtlib.NewNumericDate(now.Add(duration)),
			IssuedAt:  jwtlib.NewNumericDate(now),
			NotBefore: jwtlib.NewNumericDate(now),
		},
	}

	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

func (m *Manager) Validate(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwtlib.ParseWithClaims(tokenString, claims, func(token *jwtlib.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwtlib.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return m.secret, nil
	},
		jwtlib.WithIssuer(m.issuer),
		jwtlib.WithAudience(m.audience),
	)
	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
