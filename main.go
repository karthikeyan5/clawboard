package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"clawboard/internal/auth"
	"clawboard/internal/panels"
	"clawboard/internal/server"
)

const Version = "3.0.0"

type AppConfig struct {
	Auth struct {
		AllowedUsers []int64 `json:"allowedUsers"`
	} `json:"auth"`
	AllowedUsers []int64 `json:"allowedUsers"` // legacy field
	Panels       struct {
		Order    []string `json:"order"`
		Disabled []string `json:"disabled"`
	} `json:"panels"`
	Server struct {
		Port int `json:"port"`
	} `json:"server"`
	Port int `json:"port"` // legacy field
}

func main() {
	rootDir, _ := os.Getwd()

	// TEST_MODE warning
	if os.Getenv("TEST_MODE") == "true" {
		fmt.Println("\n⚠️  TEST_MODE is enabled — auth bypassed")
		fmt.Println("⚠️  Do NOT use in production.")
	}

	// Load config
	configPath := filepath.Join(rootDir, "config.json")
	configData, err := os.ReadFile(configPath)
	if err != nil {
		log.Fatalf("[Config] Failed to load config.json: %s\nCopy config.example.json to config.json and configure it", err)
	}
	var config AppConfig
	if err := json.Unmarshal(configData, &config); err != nil {
		log.Fatalf("[Config] Invalid config.json: %s", err)
	}
	fmt.Println("[Config] Loaded config.json")

	// BOT_TOKEN
	botToken := os.Getenv("BOT_TOKEN")
	if botToken == "" {
		// Try .env file
		envData, err := os.ReadFile(filepath.Join(rootDir, ".env"))
		if err == nil {
			for _, line := range strings.Split(string(envData), "\n") {
				if strings.HasPrefix(line, "BOT_TOKEN=") {
					botToken = strings.TrimPrefix(line, "BOT_TOKEN=")
					botToken = strings.TrimSpace(botToken)
				}
			}
		}
	}
	if botToken == "" {
		log.Fatal("[Fatal] BOT_TOKEN environment variable is required")
	}

	// Cookie secret
	cookieSecretFile := filepath.Join(rootDir, ".cookie-secret")
	cookieSecret, err := os.ReadFile(cookieSecretFile)
	if err != nil {
		secret := make([]byte, 32)
		rand.Read(secret)
		secretStr := hex.EncodeToString(secret)
		os.WriteFile(cookieSecretFile, []byte(secretStr), 0600)
		cookieSecret = []byte(secretStr)
		fmt.Println("[Auth] Generated new cookie secret")
	}

	// Merge allowed users
	allowedUsers := config.Auth.AllowedUsers
	if len(allowedUsers) == 0 {
		allowedUsers = config.AllowedUsers
	}

	// Init auth
	auth.Init(botToken, allowedUsers, strings.TrimSpace(string(cookieSecret)))

	// Port: env PORT > config.server.port > config.port > 3700
	port := 0
	if envPort := os.Getenv("PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			port = p
		}
	}
	if port == 0 {
		port = config.Server.Port
	}
	if port == 0 {
		port = config.Port
	}
	if port == 0 {
		port = 3700
	}

	// Workspace
	workspace := os.Getenv("WORKSPACE")
	if workspace == "" {
		workspace = filepath.Dir(rootDir)
	}

	// Discover panels
	fmt.Println("\n[Panels] Discovering panels...")
	registry, report := panels.DiscoverPanels(rootDir)

	fmt.Printf("\n┌─ Panel Report ────────────────────────\n")
	fmt.Printf("│ Loaded: %d\n", len(report.Loaded))
	for _, p := range report.Loaded {
		fmt.Printf("│   ✓ %s (%s) v%s\n", p.ID, p.Source, p.Version)
	}
	if len(report.Skipped) > 0 {
		fmt.Printf("│ Legacy (no contract): %d\n", len(report.Skipped))
		for _, p := range report.Skipped {
			fmt.Printf("│   ⚠ %s (%s) — %s\n", p.ID, p.Source, p.Reason)
		}
	}
	if len(report.Failed) > 0 {
		fmt.Printf("│ Failed: %d\n", len(report.Failed))
		for _, p := range report.Failed {
			fmt.Printf("│   ✗ %s (%s) — %s\n", p.ID, p.Source, strings.Join(p.Errors, ", "))
		}
	}
	fmt.Printf("└────────────────────────────────────────\n\n")

	// Load version
	version := Version
	versionFile := filepath.Join(rootDir, ".version")
	if vData, err := os.ReadFile(versionFile); err == nil {
		var vInfo map[string]interface{}
		if json.Unmarshal(vData, &vInfo) == nil {
			if v, ok := vInfo["version"].(string); ok {
				version = v
			}
		}
	}

	cfg := &server.Config{
		RootDir:   rootDir,
		Workspace: workspace,
		Port:      port,
		Registry:  registry,
		Order:     config.Panels.Order,
		Disabled:  config.Panels.Disabled,
		Version:   version,
	}

	handler := server.NewServer(cfg)

	addr := fmt.Sprintf(":%d", port)
	fmt.Printf("[Server] Clawboard v%s running on http://0.0.0.0%s\n\n", version, addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		fmt.Fprintf(os.Stderr, "[FATAL] Server failed: %v\n", err)
		os.Exit(1)
	}
}
