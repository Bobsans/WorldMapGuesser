package tooling

import (
	"context"
	"os"
	"os/exec"
	"time"
)

func Command(ctx context.Context, directory, executable string, arguments ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, executable, arguments...)
	cmd.Dir = directory
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.WaitDelay = 5 * time.Second
	configureProcess(cmd)
	return cmd
}
