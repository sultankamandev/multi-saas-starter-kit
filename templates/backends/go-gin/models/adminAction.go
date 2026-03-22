package models

import (
	"time"

	"gorm.io/gorm"
)

type AdminAction struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	AdminID      uint           `json:"admin_id"`
	AdminEmail   string         `json:"admin_email"`
	Action       string         `json:"action"` // create, update, delete, role_change
	TargetUserID uint           `json:"target_user_id"`
	TargetEmail  string         `json:"target_email"`
	Message      string         `json:"message"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}
