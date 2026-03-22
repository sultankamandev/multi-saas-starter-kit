package controllers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/models"
	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// logAdminAction logs an admin action to the database for audit purposes
func logAdminAction(c *gin.Context, action, message string, target models.User) {
	lang := c.MustGet("lang").(string)

	// Get admin ID from context (set by AuthMiddleware)
	adminID, exists := c.Get("userID")
	if !exists {
		// If admin ID not found, log error but don't fail the request
		return
	}

	// Get admin email from database
	var admin models.User
	if err := database.DB.First(&admin, adminID).Error; err != nil {
		// If admin not found, use placeholder
		admin.Email = "unknown"
	} else {
		// If admin found but email not set, use placeholder
		if admin.Email == "" {
			admin.Email = "unknown"
		}
	}

	entry := models.AdminAction{
		AdminID:      adminID.(uint),
		AdminEmail:   admin.Email,
		Action:       action,
		TargetUserID: target.ID,
		TargetEmail:  target.Email,
		Message:      message,
	}

	// Log the action (don't fail the request if logging fails)
	if err := database.DB.Create(&entry).Error; err != nil {
		// Silently log error - don't expose to user
		_ = lang // Avoid unused variable
	}
}

// AdminUsers returns paginated, searchable, and sortable list of users (admin only)
func AdminUsers(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	var users []models.User
	var total int64

	// Parse query parameters (React-Admin format)
	pageStr := c.DefaultQuery("_page", "1")
	limitStr := c.DefaultQuery("_limit", "10")
	sortField := c.DefaultQuery("_sort", "id")
	order := c.DefaultQuery("_order", "asc")
	searchQuery := c.Query("q") // Search query

	// Convert page and limit to integers
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}

	// Calculate offset
	offset := (page - 1) * limit

	// Normalize order (React-Admin uses ASC/DESC, but we need lowercase for SQL)
	orderLower := strings.ToLower(order)
	if orderLower != "asc" && orderLower != "desc" {
		orderLower = "asc"
	}

	// Map sort field names to database column names
	sortColumnMap := map[string]string{
		"id":         "id",
		"first_name": "first_name",
		"last_name":  "last_name",
		"email":      "email",
		"role":       "role",
		"language":   "language",
		"created_at": "created_at",
		"updated_at": "updated_at",
	}

	// Get the actual column name, default to "id" if not found
	sortColumn, exists := sortColumnMap[sortField]
	if !exists {
		sortColumn = "id"
	}

	// Build query
	query := database.DB.Model(&models.User{})

	// Apply search filter if provided
	if searchQuery != "" {
		searchPattern := "%" + searchQuery + "%"
		// Search in first_name, last_name, email, and full name (concatenated)
		// PostgreSQL uses || for string concatenation
		query = query.Where(
			"first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ? OR (first_name || ' ' || last_name) ILIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	// Get total count (for pagination)
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Apply sorting, pagination, and fetch results
	if err := query.Order(fmt.Sprintf("%s %s", sortColumn, orderLower)).
		Limit(limit).
		Offset(offset).
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Convert to response format (without password)
	var userResponses []models.UserResponse
	for _, user := range users {
		userResponses = append(userResponses, models.UserResponse{
			ID:           user.ID,
			Username:     user.Username,
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Email:        user.Email,
			Role:         user.Role,
			Language:     user.Language,
			Country:      user.Country,
			Address:      user.Address,
			Phone:        user.Phone,
			Verified:     user.Verified,
			TwoFAEnabled: user.TwoFAEnabled,
			CreatedAt:    user.CreatedAt,
			UpdatedAt:    user.UpdatedAt,
		})
	}

	// Set X-Total-Count header for React-Admin pagination
	c.Header("X-Total-Count", fmt.Sprintf("%d", total))
	c.Header("Access-Control-Expose-Headers", "X-Total-Count")

	// Return response in React-Admin format (array of users)
	c.JSON(http.StatusOK, userResponses)
}

// AdminGetUser returns a specific user by ID (admin only)
func AdminGetUser(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	userID := c.Param("id")

	var user models.User
	// Explicitly select all columns including address, phone
	if err := database.DB.Select("id, username, first_name, last_name, email, role, language, country, address, phone, verified, two_fa_enabled, created_at, updated_at").First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		log.Printf("❌ Error fetching user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Debug: Log the username value from database
	log.Printf("🔍 AdminGetUser - User ID: %s, Username from DB: '%s' (len: %d, empty: %v)", userID, user.Username, len(user.Username), user.Username == "")
	log.Printf("🔍 AdminGetUser - Full user struct: %+v", user)

	userResponse := models.UserResponse{
		ID:           user.ID,
		Username:     user.Username,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		Email:        user.Email,
		Role:         user.Role,
		Language:     user.Language,
		Country:      user.Country,
		Address:      user.Address,
		Phone:        user.Phone,
		Verified:     user.Verified,
		TwoFAEnabled: user.TwoFAEnabled,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}

	// Debug: Log the response before sending
	log.Printf("🔍 AdminGetUser - UserResponse Username: '%s'", userResponse.Username)

	c.JSON(http.StatusOK, gin.H{
		"message": utils.T(lang, "UserFound"),
		"user":    userResponse,
	})
}

// AdminCreateUser creates a new user (admin only)
func AdminCreateUser(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	var input struct {
		FirstName string `json:"first_name" binding:"required"`
		LastName  string `json:"last_name" binding:"required"`
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password" binding:"required,min=8,max=255"`
		Role      string `json:"role"`
		Language  string `json:"language"`
		Verified  *bool  `json:"verified"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := database.DB.Where("email = ?", input.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": utils.T(lang, "UserAlreadyExists")})
		return
	} else if err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToHashPassword")})
		return
	}

	// Set default role if not provided, and validate role
	role := input.Role
	if role == "" {
		role = "user"
	} else {
		// Validate role to ensure only valid roles are accepted
		validRoles := map[string]bool{"user": true, "admin": true}
		if !validRoles[role] {
			c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "InvalidRole")})
			return
		}
	}

	// Set default language if not provided
	language := input.Language
	if language == "" {
		language = "en"
	}
	// Normalize language code
	if len(language) > 2 {
		language = language[:2]
	}
	language = strings.ToLower(language)
	if !utils.IsLanguageSupported(language) {
		language = "en"
	}

	// Create user
	user := models.User{
		FirstName:    input.FirstName,
		LastName:     input.LastName,
		Email:        input.Email,
		PasswordHash: string(hashedPassword),
		Role:         role,
		Language:     language,
	}

	// Set verified status if provided
	if input.Verified != nil {
		user.Verified = *input.Verified
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToCreateUser")})
		return
	}

	userResponse := models.UserResponse{
		ID:           user.ID,
		Username:     user.Username,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		Email:        user.Email,
		Role:         user.Role,
		Language:     user.Language,
		Country:      user.Country,
		Address:      user.Address,
		Phone:        user.Phone,
		Verified:     user.Verified,
		TwoFAEnabled: user.TwoFAEnabled,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}

	// Log admin action
	logAdminAction(c, "create", fmt.Sprintf("Created new user: %s %s (%s)", user.FirstName, user.LastName, user.Email), user)

	c.JSON(http.StatusCreated, gin.H{
		"message": utils.T(lang, "UserCreated"),
		"user":    userResponse,
	})
}

// AdminUpdateUser updates a user (admin only)
func AdminUpdateUser(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	userID := c.Param("id")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	var input struct {
		Username     string `json:"username"` // Username (optional, validated if provided)
		FirstName    string `json:"first_name"`
		LastName     string `json:"last_name"`
		Email        string `json:"email" binding:"omitempty,email"`
		Password     string `json:"password" binding:"omitempty,min=8,max=255"`
		Role         string `json:"role"`
		Language     string `json:"language"`
		Country      string `json:"country"`
		Address      string `json:"address"`
		Phone        string `json:"phone"`
		Verified     *bool  `json:"verified"`       // Pointer to allow explicit false
		TwoFAEnabled *bool  `json:"two_fa_enabled"` // Enable/disable 2FA for this user
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Update fields - React-Admin sends all form fields, so we update them
	// For required fields, we check if they're not empty
	// For optional fields, we always update (even if empty to allow clearing)
	if input.FirstName != "" {
		user.FirstName = input.FirstName
	}
	if input.LastName != "" {
		user.LastName = input.LastName
	}
	if input.Email != "" {
		// Check if email is already taken by another user
		var existingUser models.User
		if err := database.DB.Where("email = ? AND id != ?", input.Email, userID).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": utils.T(lang, "UserAlreadyExists")})
			return
		} else if err != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
			return
		}
		user.Email = input.Email
	}
	if input.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToHashPassword")})
			return
		}
		user.PasswordHash = string(hashedPassword)
	}

	// Track role change for audit logging
	oldRole := user.Role
	roleChanged := false

	if input.Role != "" {
		// Validate role to ensure only valid roles are accepted
		validRoles := map[string]bool{"user": true, "admin": true}
		if !validRoles[input.Role] {
			c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "InvalidRole")})
			return
		}
		if user.Role != input.Role {
			roleChanged = true
			user.Role = input.Role
		}
	}
	if input.Language != "" {
		// Normalize language code
		language := input.Language
		if len(language) > 2 {
			language = language[:2]
		}
		language = strings.ToLower(language)
		if utils.IsLanguageSupported(language) {
			user.Language = language
		}
	}
	// Update country - always update if provided (React-Admin sends all form fields)
	// Normalize country code (uppercase, max 10 chars)
	if input.Country != "" {
		country := strings.ToUpper(input.Country)
		if len(country) > 10 {
			country = country[:10]
		}
		user.Country = country
	} else {
		// Allow clearing country by sending empty string
		user.Country = ""
	}
	// Update optional fields - always update (React-Admin sends all form fields)
	// This allows clearing fields by sending empty strings
	user.Address = input.Address
	user.Phone = input.Phone

	// Update verification status if provided
	if input.Verified != nil {
		oldVerified := user.Verified
		user.Verified = *input.Verified
		if oldVerified != user.Verified {
			verificationStatus := "verified"
			if !user.Verified {
				verificationStatus = "unverified"
			}
			logAdminAction(c, "UPDATE_USER_VERIFICATION", fmt.Sprintf("Changed user verification status to %s", verificationStatus), user)
		}
	}

	// Update 2FA enabled status if provided
	if input.TwoFAEnabled != nil {
		oldTwoFAEnabled := user.TwoFAEnabled
		user.TwoFAEnabled = *input.TwoFAEnabled
		if oldTwoFAEnabled != user.TwoFAEnabled {
			// If disabling 2FA, also clear TOTP secret if it exists
			if !user.TwoFAEnabled && user.TwoFASecret != "" {
				user.TwoFASecret = ""
				log.Printf("🗑️  Cleared TOTP secret for user %d (2FA disabled by admin)", user.ID)
			}
			twoFAStatus := "enabled"
			if !user.TwoFAEnabled {
				twoFAStatus = "disabled"
			}
			logAdminAction(c, "UPDATE_USER_2FA", fmt.Sprintf("Changed user 2FA status to %s", twoFAStatus), user)
		}
	}

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Log admin action
	logAdminAction(c, "update", fmt.Sprintf("Updated user: %s %s (%s)", user.FirstName, user.LastName, user.Email), user)

	// Log role change separately if role was changed
	if roleChanged {
		logAdminAction(c, "role_change", fmt.Sprintf("Changed role from '%s' to '%s' for user %s", oldRole, user.Role, user.Email), user)

		// Send HTML email notification to user about role change (async)
		go func() {
			userName := user.FirstName
			if user.LastName != "" {
				userName = fmt.Sprintf("%s %s", user.FirstName, user.LastName)
			}
			if userName == "" {
				userName = "User"
			}

			// Get user's language preference, fallback to English
			userLang := user.Language
			if userLang == "" {
				userLang = "en"
			}

			subject := utils.T(userLang, "EmailRoleChangeTitle")
			htmlBody, err := utils.RenderRoleChangeEmail(userLang, userName, oldRole, user.Role)
			if err != nil {
				log.Printf("⚠️  Failed to render role change email template: %v", err)
				return
			}

			if err := utils.SendHTMLEmail(user.Email, subject, htmlBody, true); err != nil {
				log.Printf("⚠️  Failed to send role change notification to %s: %v", user.Email, err)
			}
		}()
	}

	userResponse := models.UserResponse{
		ID:           user.ID,
		Username:     user.Username,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		Email:        user.Email,
		Role:         user.Role,
		Language:     user.Language,
		Country:      user.Country,
		Address:      user.Address,
		Phone:        user.Phone,
		Verified:     user.Verified,
		TwoFAEnabled: user.TwoFAEnabled,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": utils.T(lang, "UserUpdated"),
		"user":    userResponse,
	})
}

// AdminDeleteUser deletes a user (admin only)
func AdminDeleteUser(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	userID := c.Param("id")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Log admin action before deletion (we need user info before deletion)
	logAdminAction(c, "delete", fmt.Sprintf("Deleted user: %s %s (%s)", user.FirstName, user.LastName, user.Email), user)

	// Send HTML email notification to user about account deletion (async, before deletion)
	go func() {
		userName := user.FirstName
		if user.LastName != "" {
			userName = fmt.Sprintf("%s %s", user.FirstName, user.LastName)
		}
		if userName == "" {
			userName = "User"
		}

		// Get user's language preference, fallback to English
		userLang := user.Language
		if userLang == "" {
			userLang = "en"
		}

		subject := utils.T(userLang, "EmailAccountDeletedTitle")
		htmlBody, err := utils.RenderAccountDeletedEmail(userLang, userName, user.Email)
		if err != nil {
			log.Printf("⚠️  Failed to render account deletion email template: %v", err)
			return
		}

		if err := utils.SendHTMLEmail(user.Email, subject, htmlBody, true); err != nil {
			log.Printf("⚠️  Failed to send deletion notification to %s: %v", user.Email, err)
		}
	}()

	// Soft delete (GORM will set DeletedAt)
	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": utils.T(lang, "UserDeleted"),
	})
}

// AdminUpdateUserRole updates a user's role (admin only)
func AdminUpdateUserRole(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	userID := c.Param("id")

	var input struct {
		Role string `json:"role" binding:"required,oneof=admin user"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Track old role for audit logging
	oldRole := user.Role

	// Update role
	user.Role = input.Role
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Log admin action for role change
	logAdminAction(c, "role_change", fmt.Sprintf("Changed role from '%s' to '%s' for user %s", oldRole, user.Role, user.Email), user)

	// Send HTML email notification to user about role change (async)
	go func() {
		userName := user.FirstName
		if user.LastName != "" {
			userName = fmt.Sprintf("%s %s", user.FirstName, user.LastName)
		}
		if userName == "" {
			userName = "User"
		}

		// Get user's language preference, fallback to English
		userLang := user.Language
		if userLang == "" {
			userLang = "en"
		}

		subject := utils.T(userLang, "EmailRoleChangeTitle")
		htmlBody, err := utils.RenderRoleChangeEmail(userLang, userName, oldRole, user.Role)
		if err != nil {
			log.Printf("⚠️  Failed to render role change email template: %v", err)
			return
		}

		if err := utils.SendHTMLEmail(user.Email, subject, htmlBody, true); err != nil {
			log.Printf("⚠️  Failed to send role change notification to %s: %v", user.Email, err)
		}
	}()

	userResponse := models.UserResponse{
		ID:           user.ID,
		Username:     user.Username,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		Email:        user.Email,
		Role:         user.Role,
		Language:     user.Language,
		Country:      user.Country,
		Address:      user.Address,
		Phone:        user.Phone,
		Verified:     user.Verified,
		TwoFAEnabled: user.TwoFAEnabled,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": utils.T(lang, "UserRoleUpdated"),
		"user":    userResponse,
	})
}

// AdminUserStats returns statistics about users (admin only)
func AdminUserStats(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	var totalUsers int64
	var adminUsers int64
	var regularUsers int64

	database.DB.Model(&models.User{}).Count(&totalUsers)
	database.DB.Model(&models.User{}).Where("role = ?", "admin").Count(&adminUsers)
	database.DB.Model(&models.User{}).Where("role = ?", "user").Count(&regularUsers)

	c.JSON(http.StatusOK, gin.H{
		"message": utils.T(lang, "AdminStats"),
		"stats": gin.H{
			"total_users":   totalUsers,
			"admin_users":   adminUsers,
			"regular_users": regularUsers,
		},
	})
}

// GetAdminActions returns the audit log of admin actions (admin only)
func GetAdminActions(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	var actions []models.AdminAction

	// Parse pagination parameters
	pageStr := c.DefaultQuery("_page", "1")
	limitStr := c.DefaultQuery("_limit", "50")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 50
	}

	offset := (page - 1) * limit

	// Get total count
	var total int64
	if err := database.DB.Model(&models.AdminAction{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Fetch actions with pagination, ordered by most recent first
	if err := database.DB.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&actions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Set X-Total-Count header for React-Admin pagination
	c.Header("X-Total-Count", fmt.Sprintf("%d", total))
	c.Header("Access-Control-Expose-Headers", "X-Total-Count")

	c.JSON(http.StatusOK, actions)
}
