Introduction / Overview

This document defines the Product Requirements for a web-based MVP music streaming application targeting curators and power users. The MVP aims to deliver core discovery and listening workflows with an emphasis on playlist curation and high-quality playback. Content will be provided via a real licensed catalog and streamed through a third-party streaming SDK. The demo operates without user authentication; personal data is stored anonymously on-device with optional link-based sharing for playlists.

Goals

Deliver a usable, performant web MVP in 4–6 weeks.
Enable curators to search, build, and manage playlists quickly.
Provide reliable, high-quality playback with queue control, crossfade, and gapless playback.
Support offline listening for tracks permitted by licensing.
Meet WCAG 2.1 AA essentials and be globally accessible with GDPR compliance.
User Stories

As a curator, I want to search songs, albums, and artists to assemble thematic playlists quickly.
As a curator, I want to create, reorder, and edit playlists efficiently.
As a curator, I want to preview and seamlessly play tracks (play/pause/seek/shuffle/repeat) while curating.
As a curator, I want a queue I can inspect, reorder, and modify during playback.
As a curator, I want to save tracks to a local library for quick access later.
As a curator, I want static or synced lyrics to verify lyrical fit for my playlist.
As a listener, I want crossfade or gapless playback for smooth listening.
As a listener, I want to download tracks (when permitted) for offline listening.
Functional Requirements

Numbered items are mandatory for the MVP unless otherwise noted.

Search 1.1 The system must allow full-text search across songs, albums, and artists. 1.2 The system must display type-specific results with key metadata (title, artist, album, duration, artwork). 1.3 The system should support type filters (Songs | Albums | Artists) and sorting (relevance, popularity, recent). 1.4 Selecting an item must open a detail view (album, artist) or begin playback (song) depending on type.

Playback 2.1 The system must support play, pause, resume, seek, next/previous, shuffle, and repeat. 2.2 The system must display a persistent player with track metadata, progress bar, and controls. 2.3 The system must integrate a third-party streaming SDK for audio delivery and DRM/licensing compliance. 2.4 The system must handle errors (track unavailable, region locked, network) with user-friendly messages and fallback behavior.

Playback Queue 3.1 The system must display the current queue and the currently playing track. 3.2 Users must be able to add items to the queue (Play Next, Add to Queue). 3.3 Users must be able to reorder and remove items from the queue. 3.4 Queue state must persist during navigation and page refresh within the same device/browser session.

Playlists 4.1 Users must be able to create, rename, delete, and duplicate playlists. 4.2 Users must be able to add/remove tracks and reorder tracks within a playlist. 4.3 Users should be able to add notes/description to playlists (optional for MVP if time-constrained). 4.4 The system must support link-based sharing of playlists using an anonymous share token. 4.5 Shared playlists must be viewable and playable by others without authentication, subject to licensing constraints. 4.6 Playlist data must be stored locally for the owner when unauthenticated and synced to a lightweight backend to enable sharing (via generated tokenized URLs).

Library (Likes / Saves) 5.1 Users must be able to like/save tracks and albums to a local library without authentication. 5.2 Library must persist locally (IndexedDB/localStorage) and survive reloads on the same device. 5.3 The system should support export/import of library and playlists as a JSON file for portability.

Downloads / Offline 6.1 The system must allow offline downloads only for tracks flagged as downloadable by licensing. 6.2 Offline tracks must be stored securely on-device (e.g., encrypted blobs in IndexedDB/Cache Storage) with license-aware TTL/invalidations. 6.3 Users must be able to manage offline content (view storage usage, delete downloads, retry failed downloads). 6.4 The player must seamlessly switch to offline sources when the network is unavailable. 6.5 The UI must clearly label which tracks are available offline and their sync status.

Lyrics 7.1 The system must display lyrics when available (static or time-synced). 7.2 The system must gracefully handle unavailable lyrics with a clear indicator. 7.3 Time-synced lyrics must scroll/highlight in sync with playback when available.

Crossfade / Gapless 8.1 Users must be able to enable/disable crossfade and set a crossfade duration (e.g., 0–12 seconds). 8.2 The system must support gapless playback when tracks/masters are gapless-compatible. 8.3 The system must respect replay gain/normalization settings from the SDK when available.

Identity and Sessions (No Auth) 9.1 The app must operate without login; all personal data is stored anonymously on-device. 9.2 For sharing, the system must generate a server-stored read-only representation of the playlist addressable via a tokenized URL. 9.3 The system must provide clear messaging about device-local storage scope and privacy.

Privacy & Compliance 10.1 The system must display a consent banner for cookies/storage and analytics with opt-in where required. 10.2 The system must provide a privacy policy and a mechanism to delete local data. 10.3 The system must minimize personal data collection; analytics must be pseudonymous and GDPR-compliant.

Accessibility 11.1 The UI must meet WCAG 2.1 AA essentials (color contrast, focus states, keyboard nav, landmarks, form labels). 11.2 All interactive controls must be reachable and operable via keyboard. 11.3 Screen reader support must be verified for major flows (search, playback, queue, playlists, offline manager).

Analytics & Metrics 12.1 The system must instrument events to measure: search-to-play conversion, session duration, retention, playlist creation rate. 12.2 The system must log non-PII technical metrics (buffer underruns, SDK errors) for quality monitoring.

Performance & Reliability 13.1 Initial page load LCP ≤ 2.5s on 3G Fast class devices. 13.2 Audio startup latency (click to audible) ≤ 400ms median on broadband. 13.3 Playback must be resilient to transient network issues with retries and buffering indicators.

Observability & Errors 14.1 The system must surface actionable error messages (e.g., licensing/region restrictions, network offline, SDK errors). 14.2 The system must capture client-side errors and SDK error codes for triage.

Internationalization 15.1 English-only for MVP; architecture must be i18n-ready for future locales.

Non-Goals (Out of Scope)

Podcasts
Collaborative sessions / group listening
Video/music videos
Social graph (follows), comments, DMs
Smart speaker, car integrations
Native mobile apps (web-first only for MVP)
Design Considerations

Match Spottify's general look-and-feel as inspiration while avoiding trademarked assets and exact replicas. Use brand-neutral styling.
Clean, dense layouts optimized for curators: multi-column search results, draggable lists, keyboard shortcuts.
Persistent bottom or side player with queue drawer.
Clear affordances for Like/Save, Add to Playlist, Play Next, and Download.
Accessibility-first components (focus rings, visible labels, high-contrast themes).
Technical Considerations

Frontend: React + Next.js (App Router recommended), TypeScript, CSS utility framework optional.
Audio: Third-party streaming SDK for playback, DRM, and licensing guardrails. Must support web playback, seek, timeupdate, volume, and device restrictions.
Storage: IndexedDB/Cache Storage for library, playlists, and offline downloads; localStorage for lightweight preferences only.
Backend (minimal): Next.js API routes for playlist sharing endpoints and token generation; no user accounts. Consider rate limiting and token expiration.
Lyrics: Integrate with a licensed lyrics provider for static and synced lyrics; fall back to “Lyrics unavailable.”
Offline: Respect SDK and license constraints; encrypt stored media; handle TTL and invalidation upon license change.
Compliance: Consent management, privacy policy, data deletion controls (local-only) to meet GDPR.
Testing: Unit tests for core logic; smoke tests for search/playback; accessibility checks.
Data Requirements

Entities: Track, Album, Artist, Playlist, Queue, LibraryItem, Lyrics.
Track fields: id, title, artists, albumId, durationMs, artwork, territories, downloadable, lyricsAvailable, explicit, popularity.
Playlist fields: id, name, description, trackIds[], createdAt, updatedAt, ownerType=anonymous, shareToken?, isPublic.
Queue state: nowPlaying, upNext[], history[]; persisted per device.
Analytics: event timestamps, event types, anonymous session id; no PII.
Edge Cases

Track unavailable in region: show disabled state, offer alternatives.
DRM/license errors: block playback and explain.
Network offline mid-stream: automatic retry with offline fallback if available.
Mixed availability in playlists: mark each track’s availability and downloadability.
Lyrics timing drift or missing lines: degrade to static lyrics or hide gracefully.
Storage quota exceeded: notify and provide cleanup tools.
Acceptance Criteria

Search returns relevant results for songs, albums, and artists with correct metadata within 500ms backend latency p95 (data-source dependent).
Playback controls operate reliably; seek accuracy within ±250ms.
Queue reflects correct order and state across navigation and refresh.
Playlists can be created, edited, reordered, and shared via tokenized links; recipients can open and play shared playlists (subject to licensing).
Likes/Library persist across reloads on the same device and appear within 100ms on list open.
Downloads are available offline for permitted tracks; offline mode plays without network.
Lyrics render when available; synced lyrics scroll in time within ±300ms tolerance.
Crossfade duration is configurable and applies consistently; gapless plays with no audible gap when supported.
WCAG 2.1 AA checks pass for core flows; keyboard-only navigation is possible end-to-end.
Consent banner appears on first load; local data deletion clears library, playlists, downloads.
Success Metrics

Day-7 retention ≥ X% (to be finalized).
Median time listening per session ≥ Y minutes (to be finalized).
Search-to-play conversion ≥ 60%.
Crash-free sessions ≥ 99.5%.
Buffer underrun rate ≤ 1 per 30 minutes median.
Open Questions

What specific third-party streaming SDK and catalog provider will be used? Confirm feature coverage (seek, crossfade, gapless) and license terms for offline.
Can we enable crossfade/gapless directly through the SDK, or must it be implemented at the app layer?
Are there territory restrictions requiring geo-fencing at the UI/API level?
Which lyrics provider will be licensed, and do we have rights for synced lyrics?
Are there constraints on bitrate, loudness normalization, and device output control from the SDK?
What are the concrete targets for X (retention) and Y (session minutes)?
Any brand guidelines or component library constraints beyond "Spottify-like" inspiration?
