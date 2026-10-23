package store

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"reflect"
	"sync"
	"testing"
)

func validScore() Score {
	return Score{User: "Player", Result: 1, Time: 20, Rights: []string{"AD"}, Wrongs: []string{"BR"}}
}

func openTestStore(t *testing.T, filename string) *Store {
	t.Helper()
	database, err := Open(context.Background(), filename)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { database.Close() })
	return database
}

func TestLegacyDatabaseIsPreservedAndMigrationIsRepeatable(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "db.sqlite")
	legacy, err := sql.Open("sqlite", filename)
	if err != nil {
		t.Fatal(err)
	}
	for _, statement := range []string{
		"CREATE TABLE results (user TEXT, result INT, time INT, rights TEXT, wrongs TEXT)",
		`INSERT INTO results VALUES ('Old Player', 2, 45, '[ "AD" ]', '["BR"]')`,
		`INSERT INTO results VALUES ('Faster Player', 2, 20, '["RU","AD"]', '[]')`,
		`INSERT INTO results VALUES ('Invalid JSON', 200, 1, 'broken', '[]')`,
		`INSERT INTO results VALUES ('Invalid Score', 999, 0, '[]', '[]')`,
	} {
		if _, err := legacy.Exec(statement); err != nil {
			t.Fatal(err)
		}
	}
	legacy.Close()
	for attempt := range 2 {
		database := openTestStore(t, filename)
		scores, skipped, err := database.Top(context.Background())
		if err != nil || skipped != 2 || len(scores) != 2 {
			t.Fatalf("attempt %d: scores=%v skipped=%d error=%v", attempt, scores, skipped, err)
		}
		if scores[0].User != "Faster Player" || scores[1].User != "Old Player" {
			t.Fatalf("ranking changed: %v", scores)
		}
		var count, version int
		var originalRights string
		if err := database.db.QueryRow("SELECT COUNT(*) FROM results").Scan(&count); err != nil || count != 4 {
			t.Fatalf("legacy records changed: count=%d error=%v", count, err)
		}
		if err := database.db.QueryRow("SELECT rights FROM results WHERE user = 'Old Player'").Scan(&originalRights); err != nil || originalRights != `[ "AD" ]` {
			t.Fatalf("legacy value changed: %q error=%v", originalRights, err)
		}
		if err := database.db.QueryRow("PRAGMA user_version").Scan(&version); err != nil || version != 1 {
			t.Fatalf("schema version=%d error=%v", version, err)
		}
		database.Close()
	}
}

func TestSavePersistsAndRankingReturnsTenResults(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "db.sqlite")
	database := openTestStore(t, filename)
	for index := range 12 {
		score := validScore()
		score.User = fmt.Sprintf("Player %d", index)
		score.Time = int64(12 - index)
		if err := database.Save(context.Background(), score); err != nil {
			t.Fatal(err)
		}
	}
	database.Close()
	database = openTestStore(t, filename)
	scores, skipped, err := database.Top(context.Background())
	if err != nil || skipped != 0 || len(scores) != 10 || scores[0].Time != 1 || scores[9].Time != 10 {
		t.Fatalf("scores=%v skipped=%d error=%v", scores, skipped, err)
	}
	if !reflect.DeepEqual(scores[0].Rights, []string{"AD"}) || !reflect.DeepEqual(scores[0].Wrongs, []string{"BR"}) {
		t.Fatalf("answer map changed: %+v", scores[0])
	}
}

func TestConcurrentSavesDoNotLoseResults(t *testing.T) {
	database := openTestStore(t, filepath.Join(t.TempDir(), "db.sqlite"))
	var workers sync.WaitGroup
	for index := range 16 {
		workers.Go(func() {
			score := validScore()
			score.User = fmt.Sprintf("Player %d", index)
			if err := database.Save(context.Background(), score); err != nil {
				t.Error(err)
			}
		})
	}
	workers.Wait()
	var count int
	if err := database.db.QueryRow("SELECT COUNT(*) FROM results").Scan(&count); err != nil || count != 16 {
		t.Fatalf("saved %d results: %v", count, err)
	}
}

func TestNewerOrIncompatibleSchemasAreNotReplaced(t *testing.T) {
	for _, schema := range []string{
		"CREATE TABLE results (original TEXT); INSERT INTO results VALUES ('keep me'); PRAGMA user_version = 2",
		"CREATE TABLE results (original TEXT); INSERT INTO results VALUES ('keep me')",
	} {
		filename := filepath.Join(t.TempDir(), "db.sqlite")
		original, err := sql.Open("sqlite", filename)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := original.Exec(schema); err != nil {
			t.Fatal(err)
		}
		if database, err := Open(context.Background(), filename); err == nil {
			database.Close()
			t.Fatal("incompatible schema was accepted")
		}
		var value string
		if err := original.QueryRow("SELECT original FROM results").Scan(&value); err != nil || value != "keep me" {
			t.Fatalf("original data was changed: %q %v", value, err)
		}
		original.Close()
	}
}

func TestScoreValidation(t *testing.T) {
	cases := map[string]func(*Score){
		"empty nickname":     func(s *Score) { s.User = " " },
		"control character":  func(s *Score) { s.User = "Player\n" },
		"negative time":      func(s *Score) { s.Time = -1 },
		"unsafe time":        func(s *Score) { s.Time = 1 << 53 },
		"score mismatch":     func(s *Score) { s.Result = 2 },
		"missing answers":    func(s *Score) { s.Rights = nil },
		"duplicate answers":  func(s *Score) { s.Wrongs = []string{"AD"} },
		"too many mistakes":  func(s *Score) { s.Wrongs = []string{"BR", "RU", "CA", "US"} },
		"invalid identifier": func(s *Score) { s.Rights = []string{"AD\n"} },
	}
	if err := validScore().Validate(); err != nil {
		t.Fatal(err)
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			score := validScore()
			change(&score)
			if err := score.Validate(); err == nil {
				t.Fatal("invalid score was accepted")
			}
		})
	}
}
