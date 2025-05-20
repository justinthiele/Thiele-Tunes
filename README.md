# Thiele Tunes - A Navidrome Web Client

This is a simple web-based client for Navidrome, aiming to provide an Apple Music-like interface for browsing and playing your music library.

## Project Goals

-   Browse music library by Genres, Artists, and Albums.
-   View a filterable list of songs.
-   Basic music playback controls: Play, Pause, Next, Previous.
-   Display album art.
-   Client-side caching of library metadata using IndexedDB for performance.

## Setup

1.  **Clone/Download:** Get these files onto your local system.
2.  **Web Server:** Since this is a client-side application using `fetch` for API calls and potentially `IndexedDB`, you'll need to serve `index.html` through a simple local web server. Directly opening `index.html` in your browser (e.g., `file:///...`) might lead to CORS issues or prevent `IndexedDB` from working correctly in some browsers.
    *   If you have Python installed, you can navigate to the `thiele-tunes` directory in your terminal and run:
        ```bash
        python -m http.server
        ```
        Then open `http://localhost:8000` (or whatever port it indicates) in your browser.
    *   Alternatively, you can use other tools like `npx serve` (if you have Node.js/npm) or an extension for your code editor (like VS Code's Live Server).
3.  **Navidrome Server:** Ensure your Navidrome server is running and accessible from the machine where you are running this client.
4.  **Configuration:**
    *   Open the web application in your browser.
    *   Click on "Server Configuration".
    *   Enter your Navidrome server URL (e.g., `http://your-navidrome-ip:4533`),
    *   Enter your Navidrome username and password.
    *   Click "Connect & Sync".

## Technologies

-   HTML5
-   CSS3
-   Vanilla JavaScript
-   IndexedDB (for client-side data storage)
-   Navidrome API (Subsonic-compatible)

## Development Notes

-   The primary logic will reside in `script.js`.
-   Styling is handled by `style.css`.
-   The main page is `index.html`.

## To-Do / Roadmap (High Level)

(Refer to the `ToDO` file discussed previously for a more detailed breakdown - this README provides a general overview. We will be updating the `ToDO` file from the earlier conversation as we progress.)

1.  **Phase 1: Basic Setup & Data Fetching**
    *   Implement Navidrome API interaction (authentication, fetching library data).
    *   Set up IndexedDB for storing library metadata.
    *   Initial data sync mechanism.
2.  **Phase 2: UI Interaction & Core Logic**
    *   Populate and link Genre, Artist, and Album columns.
    *   Display and filter the song list.
3.  **Phase 3: Player Implementation**
    *   Implement audio playback and controls.
    *   Display current track information and album art.
4.  **Phase 4: Enhancements & Polish**
    *   UI/UX improvements.
    *   Error handling and feedback.
    *   Settings persistence. 