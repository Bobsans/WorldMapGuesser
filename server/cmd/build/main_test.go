package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStageAssetsReplacesOnlyGeneratedBundle(t *testing.T) {
	root := t.TempDir()
	source := filepath.Join(root, "web", "dist")
	target := filepath.Join(root, "server", "internal", "webui", "dist")
	for _, directory := range []string{source, target} {
		if err := os.MkdirAll(directory, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(target, "stale.js"), []byte("old"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := stageAssets(root); err == nil {
		t.Fatal("bundle without index.html was accepted")
	}
	if _, err := os.Stat(filepath.Join(target, "stale.js")); err != nil {
		t.Fatal("previous bundle was removed after a failed frontend build")
	}
	if err := os.WriteFile(filepath.Join(source, "index.html"), []byte("new"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(source, ".env"), []byte("not public"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := stageAssets(root); err != nil {
		t.Fatal(err)
	}
	content, err := os.ReadFile(filepath.Join(target, "index.html"))
	if err != nil || string(content) != "new" {
		t.Fatalf("index: %q %v", content, err)
	}
	if _, err := os.Stat(filepath.Join(target, "stale.js")); !os.IsNotExist(err) {
		t.Fatal("stale bundle asset remains")
	}
	if _, err := os.Stat(filepath.Join(target, ".env")); !os.IsNotExist(err) {
		t.Fatal("hidden frontend file was packaged")
	}
}
