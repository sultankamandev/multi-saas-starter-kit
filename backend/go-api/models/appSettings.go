package models

import (
	"saas-starter/backend/go-api/database"
	"time"

	"gorm.io/gorm"
)

// AppSettings stores application-wide settings
type AppSettings struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Key       string    `json:"key" gorm:"unique;not null;size:100"`
	Value     string    `json:"value" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// GetSetting retrieves a setting value by key
func GetSetting(key string, defaultValue string) string {
	var setting AppSettings
	if err := database.DB.Where("key = ?", key).First(&setting).Error; err != nil {
		return defaultValue
	}
	return setting.Value
}

// SetSetting creates or updates a setting
func SetSetting(key, value string) error {
	var setting AppSettings
	result := database.DB.Where("key = ?", key).First(&setting)

	if result.Error == gorm.ErrRecordNotFound {
		// Create new setting
		setting = AppSettings{
			Key:   key,
			Value: value,
		}
		return database.DB.Create(&setting).Error
	} else if result.Error != nil {
		return result.Error
	}

	// Update existing setting
	setting.Value = value
	return database.DB.Save(&setting).Error
}
