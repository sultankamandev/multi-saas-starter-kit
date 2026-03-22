package dto

import (
	"time"

	"saas-starter/backend/go-api/internal/domain"
)

type UserResponse struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Email        string    `json:"email"`
	Role         string    `json:"role"`
	Language     string    `json:"language"`
	Country      string    `json:"country,omitempty"`
	Address      string    `json:"address,omitempty"`
	Phone        string    `json:"phone,omitempty"`
	Verified     bool      `json:"verified"`
	TwoFAEnabled bool      `json:"two_fa_enabled"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// UserToResponse converts a domain User to the API response DTO.
// The external-facing `id` is the UUID public_id, never the internal serial.
func UserToResponse(u *domain.User) UserResponse {
	return UserResponse{
		ID:           u.PublicID,
		Username:     u.Username,
		FirstName:    u.FirstName,
		LastName:     u.LastName,
		Email:        u.Email,
		Role:         u.Role,
		Language:     u.Language,
		Country:      u.Country,
		Address:      u.Address,
		Phone:        u.Phone,
		Verified:     u.Verified,
		TwoFAEnabled: u.TwoFAEnabled,
		CreatedAt:    u.CreatedAt,
		UpdatedAt:    u.UpdatedAt,
	}
}

func UsersToResponse(users []domain.User) []UserResponse {
	result := make([]UserResponse, 0, len(users))
	for i := range users {
		result = append(result, UserToResponse(&users[i]))
	}
	return result
}

type UpdateProfileRequest struct {
	Username     string `json:"username"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Language     string `json:"language"`
	Country      string `json:"country"`
	Address      string `json:"address"`
	Phone        string `json:"phone"`
	TwoFAEnabled *bool  `json:"two_fa_enabled"`
}
