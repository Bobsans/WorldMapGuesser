package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"

	_ "modernc.org/sqlite"
)

type Score struct {
	User   string   `json:"user"`
	Result int      `json:"result"`
	Time   int64    `json:"time"`
	Rights []string `json:"rights"`
	Wrongs []string `json:"wrongs"`
}

func (s Score) Validate() error {
	if !utf8.ValidString(s.User) || strings.TrimSpace(s.User) == "" || utf8.RuneCountInString(s.User) > 64 {
		return errors.New("nickname must contain 1 to 64 characters")
	}
	for _, character := range s.User {
		if unicode.IsControl(character) {
			return errors.New("nickname must not contain control characters")
		}
	}
	if s.Result < 0 || s.Result > 256 || s.Time < 0 || s.Time > 1<<53-1 {
		return errors.New("score or time is outside the allowed range")
	}
	if s.Rights == nil || s.Wrongs == nil || len(s.Rights)+len(s.Wrongs) > 256 || len(s.Wrongs) > 3 {
		return errors.New("answer arrays are missing or too large")
	}
	if s.Result != len(s.Rights) {
		return errors.New("score must match the number of correct answers")
	}
	seen := make(map[string]bool, len(s.Rights)+len(s.Wrongs))
	for _, ids := range [][]string{s.Rights, s.Wrongs} {
		for _, id := range ids {
			if id == "" || len(id) > 16 || !utf8.ValidString(id) || seen[id] {
				return errors.New("country identifiers must be nonempty and unique")
			}
			for _, character := range id {
				if unicode.IsControl(character) || unicode.IsSpace(character) {
					return errors.New("country identifiers must not contain whitespace or control characters")
				}
			}
			seen[id] = true
		}
	}
	return nil
}

type Store struct {
	db *sql.DB
}

func Open(ctx context.Context, filename string) (*Store, error) {
	db, err := sql.Open("sqlite", filename)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	var tx *sql.Tx
	fail := func(err error) (*Store, error) {
		if tx != nil {
			tx.Rollback()
		}
		db.Close()
		return nil, fmt.Errorf("open score database: %w", err)
	}
	if _, err = db.ExecContext(ctx, "PRAGMA busy_timeout = 5000"); err != nil {
		return fail(err)
	}
	tx, err = db.BeginTx(ctx, nil)
	if err != nil {
		return fail(err)
	}
	defer tx.Rollback()
	var version int
	if err = tx.QueryRowContext(ctx, "PRAGMA user_version").Scan(&version); err != nil {
		return fail(err)
	}
	if version > 1 {
		return fail(fmt.Errorf("database schema %d is newer than supported schema 1", version))
	}
	for _, statement := range []string{
		"CREATE TABLE IF NOT EXISTS results (user TEXT, result INT, time INT, rights TEXT, wrongs TEXT)",
		"CREATE INDEX IF NOT EXISTS results_ranking ON results (result DESC, time ASC)",
		"PRAGMA user_version = 1",
	} {
		if _, err = tx.ExecContext(ctx, statement); err != nil {
			return fail(err)
		}
	}
	if err = tx.Commit(); err != nil {
		return fail(err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) Ping(ctx context.Context) error { return s.db.PingContext(ctx) }

func (s *Store) Save(ctx context.Context, score Score) error {
	if err := score.Validate(); err != nil {
		return err
	}
	rights, err := json.Marshal(score.Rights)
	if err != nil {
		return err
	}
	wrongs, err := json.Marshal(score.Wrongs)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx,
		"INSERT INTO results (user, result, time, rights, wrongs) VALUES (?, ?, ?, ?, ?)",
		score.User, score.Result, score.Time, string(rights), string(wrongs),
	)
	return err
}

// Top keeps malformed legacy rows in SQLite but does not return an invalid API record.
func (s *Store) Top(ctx context.Context) ([]Score, int, error) {
	rows, err := s.db.QueryContext(ctx,
		"SELECT user, result, time, rights, wrongs FROM results ORDER BY result DESC, time ASC, rowid ASC",
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	scores := make([]Score, 0, 10)
	skipped := 0
	for len(scores) < 10 && rows.Next() {
		var score Score
		var rights, wrongs string
		if err := rows.Scan(&score.User, &score.Result, &score.Time, &rights, &wrongs); err != nil {
			skipped++
			continue
		}
		if score.Result < 0 || score.Result > 256 || score.Time < 0 || score.Time > 1<<53-1 ||
			json.Unmarshal([]byte(rights), &score.Rights) != nil ||
			json.Unmarshal([]byte(wrongs), &score.Wrongs) != nil || score.Rights == nil || score.Wrongs == nil {
			skipped++
			continue
		}
		scores = append(scores, score)
	}
	return scores, skipped, rows.Err()
}
