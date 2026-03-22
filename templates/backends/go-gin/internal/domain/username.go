package domain

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"
)

var reservedUsernames = map[string]bool{
	"admin": true, "administrator": true, "root": true, "system": true,
	"support": true, "help": true, "info": true, "contact": true,
	"api": true, "www": true, "mail": true, "email": true,
	"test": true, "testing": true, "dev": true, "development": true,
	"null": true, "undefined": true, "true": true, "false": true,
	"me": true, "you": true, "user": true, "users": true,
	"login": true, "logout": true, "register": true, "signup": true,
	"settings": true, "profile": true, "account": true, "dashboard": true,
}

var usernamePattern = regexp.MustCompile(`^[a-z0-9_-]+$`)

func ValidateUsername(username string) error {
	username = strings.TrimSpace(username)

	if len(username) < 3 {
		return fmt.Errorf("username must be at least 3 characters")
	}
	if len(username) > 30 {
		return fmt.Errorf("username must be no more than 30 characters")
	}

	lower := strings.ToLower(username)

	if reservedUsernames[lower] {
		return fmt.Errorf("this username is reserved and cannot be used")
	}

	first := rune(lower[0])
	if !unicode.IsLetter(first) && !unicode.IsNumber(first) {
		return fmt.Errorf("username must start with a letter or number")
	}

	last := rune(lower[len(lower)-1])
	if last == '_' || last == '-' {
		return fmt.Errorf("username cannot end with an underscore or hyphen")
	}

	if !usernamePattern.MatchString(lower) {
		return fmt.Errorf("username can only contain letters, numbers, underscores, and hyphens")
	}

	if strings.Contains(lower, "__") || strings.Contains(lower, "--") {
		return fmt.Errorf("username cannot contain consecutive underscores or hyphens")
	}

	return nil
}

func NormalizeUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}
