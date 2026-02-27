package panels

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestDiscoverPanels(t *testing.T) {
	// Create temp panel structure
	tmpDir := t.TempDir()
	panelDir := filepath.Join(tmpDir, "core", "panels", "test-panel")
	os.MkdirAll(panelDir, 0755)

	manifest := PanelManifest{
		ID:              "test-panel",
		ContractVersion: "1.0",
		Name:            "Test",
		Description:     "Test panel",
		Version:         "1.0.0",
		Author:          "test",
		Position:        1,
		Size:            "half",
		RefreshMs:       2000,
		Requires:        []string{},
		Capabilities:    []string{"fetch"},
		DataSchema:      json.RawMessage(`{}`),
	}
	data, _ := json.Marshal(manifest)
	os.WriteFile(filepath.Join(panelDir, "manifest.json"), data, 0644)
	os.WriteFile(filepath.Join(panelDir, "ui.js"), []byte("export default function(){}"), 0644)

	registry, report := DiscoverPanels(tmpDir)

	if len(report.Loaded) != 1 {
		t.Fatalf("expected 1 loaded panel, got %d", len(report.Loaded))
	}
	if report.Loaded[0].ID != "test-panel" {
		t.Errorf("expected test-panel, got %s", report.Loaded[0].ID)
	}
	if registry.Get("test-panel") == nil {
		t.Error("expected panel in registry")
	}
}

func TestValidateManifestSchema(t *testing.T) {
	// Missing fields
	m := &PanelManifest{}
	errors := validateManifestSchema(m, "test")
	if len(errors) == 0 {
		t.Error("expected validation errors for empty manifest")
	}

	// Invalid size
	m = &PanelManifest{
		ID: "test", ContractVersion: "1.0", Name: "T", Description: "D",
		Version: "1.0.0", Author: "a", Size: "invalid", RefreshMs: 2000,
	}
	errors = validateManifestSchema(m, "test")
	found := false
	for _, e := range errors {
		if len(e) > 0 {
			found = true
		}
	}
	if !found {
		t.Error("expected error for invalid size")
	}
}

func TestBuildPanelList(t *testing.T) {
	registry := NewRegistry()
	registry.Set("cpu", &PanelInfo{
		Manifest: &PanelManifest{ID: "cpu", Name: "CPU", Position: 10, Size: "half"},
		Source:   "core",
	})
	registry.Set("_test", &PanelInfo{
		Manifest: &PanelManifest{ID: "_test", Name: "Test", Position: 99, Size: "half"},
		Source:   "core",
	})

	// Without test mode - _test hidden
	list := BuildPanelList(registry, []string{"cpu"}, nil, false)
	if len(list) != 1 {
		t.Fatalf("expected 1 panel without test mode, got %d", len(list))
	}

	// With test mode - _test visible
	list = BuildPanelList(registry, []string{"cpu"}, nil, true)
	if len(list) != 2 {
		t.Fatalf("expected 2 panels with test mode, got %d", len(list))
	}
}
