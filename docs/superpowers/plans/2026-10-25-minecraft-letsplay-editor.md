# Letsplay Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A macOS SwiftUI app that analyzes raw Minecraft clips, proposes a survival-only highlight edit with profanity muted, lets the user fix it on a timeline, and exports a YouTube-ready MP4.

**Architecture:** Swift package with a testable `EditorCore` library (Models, Services, ViewModels) and a thin SwiftUI executable `LetsplayEditor` (Views only). Analysis samples frames at 1 fps with `ffmpeg`, reads on-screen text with Vision, transcribes with `whisper-cli`, turns those signals into excluded ranges and events, and a pure `EditPlannerService` builds segments. `CompositionService` builds one `AVMutableComposition` + `AVAudioMix` used by both preview and export.

**Tech Stack:** Swift 5.9+, SwiftUI, AVFoundation, Vision, XCTest, `ffmpeg`/`ffprobe`/`whisper-cli` subprocesses.

**Spec:** `docs/superpowers/specs/2026-10-25-minecraft-letsplay-editor-design.md`

**Location:** new package at `~/Desktop/Projects/LetsplayEditor` (`git init` there; every commit step runs in that repo). Open `Package.swift` in Xcode to run the app.

## Global Constraints

- Local only. Nothing is uploaded. Tools: `/opt/homebrew/bin/ffmpeg`, `/opt/homebrew/bin/ffprobe`, `/opt/homebrew/bin/whisper-cli`, model `~/Movies/EAC-Video/models/ggml-large-v3-turbo.bin`. All four paths are settings with these defaults.
- Strict MVVM: Views never call Services; ViewModels are `@MainActor`, never import SwiftUI; Services are `final class` singletons with `.shared`; Models are plain `struct`s (Codable, Identifiable, Equatable, Hashable).
- `async/await` only; no `DispatchQueue`. `CancellationError` is caught and ignored in task handlers.
- UserDefaults/`@AppStorage` keys: lowercase dot-namespaced, `letsplay.<name>`.
- No comments unless the why is non-obvious. `// MARK: -` in files over ~100 lines. Sentence-case UI copy, verbs on buttons, no exclamation points in errors, plain active voice.
- Output matches source: 1280×720, 30 fps, H.264/AAC MP4.
- Survival only. When unsure, cut (creative, OP commands) or mute (profanity).
- Defaults (settings, adjustable): lead-in 4 s, tail 3 s, quiet gaps over 8 s compressed to one 3 s filler slice, profanity mute padding 0.25 s, hearts-absent fallback 10 s, 1 fps sampling.
- Clips are ordered by filename. The user picks which clips go into an export.

## Review Focus

1. A clip with no speech or a silent track still plans segments and never crashes (Task 8, Task 3).
2. A clip that is entirely creative, or entirely OP-command chat, yields zero segments, not an empty or negative one (Task 8).
3. A death or find right after an OP command line is excluded, not rescued as a highlight (Task 8).
4. Profanity matching is whole-word and survives case, punctuation and trailing apostrophes: "class" and "Scunthorpe" stay audible, "SHIT!" and "fucking," are muted (Task 4).
5. A 2.6-second `.mov` and a 20-minute `.mp4` both work end to end; clips shorter than the lead-in aren't dropped (Task 8, Task 9).

---

### Task 1: Package scaffold and models

**Files:**
- Create: `Package.swift`, `Sources/EditorCore/Models/{TimeRange,Segment,Clip,Word,ClipAnalysis,Project}.swift`, `Sources/EditorCore/Services/SettingsService.swift`, `Sources/LetsplayEditor/LetsplayEditorApp.swift`
- Test: `Tests/EditorCoreTests/ModelsTests.swift`

**Interfaces:**
- Produces:
  - `struct TimeRange: Codable, Hashable { var start: Double; var end: Double; var duration: Double; func overlaps(_ o: TimeRange) -> Bool; func clamped(to o: TimeRange) -> TimeRange? }`
  - `enum SegmentReason: String, Codable { case commentary, death, find, terrainChange, filler }`
  - `struct Segment: Identifiable, Codable, Hashable { var id: UUID; var clipID: UUID; var range: TimeRange; var reason: SegmentReason; var isEnabled: Bool }`
  - `struct Clip: Identifiable, Codable, Hashable { var id: UUID; var url: URL; var duration: Double; var isSelected: Bool }`
  - `struct Word: Identifiable, Codable, Hashable { var text: String; var range: TimeRange; var isMuted: Bool; var id: Double { range.start } }`
  - `struct Event: Codable, Hashable { var time: Double; var kind: SegmentReason }`
  - `struct ClipAnalysis: Codable, Equatable { var clipID: UUID; var fingerprint: String; var words: [Word]; var speech: [TimeRange]; var excluded: [TimeRange]; var events: [Event] }`
  - `struct Project: Codable, Equatable { var clips: [Clip]; var analyses: [UUID: ClipAnalysis]; var segments: [Segment] }`
  - `final class SettingsService { static let shared; var ffmpegPath, ffprobePath, whisperPath, whisperModelPath: String; var leadIn, tail, fillerGap, fillerSlice, mutePadding, heartsAbsentSeconds: Double }` backed by UserDefaults keys `letsplay.<name>` with the Global Constraints defaults.

- [ ] **Step 1:** Write failing tests in `ModelsTests`: `testTimeRangeOverlapsIsExclusiveAtEdges` (`0...5` vs `5...8` is false; `0...5` vs `4...8` true), `testClampedReturnsNilWhenDisjoint`, `testProjectCodableRoundTrip`, `testSettingsDefaultsMatchSpec` (leadIn 4, tail 3, fillerGap 8, fillerSlice 3, mutePadding 0.25, heartsAbsentSeconds 10).
- [ ] **Step 2:** `swift test` → FAIL (types missing).
- [ ] **Step 3:** Create the package (macOS 14 target, library + executable + test targets) and the types above. The app file shows a placeholder window for now.
- [ ] **Step 4:** `swift test` → PASS.
- [ ] **Step 5:** `git init && git add -A && git commit -m "feat: scaffold package and models"`

### Task 2: ToolRunner and clip probe

**Files:**
- Create: `Sources/EditorCore/Services/{ToolRunner,ClipProbeService}.swift`
- Test: `Tests/EditorCoreTests/ToolRunnerTests.swift`

**Interfaces:**
- Produces:
  - `enum ToolError: Error { case nonZero(status: Int32, stderr: String); case missing(String) }`
  - `final class ToolRunner { static let shared; func run(_ executable: String, _ args: [String]) async throws -> Data }` — returns stdout, throws `ToolError`, terminates the process when the task is cancelled.
  - `final class ClipProbeService { static let shared; func duration(of url: URL) async throws -> Double; func fingerprint(of url: URL) -> String }` — fingerprint is `"<byteSize>-<modificationTimestamp>"`.

- [ ] **Step 1:** Tests: `testRunReturnsStdout` (`/bin/echo hi` → `"hi\n"`), `testNonZeroThrowsWithStderr` (`/bin/sh -c "echo bad >&2; exit 3"` → `.nonZero(status: 3, stderr: "bad\n")`), `testMissingExecutableThrows`, `testCancellationTerminatesProcess` (`/bin/sleep 30` cancelled finishes in under 2 s), `testDurationOfFixture` (real clip `2026-10-24 22-16-07.mp4` at `~/Movies`, skipped with `XCTSkip` if absent, equals 19.47 ± 0.05).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with `Process` + `withTaskCancellationHandler`; duration via `ffprobe -v error -show_entries format=duration -of csv=p=0`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: tool runner and clip probe`.

### Task 3: Transcription

**Files:**
- Create: `Sources/EditorCore/Services/TranscriptionService.swift`
- Test: `Tests/EditorCoreTests/TranscriptionTests.swift`, `Tests/EditorCoreTests/Fixtures/whisper-sample.json`

**Interfaces:**
- Consumes: `ToolRunner.run`, `SettingsService`.
- Produces: `final class TranscriptionService { static let shared; func transcribe(_ url: URL) async throws -> [Word]; func parse(json: Data) throws -> [Word]; func speechRanges(from words: [Word], maxGap: Double) -> [TimeRange] }`

Transcription extracts 16 kHz mono wav to a temp file with ffmpeg, runs `whisper-cli -m <model> -f <wav> -l en -ml 1 -ojf -of <tmp> -np`, parses the full JSON for per-word offsets (ms → s). `speechRanges` merges words closer than `maxGap` (default 1.0 s).

- [ ] **Step 1:** Tests against a fixture JSON copied from a real `whisper-cli -ojf` run on clip 19-09-41: `testParseDropsNoiseTags` (`*Gunshot*`, `[BLANK_AUDIO]`, `(music)` removed), `testParseKeepsWordTimingsInSeconds`, `testSpeechRangesMergeWordsWithinGap`, `testEmptyTranscriptYieldsNoWordsAndNoRanges`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Noise filter: text fully wrapped in `*…*`, `[…]` or `(…)` is dropped.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: whisper transcription`.

### Task 4: Profanity flagging

**Files:**
- Create: `Sources/EditorCore/Services/ProfanityService.swift`, `Sources/EditorCore/Resources/profanity.txt`
- Test: `Tests/EditorCoreTests/ProfanityTests.swift`

**Interfaces:**
- Produces: `final class ProfanityService { static let shared; func flag(_ words: [Word]) -> [Word]; func muteRanges(for words: [Word], padding: Double) -> [TimeRange] }` — `flag` sets `isMuted` on matches; `muteRanges` returns the padded ranges of muted words, merged when overlapping.

- [ ] **Step 1:** Tests: `testMatchesCaseAndPunctuation` ("SHIT!", "fucking,", "Goddamn" → muted), `testWholeWordOnly` ("class", "assassin", "Scunthorpe" → not muted), `testFlagNeverUnmutesAnAlreadyMutedWord` (a user-muted clean word stays muted after `flag`), `testMuteRangesArePaddedAndMerged` (two words 0.3 s apart with 0.25 padding → one range).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: lowercase, strip non-letters at word edges, match against the bundled list (seed with common profanity and its `-ing`/`-ed`/`-er` forms).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: profanity flagging`.

### Task 5: Frame sampling and screen reading

**Files:**
- Create: `Sources/EditorCore/Models/FrameObservation.swift`, `Sources/EditorCore/Services/{FrameSamplerService,ScreenReaderService}.swift`
- Test: `Tests/EditorCoreTests/ScreenReaderTests.swift`

**Interfaces:**
- Produces:
  - `struct FrameObservation: Codable, Hashable { var time: Double; var chatLines: [String]; var toastText: [String]; var centerText: [String]; var heartsVisible: Bool; var meanRGB: [Double] }`
  - `final class FrameSamplerService { static let shared; func sample(_ url: URL, fps: Double) async throws -> [URL] }` — writes numbered JPEGs (frame *n* is time *n / fps*) into a fresh temp dir and returns their URLs; caller deletes the dir.
  - `final class ScreenReaderService { static let shared; func observe(frame: URL, time: Double) async throws -> FrameObservation }` — Vision `VNRecognizeTextRequest` (accurate) on three normalized regions: bottom-left chat, top-right toasts, center (for "You died!"); heart detection counts saturated-red pixels in the strip above the hotbar; `meanRGB` is the whole-frame mean.

The builder determines the exact region rectangles by looking at frames from clips 19-29-30 (chat visible) and 22-49-27 (death messages); keep them as named constants.

- [ ] **Step 1:** Tests using small PNG fixtures cropped from real frames (one with chat text `Set own game mode to Creative Mode`, one with hearts, one without hearts, one with the death screen): `testChatLineRead`, `testHeartsDetected`, `testHeartsAbsentInCreativeInventory`, `testDeathScreenTextRead`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement both services.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: frame sampling and screen reading`.

### Task 6: OP-command and game-mode detection

**Files:**
- Create: `Sources/EditorCore/Services/{OPCommandService,GameModeService}.swift`
- Test: `Tests/EditorCoreTests/{OPCommandTests,GameModeTests}.swift`

**Interfaces:**
- Consumes: `FrameObservation`, `TimeRange`, `SettingsService`.
- Produces:
  - `final class OPCommandService { static let shared; func isOPCommandLine(_ line: String) -> Bool; func ranges(from observations: [FrameObservation]) -> [TimeRange] }` — patterns (replaceable list): `/gamemode`, `/tp`, `/give`, `/kill`, `/time`, `/weather`, `Set own game mode to`, `Teleported`, `Set the world spawn point`, `Set the time to`, `Gave `, `Killed `. A range runs from the first observation containing a matching line to one second after the last consecutive one.
  - `final class GameModeService { static let shared; func creativeRanges(from observations: [FrameObservation], duration: Double) -> [TimeRange] }` — chat `Set own game mode to Creative Mode` starts a creative range, `…Survival Mode` ends it; with no chat evidence, hearts absent for `heartsAbsentSeconds` or more consecutive seconds count as creative. A creative range open at the end runs to `duration`.

- [ ] **Step 1:** Tests: `testGamemodeChatLineIsOP`, `testDeathLineIsNotOP` ("STOOBEN was slain by Piglin Brute"), `testRangesCoverVisibleLinePlusOneSecond`, `testCreativeRangeFromChatSwitch`, `testCreativeEndsOnSurvivalLine`, `testHeartsAbsentNineSecondsIsNotCreative`, `testHeartsAbsentTenSecondsIsCreative`, `testOpenCreativeRangeRunsToClipEnd`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement as pure logic over observations.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: op command and game mode detection`.

### Task 7: Event detection (deaths, finds, terrain)

**Files:**
- Create: `Sources/EditorCore/Services/EventService.swift`
- Test: `Tests/EditorCoreTests/EventTests.swift`

**Interfaces:**
- Consumes: `FrameObservation`, `Event`, `OPCommandService.isOPCommandLine`.
- Produces: `final class EventService { static let shared; func events(from observations: [FrameObservation]) -> [Event] }`
  - death: centered text contains `You died!`, or a chat line matches `was slain by|fell|burned|drowned|blew up|doomed|was killed` and is not an OP line; one event per death (consecutive frames collapse).
  - find: toast text contains `Advancement`, `Challenge`, or `New Recipe`; chat contains `has made the advancement`.
  - terrainChange: `meanRGB` smoothed over 5 s shifts by more than a named threshold (distance in RGB) and stays shifted for 5 s.

- [ ] **Step 1:** Tests: `testYouDiedProducesOneDeathEvent` (five consecutive frames), `testRecipeToastIsFind`, `testNetherEntryIsTerrainChange` (synthetic observations with green-ish mean then red-ish mean), `testBriefFlashIsNotTerrainChange` (2 s red then back), `testOPLineNeverProducesEvent`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: event detection`.

### Task 8: Edit planner

**Files:**
- Create: `Sources/EditorCore/Services/EditPlannerService.swift`
- Test: `Tests/EditorCoreTests/EditPlannerTests.swift`

**Interfaces:**
- Consumes: `ClipAnalysis`, `Segment`, `SettingsService`.
- Produces: `final class EditPlannerService { static let shared; func plan(clipID: UUID, duration: Double, analysis: ClipAnalysis) -> [Segment] }`

Rules, in order:
1. Highlight windows: each speech range (reason `commentary`) and each event (`death`/`find`/`terrainChange`) expands by `leadIn` before and `tail` after, clamped to `0...duration`; overlapping windows merge, the reason of the earliest non-commentary event wins.
2. Gaps between windows longer than `fillerGap` get one `filler` segment of `fillerSlice` seconds centered in the gap; shorter gaps are absorbed into the neighbors.
3. Subtract every `excluded` range. Where a segment ends because an excluded range begins, pull the end back to the start of any speech range that straddles that moment (the nearest pause before it), else keep it at the exclusion start.
4. Drop segments shorter than 1 s unless the clip itself is shorter than 1 s.
5. Return segments in time order, all `isEnabled == true`.

- [ ] **Step 1:** Tests: `testSpeechGetsLeadInAndTail`, `testOverlappingWindowsMerge`, `testLongGapGetsOneFillerSlice`, `testShortGapIsAbsorbed`, `testCreativeRangeIsSubtracted`, `testEndTrimsToPauseBeforeExclusion` (speech 18–25, exclusion at 22 → segment ends at 18), `testEndStaysAtExclusionWhenNoSpeechStraddles`, `testEntirelyExcludedClipYieldsNoSegments`, `testNoSpeechNoEventsYieldsOnlyFillerOrNothing`, `testDeathJustAfterOPLineIsDropped` (exclusion 30–40, death at 41 with 4 s lead-in → starts at 40), `testShortClipKeepsItsSegment` (2.6 s clip, one speech word), `testSegmentsNeverNegativeOrInverted`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement as pure range arithmetic.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: edit planner`.

### Task 9: Analysis orchestration and persistence

**Files:**
- Create: `Sources/EditorCore/Services/{AnalysisService,ProjectStore}.swift`
- Test: `Tests/EditorCoreTests/{AnalysisServiceTests,ProjectStoreTests}.swift`

**Interfaces:**
- Consumes: Tasks 2–8.
- Produces:
  - `final class AnalysisService { static let shared; func analyze(_ clip: Clip, progress: @Sendable (Double) -> Void) async throws -> ClipAnalysis }` — probe fingerprint, sample frames, observe all, transcribe, flag profanity, derive `excluded` (OP ranges + creative ranges), events, speech; deletes the temp frame dir; honors cancellation.
  - `final class ProjectStore { static let shared; func load(from url: URL) throws -> Project; func save(_ project: Project, to url: URL) throws; func cachedAnalysis(for clip: Clip, in project: Project) -> ClipAnalysis? }` — a cached analysis is valid only when its `fingerprint` matches the file's current fingerprint.

- [ ] **Step 1:** Tests: `testCachedAnalysisReusedWhenFingerprintMatches`, `testCacheIgnoredWhenFileChanged`, `testSaveLoadRoundTrip`, `testAnalyzeShortFixtureEndToEnd` (real clip `22-16-07.mp4`, skipped if absent: returns an analysis, temp dir removed), `testAnalyzeCancellationThrowsAndCleansTemp`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; progress is weighted (sampling+OCR 60%, transcription 40%).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: analysis pipeline and project store`.

### Task 10: Composition, preview and export

**Files:**
- Create: `Sources/EditorCore/Services/{CompositionService,ExportService}.swift`
- Test: `Tests/EditorCoreTests/ExportTests.swift`

**Interfaces:**
- Consumes: `Project`, `ProfanityService.muteRanges`.
- Produces:
  - `final class CompositionService { static let shared; func build(clips: [Clip], segments: [Segment], analyses: [UUID: ClipAnalysis]) async throws -> (AVMutableComposition, AVAudioMix) }` — enabled segments of selected clips only, in project order; muted words become zero-volume ramps on the audio track at their composition-time positions.
  - `final class ExportService { static let shared; func export(_ composition: AVMutableComposition, mix: AVAudioMix, to url: URL, progress: @Sendable (Double) -> Void) async throws }` — 1280×720, H.264/AAC MP4.

- [ ] **Step 1:** Tests on the short fixture clips: `testCompositionDurationEqualsEnabledSegments`, `testDisabledSegmentsExcluded`, `testUnselectedClipsExcluded`, `testMutedWordIsSilentInExport` (export 5 s containing a muted word range, `ffmpeg volumedetect` over that range reports below -60 dB mean), `testExportIs720p30H264`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with `AVMutableComposition`, `AVMutableAudioMixInputParameters.setVolume`, `AVAssetExportSession`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: composition and export`.

### Task 11: ViewModels

**Files:**
- Create: `Sources/EditorCore/ViewModels/{ProjectViewModel,TimelineViewModel}.swift`
- Test: `Tests/EditorCoreTests/{ProjectViewModelTests,TimelineViewModelTests}.swift`

**Interfaces:**
- Consumes: Tasks 8–10.
- Produces (`@MainActor final class … : ObservableObject`):
  - `ProjectViewModel`: `@Published var project: Project`, `isAnalyzing`, `progress: Double`, `errorMessage: String?`, `func importClips(_ urls: [URL]) async`, `func toggleClip(_ id: UUID)`, `func analyzeSelected() async`, `func cancelAnalysis()`, `func save()`, `func open(_ url: URL)`; after analysis it fills `project.segments` via `EditPlannerService`.
  - `TimelineViewModel`: `@Published var segments: [Segment]`, `selectedSegmentID`, `func toggle(_ id: UUID)`, `func trim(_ id: UUID, start: Double?, end: Double?)`, `func move(from: IndexSet, to: Int)`, `func toggleMute(word: Word, clipID: UUID)`, `func words(in segment: Segment) -> [Word]`, `func rebuildComposition() async` and `@Published var player: AVPlayer?`.

- [ ] **Step 1:** Tests: `testImportOrdersClipsByFilename`, `testImportAddsClipSelectedWithDuration`, `testAnalyzeSelectedSkipsUnselected`, `testToggleDisablesSegment`, `testTrimClampsToClipBounds`, `testTrimCannotInvertRange`, `testMoveReordersSegments`, `testToggleMuteFlipsWordInAnalysis`, `testCancelAnalysisLeavesProjectUnchanged`. (Inject a stub analysis closure so tests don't run ffmpeg.)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; Views never touch Services, so every Service call the UI needs goes through these two.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: view models`.

### Task 12: Views

**Files:**
- Create: `Sources/LetsplayEditor/Views/{ContentView,ClipListView,TimelineView,TranscriptView,PlayerView,ExportSheet}.swift`; modify `LetsplayEditorApp.swift`

**Interfaces:**
- Consumes: `ProjectViewModel`, `TimelineViewModel` (`@StateObject` at the app, `@ObservedObject` in children).

Layout: left sidebar with clip list (checkbox to include, Import and Analyze buttons, progress bar); center `PlayerView` (AVKit `VideoPlayer`); bottom `TimelineView` (one block per segment, colored by reason, dimmed when disabled, trim handles, drag to reorder); right `TranscriptView` (words of the selected segment, muted ones struck through, click to toggle). Toolbar has Export. Copy: "Import clips", "Analyze", "Analyzing…", "Export video", "Couldn't read this clip. Check that the file still exists." Dark navy background, not pure black.

- [ ] **Step 1:** Build all views against the view models; `swift build` → succeeds with no warnings.
- [ ] **Step 2:** Run the app (`swift run LetsplayEditor`); import the 11 clips; confirm the window shows the list sorted by filename.
- [ ] **Step 3:** Select clip `22-16-07.mp4`, Analyze, confirm segments appear, click one and the player previews it, click a word and it toggles strikethrough.
- [ ] **Step 4:** Commit `feat: views`.

### Task 13: Real-footage verification

**Files:**
- Create: `docs/verification.md` in the app repo (short results log)

- [ ] **Step 1:** Analyze clips `19-29-30`, `20-01-29`, `22-49-27` (the three with creative switches, commands and Nether).
- [ ] **Step 2:** For each, scrub the proposed timeline and confirm: no creative stretch, no visible `Set own game mode` / `Teleported` chat line, deaths and Nether entry present, every bad word muted.
- [ ] **Step 3:** Export, play the MP4 in QuickTime, run `ffprobe` and confirm 1280×720 / 30 fps / h264 / aac.
- [ ] **Step 4:** Record misses (missed commands, false creative, muted-too-little) in `docs/verification.md` and tune the named thresholds and pattern list until the three clips pass; commit `chore: tune detection on real clips`.
