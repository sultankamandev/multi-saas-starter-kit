package domain

import "time"

type AdminAction struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	AdminID      uint      `json:"admin_id" gorm:"index"`
	AdminEmail   string    `json:"admin_email" gorm:"size:255"`
	Action       string    `json:"action" gorm:"size:50;not null"`
	TargetUserID uint      `json:"target_user_id" gorm:"index"`
	TargetEmail  string    `json:"target_email" gorm:"size:255"`
	Message      string    `json:"message" gorm:"type:text"`
	CreatedAt    time.Time `json:"created_at" gorm:"index"`
}
