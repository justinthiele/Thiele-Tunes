# Navidrome Web Client Project (Thiele Tunes)

## Phase 1: Basic Setup & Data Fetching
- [ ] Setup HTML structure (`index.html`)
  - [x] Genre column
  - [x] Artist column
  - [x] Album column
  - [x] Song list section
  - [x] Player controls section
- [x] Basic CSS styling (`style.css`)
- [x] Javascript initial setup (`script.js`)
- [ ] Implement Navidrome API interaction
  - [ ] Configuration for server URL and credentials (UI elements created)
  - [x] Store and retrieve server configuration (e.g., localStorage)
  - [x] Ping server / Authentication (`/rest/ping.view`)
  - [x] Fetch all genres (`/rest/getGenres.view`)
  - [x] Fetch all artists (`/rest/getArtists.view`)
  - [x] Fetch all albums (`/rest/getAlbumList2.view` - using type `alphabeticalByName` or similar initially)
  - [ ] Fetch all songs (metadata) - This will likely be done in batches or by album/artist to avoid overwhelming requests. (`/rest/getAlbum.view` for songs in an album, or `/rest/getSongsByCriteria.view` if needed, though might be heavy)
- [x] Setup IndexedDB
  - [x] Define schema for songs, artists, albums, genres (keyPath for genres updated to 'value')
  - [x] Function to sync/cache data from Navidrome to IndexedDB (genres, artists, albums cached)
  - [x] Provide visual feedback to the user during initial sync (loading overlay created)

## Phase 2: UI Interaction & Core Logic
- [x] Populate Genre column from IndexedDB (or directly from API initially)
  - [x] Add "All Genres" option to clear filter/show all artists
- [ ] When a genre is selected:
    - [x] Filter Artist column based on selected Genre.
    - [x] Initially show all artists if no genre selected.
    - [x] Add "All Artists" option to clear sub-filter (relevant for albums later)
- [ ] When an artist is selected:
    - [ ] Filter Album column based on selected Artist (and Genre, if applicable).
- [ ] When an album is selected (or any combination of filters):
    - [ ] Display songs in the song list section based on current selections.
- [ ] Implement song filter/search within the displayed song list.
- [ ] Handle selection states in columns and song list.

## Phase 3: Player Implementation
- [ ] When a song is clicked/selected from the list:
    - [ ] Load and play the song using HTML5 `<audio>` element (`/rest/stream.view` endpoint).
    - [ ] Basic audio playback controls (Play, Pause).
    - [ ] Update play/pause button state.
- [ ] Next/Previous track functionality based on the current song list.
- [ ] Display current song info (title, artist, album) in the player area.
- [ ] Fetch and display album art for the current song (`/rest/getCoverArt.view`).
- [ ] Implement progress bar: display current time and duration, allow seeking.
- [ ] Implement volume control.
- [ ] Handle audio events (e.g., `ended`, `error`, `timeupdate`).

## Phase 4: Enhancements & Polish
- [ ] UI improvements and responsiveness (ongoing).
- [ ] Comprehensive error handling and user feedback messages.
- [ ] Settings persistence for Navidrome URL, username (consider security for password - avoid storing directly if possible or use secure methods).
- [ ] Performance optimizations (e.g., virtual scrolling for very long lists if necessary).
- [ ] Code cleanup, commenting, and further documentation.
- [ ] Optional: Shuffle/Repeat functionality.
- [ ] Optional: Save current queue/playlist state.
- [ ] Optional: Theme options (light/dark).

## API Call Parameters (Subsonic)
Common parameters:
- `u`: username
- `p`: password (or `t` for token and `s` for salt if using token-based auth)
- `v`: API version (e.g., `1.16.1`)
- `c`: client name (e.g., `ThieleTunes`)
- `f`: format (usually `json` or `xml`)

Endpoints:
- Ping: `/rest/ping.view`
- Get Genres: `/rest/getGenres.view`
- Get Artists: `/rest/getArtists.view`
- Get Album List: `/rest/getAlbumList2.view` (params: `type` like `alphabeticalByName`, `recent`, `frequent`, etc.)
- Get Album (songs in album): `/rest/getAlbum.view` (param: `id` of the album)
- Get Songs by Criteria: `/rest/getSongsByCriteria.view` (various params for filtering)
- Stream song: `/rest/stream.view` (param: `id` of the song)
- Get Cover Art: `/rest/getCoverArt.view` (param: `id` of the song/album, `size` optional) 