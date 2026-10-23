package webui

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func TestStaticFilesAndCachePolicy(t *testing.T) {
	handler, err := Handler(fstest.MapFS{
		"index.html":             {Data: []byte("<!doctype html><title>Game</title>")},
		"assets/app-12345678.js": {Data: []byte("console.log('game');")},
	})
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/", "/index.html"} {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest("GET", path, nil))
		if response.Code != 200 || response.Header().Get("Cache-Control") != "no-cache" {
			t.Fatalf("%s: status=%d headers=%v", path, response.Code, response.Header())
		}
	}
	asset := httptest.NewRecorder()
	handler.ServeHTTP(asset, httptest.NewRequest("GET", "/assets/app-12345678.js", nil))
	if asset.Code != 200 || !strings.Contains(asset.Header().Get("Cache-Control"), "immutable") || !strings.Contains(asset.Header().Get("Content-Type"), "javascript") {
		t.Fatalf("asset: status=%d headers=%v", asset.Code, asset.Header())
	}
	conditional := httptest.NewRequest("GET", "/assets/app-12345678.js", nil)
	conditional.Header.Set("If-None-Match", asset.Header().Get("ETag"))
	cached := httptest.NewRecorder()
	handler.ServeHTTP(cached, conditional)
	if cached.Code != http.StatusNotModified || cached.Body.Len() != 0 {
		t.Fatalf("conditional request: %d %s", cached.Code, cached.Body.String())
	}
	head := httptest.NewRecorder()
	handler.ServeHTTP(head, httptest.NewRequest("HEAD", "/assets/app-12345678.js", nil))
	if head.Code != 200 || head.Body.Len() != 0 || head.Header().Get("Content-Length") == "" {
		t.Fatalf("HEAD: %d %v", head.Code, head.Header())
	}
}

func TestStaticHandlerDoesNotExposeDirectoriesOrOtherFiles(t *testing.T) {
	handler, err := Handler(fstest.MapFS{
		"index.html":             {Data: []byte("game")},
		"assets/app-12345678.js": {Data: []byte("game")},
		".env":                   {Data: []byte("not public")},
		"assets/.env":            {Data: []byte("not public")},
	})
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/assets/", "/missing.js", "/.env", "/assets/.env", "/../.env"} {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest("GET", path, nil))
		if response.Code != 404 {
			t.Fatalf("%s returned %d", path, response.Code)
		}
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest("POST", "/", nil))
	if response.Code != 405 {
		t.Fatalf("POST / returned %d", response.Code)
	}
}

func TestStaticHandlerRequiresBuiltIndex(t *testing.T) {
	if _, err := Handler(fstest.MapFS{}); err == nil {
		t.Fatal("missing frontend was accepted")
	}
}
