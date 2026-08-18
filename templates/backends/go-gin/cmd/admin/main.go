// Command admin promotes an existing account to the admin role.
//
// A fresh install has no admin: every registration gets role "user", so /admin
// stays locked until an account is promoted by hand. Register through the app
// first, then:
//
//	go run ./cmd/admin you@example.com
//
// Only DATABASE_URL is read, so this works without the rest of the server's
// configuration being present.
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/platform/database"
)

func main() {
	log.SetFlags(0)
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "usage: admin <email>\n\nPromotes an existing account to the admin role.\n")
	}
	flag.Parse()

	email := strings.TrimSpace(flag.Arg(0))
	if email == "" {
		flag.Usage()
		os.Exit(2)
	}

	_ = godotenv.Load()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is not set (copy .env.example to .env, or export it)")
	}

	db := database.Connect(databaseURL)

	// Login lookups are case-insensitive everywhere else (idx_users_email_lower),
	// so match that here instead of making the operator guess the stored casing.
	//
	// Find rather than First: First treats "no rows" as an error, and GORM's
	// default logger prints that as a red stack trace on the way out — right
	// after the clean message below, which reads like something broke.
	var user domain.User
	result := db.Where("LOWER(email) = LOWER(?)", email).Limit(1).Find(&user)
	if result.Error != nil {
		log.Fatal("lookup failed: ", result.Error)
	}
	if result.RowsAffected == 0 {
		log.Fatalf("no account found for %q — register through the app first", email)
	}

	if user.Role == "admin" && user.Verified {
		fmt.Printf("%s is already an admin.\n", user.Email)
		return
	}

	// Verified is forced alongside the role: while email verification is on, an
	// unverified admin cannot log in, which would leave the console unreachable.
	if err := db.Model(&user).Updates(map[string]any{
		"role":     "admin",
		"verified": true,
	}).Error; err != nil {
		log.Fatal("failed to promote user: ", err)
	}

	fmt.Printf("Promoted %s to admin.\n", user.Email)
	fmt.Println("Log out and back in — the role is carried in the JWT, so an existing token still says \"user\".")
}
