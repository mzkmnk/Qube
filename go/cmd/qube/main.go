package main

import (
    "log"

    tea "github.com/charmbracelet/bubbletea"
    "qube/internal/ui"
)

func main() {
    m := ui.New()
    if _, err := tea.NewProgram(&m).Run(); err != nil {
        log.Fatal(err)
    }
}

