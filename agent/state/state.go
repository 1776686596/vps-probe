package state

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

type State struct {
	mu           sync.Mutex
	BootTime     uint64 `json:"bootTime"`
	LastRxBytes  uint64 `json:"lastRxBytes"`
	LastTxBytes  uint64 `json:"lastTxBytes"`
	TotalRxBytes uint64 `json:"totalRxBytes"`
	TotalTxBytes uint64 `json:"totalTxBytes"`
}

type Snapshot struct {
	BootTime     uint64
	LastRxBytes  uint64
	LastTxBytes  uint64
	TotalRxBytes uint64
	TotalTxBytes uint64
}

func Load(path string) (*State, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &State{}, nil
		}
		return &State{}, err
	}
	if len(data) == 0 {
		return &State{}, nil
	}
	var st State
	if err := json.Unmarshal(data, &st); err != nil {
		return &State{}, err
	}
	return &st, nil
}

func Save(path string, st *State) error {
	st.mu.Lock()
	data, err := json.MarshalIndent(st, "", "  ")
	st.mu.Unlock()
	if err != nil {
		return err
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	tmp, err := os.CreateTemp(dir, ".state-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}

func (st *State) Snap() Snapshot {
	st.mu.Lock()
	defer st.mu.Unlock()
	return Snapshot{
		BootTime:     st.BootTime,
		LastRxBytes:  st.LastRxBytes,
		LastTxBytes:  st.LastTxBytes,
		TotalRxBytes: st.TotalRxBytes,
		TotalTxBytes: st.TotalTxBytes,
	}
}

func (st *State) Restore(s Snapshot) {
	st.mu.Lock()
	defer st.mu.Unlock()
	st.BootTime = s.BootTime
	st.LastRxBytes = s.LastRxBytes
	st.LastTxBytes = s.LastTxBytes
	st.TotalRxBytes = s.TotalRxBytes
	st.TotalTxBytes = s.TotalTxBytes
}

func (st *State) Update(bootTime, rxBytes, txBytes uint64) (deltaRx, deltaTx, totalRx, totalTx uint64, rebooted bool) {
	st.mu.Lock()
	defer st.mu.Unlock()

	if st.BootTime == 0 || st.BootTime != bootTime {
		st.BootTime = bootTime
		st.LastRxBytes = rxBytes
		st.LastTxBytes = txBytes
		return 0, 0, st.TotalRxBytes, st.TotalTxBytes, true
	}

	if rxBytes < st.LastRxBytes || txBytes < st.LastTxBytes {
		st.BootTime = bootTime
		st.LastRxBytes = rxBytes
		st.LastTxBytes = txBytes
		return 0, 0, st.TotalRxBytes, st.TotalTxBytes, true
	}

	deltaRx = rxBytes - st.LastRxBytes
	deltaTx = txBytes - st.LastTxBytes
	st.TotalRxBytes += deltaRx
	st.TotalTxBytes += deltaTx
	st.LastRxBytes = rxBytes
	st.LastTxBytes = txBytes

	return deltaRx, deltaTx, st.TotalRxBytes, st.TotalTxBytes, false
}
