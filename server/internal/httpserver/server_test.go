package httpserver

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/Bobsans/WorldMapGuesser/server/internal/store"
	"github.com/Bobsans/WorldMapGuesser/server/internal/webui"
)

func testHandler(t *testing.T) (http.Handler, *store.Store) {
	t.Helper()
	database, err := store.Open(context.Background(), filepath.Join(t.TempDir(), "db.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { database.Close() })
	frontend, err := webui.Handler(fstest.MapFS{"index.html": {Data: []byte("<!doctype html><title>Game</title>")}})
	if err != nil {
		t.Fatal(err)
	}
	return Handler(database, frontend, slog.New(slog.NewTextHandler(io.Discard, nil)), "test-version"), database
}

func request(handler http.Handler, method, path, body, contentType string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	if contentType != "" {
		r.Header.Set("Content-Type", contentType)
	}
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	return w
}

func TestAPIUsesJSONAndPersistsResults(t *testing.T) {
	handler, _ := testHandler(t)
	empty := request(handler, "GET", "/api/scores", "", "")
	if empty.Code != 200 || strings.TrimSpace(empty.Body.String()) != "[]" {
		t.Fatalf("empty leaderboard: %d %s", empty.Code, empty.Body.String())
	}
	payload := `{"user":"Player","result":1,"time":20,"rights":["AD"],"wrongs":["BR"]}`
	saved := request(handler, "POST", "/api/scores", payload, "application/json; charset=utf-8")
	if saved.Code != 200 || strings.TrimSpace(saved.Body.String()) != `{"success":true}` {
		t.Fatalf("save result: %d %s", saved.Code, saved.Body.String())
	}
	top := request(handler, "GET", "/api/scores", "", "")
	var scores []store.Score
	if err := json.Unmarshal(top.Body.Bytes(), &scores); err != nil || len(scores) != 1 || scores[0].User != "Player" {
		t.Fatalf("leaderboard: %s %v", top.Body.String(), err)
	}
	if top.Header().Get("Cache-Control") != "no-store" || !strings.Contains(top.Header().Get("Content-Type"), "application/json") {
		t.Fatal("API cache or content type is incorrect")
	}
	health := request(handler, "GET", "/api/health", "", "")
	if health.Code != 200 || !strings.Contains(health.Body.String(), "test-version") {
		t.Fatalf("health: %d %s", health.Code, health.Body.String())
	}
}

func TestInvalidRequestsDoNotWriteScores(t *testing.T) {
	handler, database := testHandler(t)
	cases := []struct {
		name, body, contentType string
		status                  int
	}{
		{"malformed JSON", "{", "application/json", 400},
		{"null", "null", "application/json", 400},
		{"missing time", `{"user":"A","result":0,"rights":[],"wrongs":[]}`, "application/json", 400},
		{"missing result", `{"user":"A","time":0,"rights":[],"wrongs":[]}`, "application/json", 400},
		{"unknown field", `{"user":"A","result":0,"time":0,"rights":[],"wrongs":[],"extra":true}`, "application/json", 400},
		{"fractional time", `{"user":"A","result":0,"time":1.5,"rights":[],"wrongs":[]}`, "application/json", 400},
		{"negative time", `{"user":"A","result":0,"time":-1,"rights":[],"wrongs":[]}`, "application/json", 400},
		{"mismatched result", `{"user":"A","result":2,"time":1,"rights":["AD"],"wrongs":[]}`, "application/json", 400},
		{"trailing object", `{"user":"A","result":0,"time":0,"rights":[],"wrongs":[]} {}`, "application/json", 400},
		{"oversize body", `{"user":"` + strings.Repeat("x", 70<<10) + `"}`, "application/json", 413},
		{"wrong content type", `{}`, "text/plain", 415},
	}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			response := request(handler, "POST", "/api/scores", test.body, test.contentType)
			if response.Code != test.status || !strings.Contains(response.Body.String(), `"error"`) {
				t.Fatalf("got %d %s", response.Code, response.Body.String())
			}
		})
	}
	scores, _, err := database.Top(context.Background())
	if err != nil || len(scores) != 0 {
		t.Fatalf("invalid results were persisted: %v %v", scores, err)
	}
}

func TestAPIRoutesNeverFallThroughToFrontend(t *testing.T) {
	handler, _ := testHandler(t)
	for _, path := range []string{"/api", "/api/", "/api/missing", "/api/scores/"} {
		response := request(handler, "GET", path, "", "")
		if response.Code != 404 || !strings.Contains(response.Body.String(), `"error"`) {
			t.Fatalf("%s returned %d %s", path, response.Code, response.Body.String())
		}
	}
	for _, path := range []string{"/api/scores", "/api/health"} {
		response := request(handler, "DELETE", path, "", "")
		if response.Code != 405 || response.Header().Get("Allow") == "" {
			t.Fatalf("wrong method on %s returned %d", path, response.Code)
		}
	}
	root := request(handler, "GET", "/", "", "")
	if root.Code != 200 || !strings.Contains(root.Body.String(), "<!doctype html>") {
		t.Fatalf("frontend: %d %s", root.Code, root.Body.String())
	}
}

func TestDatabaseFailureIsReportedAsFailure(t *testing.T) {
	handler, database := testHandler(t)
	database.Close()
	for path, status := range map[string]int{"/api/health": 503, "/api/scores": 500} {
		response := request(handler, "GET", path, "", "")
		if response.Code != status || !strings.Contains(response.Body.String(), `"error"`) {
			t.Fatalf("%s returned %d %s", path, response.Code, response.Body.String())
		}
	}
}
