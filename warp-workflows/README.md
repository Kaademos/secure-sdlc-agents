# Warp Terminal Workflows — Secure SDLC

Pre-built [Warp Workflows](https://docs.warp.dev/features/workflows) for the Secure SDLC agent team.
Workflows turn multi-step secure development processes into single-command executions in Warp.

## Installation

1. Open Warp terminal
2. Press `Ctrl+Shift+R` to open Workflows
3. Click "Import" and import each `.yaml` file from this directory

Or copy them to your Warp workflows directory:
```bash
cp warp-workflows/*.yaml ~/.warp/workflows/
```

## Available Workflows

| Workflow | Description |
|---|---|
| `feature-kickoff.yaml` | Start a new feature with full Secure SDLC coverage |
| `pr-security-review.yaml` | Security review a pull request |
| `release-gate.yaml` | Run the pre-release security gate |
| `threat-model.yaml` | Kick off a threat modelling session |
| `sdlc-status.yaml` | Check current SDLC phase and artefact status |
