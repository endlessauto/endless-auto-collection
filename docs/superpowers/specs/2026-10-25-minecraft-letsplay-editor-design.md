# Minecraft Let's Play Editor — Design

Date: 2026-10-25 · Status: draft for approval

## Intent

A macOS app that turns raw Minecraft recordings into a near-final YouTube episode with almost no manual work. The user drops in clips, the app proposes an edit, the user reviews it on a timeline, fixes anything off, and exports.

The channel is a chill, cinematic, funny let's play. The edit keeps the moments worth watching (commentary, deaths, finds, terrain changes) and a little of the calm between them. Creative mode never appears. Bad words never reach the viewer.

The point is saving the user's time. Automation comes first; the manual timeline tools exist to fix what automation gets wrong.

## Source material (observed 2026-10-25)

- Folder: `~/Movies`. First batch: 11 clips, `2026-10-24 18-52-46` through `22-49-27`, about 70 minutes total. Clips range from 2 seconds to 20 minutes.
- Video: 1280×720, 30 fps, H.264. Audio: one stereo AAC track with mic and game audio mixed.
- Facecam is burned into the top-left of every frame. It stays in the output.
- A second player (FNC42675) appears in the Nether and in chat. Only the recorded player's footage matters.
- Clips mix survival and creative, and can switch inside one clip.
- Signals visible on screen:
  - Chat prints `Set own game mode to Creative Mode` / `Survival Mode`, death lines (`was slain by Piglin Brute`) and advancements.
  - Survival shows hearts and hunger above the hotbar.
  - Advancement and recipe toasts appear top-right.
  - The Nether has a distinct red/dark palette next to the overworld's green/sky.
- Speech transcription already works locally: `/opt/homebrew/bin/whisper-cli` with `~/Movies/EAC-Video/models/ggml-large-v3-turbo.bin`. About 20 seconds for a 2-minute clip. Quiet stretches come back as `*Gunshot*` and similar noise tags, which are not speech.

## Goals

- Import clips and run analysis with one action, with visible progress.
- Propose an edit as a list of segments on a timeline. Each segment says why it's there (commentary, death, find, terrain change, filler).
- Cut every creative-mode stretch. Survival only. The cut lands at the nearest pause in speech before the switch into creative, so the episode ends the survival moment before the command is typed.
- Cut every moment where the chat shows an OP command or its feedback (`/gamemode`, `Set own game mode to …`, `Teleported … to …`, `Set the world spawn point`, `/give`, `/tp`, `/kill`, `/time`, `/weather` and similar). A stretch is excluded for as long as such a line is visible on screen. Chat lines stay up for several seconds, so this can remove footage after the command as well as before.
- Keep a short lead-in and tail around each highlight and a slice of quiet play for pacing. Trim long dead stretches.
- Mute profanity at word level using transcript timestamps.
- Timeline with preview playback:
  - toggle a segment on or off
  - trim its edges
  - drag to reorder
  - click a muted word to unmute it, or click any word to mute it
- Export an MP4 for YouTube that matches the source (1280×720, 30 fps, H.264/AAC).
- Cache analysis per clip so reopening a project doesn't redo it.

## Non-goals (v1)

Titles and text overlays. Zoom or speed effects. Music. Thumbnail and title suggestions. Chapter markers. Multi-camera. Uploading to YouTube. Support for games other than Minecraft.

v2 candidates: text overlays, effects on key moments, a music slot (lofi, user-supplied copyright-free files, ducked under speech).

## Anti-goals (a failure even if it technically works)

- A creative-mode moment in the export. When unsure, cut it.
- Any visible OP command or command feedback in the export. When unsure, cut it.
- An unmuted bad word. When unsure, mute it. The review step catches false positives.
- Anything uploaded off the Mac. All analysis is local.
- A dense pro-editor UI that makes the user do the work the app should do.

## Constraints

- Local only: `ffmpeg`, `ffprobe`, `whisper-cli` and the model, all already installed. Tool paths and the model path are settings with these as defaults.
- Analysis of about 70 minutes must run in the background with progress and be cancellable. Transcription alone is roughly 12 minutes at the measured speed.
- Clips are processed in filename (chronological) order.
- The user's global standards apply: SwiftUI, strict MVVM (Views never call Services; ViewModels are `@MainActor` and never import SwiftUI; Services are `.shared` singletons; Models are plain structs), `async/await` throughout, no comments unless the why is non-obvious.

## Decisions made with the user

- Mac app with a click-through timeline, not a command-line tool.
- Automation first, manual tools second.
- v1 includes toggle, trim, reorder, and word-level mute/unmute. Music is skipped for now.
- Keep some quiet play for a chill, cinematic feel; don't hard-cut to highlights only.
- Mute bad words rather than leave them in.
- Destination is YouTube. The user reviews before posting.
- At a switch into creative, trim to the nearest pause before it.
- Footage showing chat lines about OP commands (gamemode and the like) is excluded.

## My calls (the user hasn't confirmed these)

- Native SwiftUI macOS app. AVFoundation for preview and export. Apple's Vision framework for on-screen text recognition. `ffmpeg` and `whisper-cli` run as subprocesses.
- The app is a new project under `~/Desktop/Projects/`, separate from the EAC website repo. Working name: Letsplay Editor.
- Pacing defaults, all adjustable in settings: about 4 s lead-in before a highlight, about 3 s tail after, quiet stretches longer than about 8 s compressed to a short slice.
- Profanity is a replaceable word list. Muted words get a short silence, not a beep, with a few hundred milliseconds of padding.
- Game-mode detection samples about one frame per second. It reads the chat region and checks for the heart bar. The chat line sets the mode; the HUD check backs it up. The same chat reading drives OP-command exclusion, using a replaceable pattern list. Command lines are cut and never used as a highlight signal, even though they carry the same information.
- The user said "clips" for the chat rule; I read it as the footage showing those chat lines, not whole files, since a clip can mix both. Whole-file exclusion would drop most of the material.
- Death detection looks for the "You died!" screen and chat death lines. Find detection starts with advancement/recipe toasts and chat. Terrain change comes from a sustained shift in the frame's color profile, which catches overworld→Nether.
- Quiet-stretch and noise handling: speech segments tagged as noise (`*Gunshot*` etc.) don't count as commentary.
- Project file stores clip paths, cached analysis, and the user's timeline edits.

## Left to the builder

Package and target layout, macOS deployment target, exact Vision and color-shift thresholds, how heart-bar detection is implemented, the timeline's rendering approach, subprocess wrapping, export pipeline details, and testing strategy (analysis should be testable against the real clips).

## Open questions

1. Should the episode join all clips in one export, or can the user choose a subset per episode? (My default: choose a subset, since the 11 clips may not be one episode.)
