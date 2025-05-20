// Thiele Tunes - Navidrome Web Client
// script.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Thiele Tunes client script loaded.');

    // Configuration
    const API_VERSION = '1.16.1';
    const CLIENT_NAME = 'ThieleTunes';
    const RESPONSE_FORMAT = 'json';
    const ALL_ITEMS_IDENTIFIER = '__ALL__'; // Identifier for "All" selections

    // IndexedDB Configuration
    const DB_NAME = 'ThieleTunesDB';
    const DB_VERSION = 2;
    const GENRES_STORE_NAME = 'genres';
    const ARTISTS_STORE_NAME = 'artists';
    const ALBUMS_STORE_NAME = 'albums';
    const SONGS_STORE_NAME = 'songs'; // Will be populated later
    let db; // To hold the IndexedDB database instance

    // DOM Element References
    const navidromeUrlInput = document.getElementById('navidrome-url');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const connectButton = document.getElementById('connect-server');
    const connectionStatus = document.getElementById('connection-status');
    const serverConfigForm = document.getElementById('server-config-form');
    const serverConfigDetails = document.querySelector('#server-config-section details');

    // --- Search Input DOM References ---
    const genreSearchInput = document.getElementById('genre-search');
    const artistSearchInput = document.getElementById('artist-search');
    const albumSearchInput = document.getElementById('album-search');
    const songSearchInput = document.getElementById('song-filter-input'); // Uses existing ID
    // const clearSongFilterButton = document.getElementById('clear-song-filter-button'); // Will be replaced

    // New clear search buttons (X buttons)
    const clearGenreSearchBtn = document.getElementById('clear-genre-search-btn');
    const clearArtistSearchBtn = document.getElementById('clear-artist-search-btn');
    const clearAlbumSearchBtn = document.getElementById('clear-album-search-btn');
    const clearSongFilterBtn = document.getElementById('clear-song-filter-btn');

    const loadingOverlay = document.getElementById('loading-overlay');

    // --- DOM Element References for Library Display ---
    const genresListUI = document.getElementById('genres-list');
    const artistsListUI = document.getElementById('artists-list');
    const albumsListUI = document.getElementById('albums-list');
    const songsListUI = document.getElementById('songs-list');
    const songsHeaderTitleUI = document.getElementById('songs-header-title');

    // --- DOM Element References for Player ---
    const audioPlayer = document.getElementById('audio-player');
    const albumArtUI = document.getElementById('current-album-art');
    const currentSongTitleUI = document.getElementById('current-song-title');
    const currentSongArtistUI = document.getElementById('current-song-artist');
    const currentSongAlbumUI = document.getElementById('current-song-album');
    const playPauseButton = document.getElementById('play-pause');
    const prevTrackButton = document.getElementById('prev-track'); 
    const nextTrackButton = document.getElementById('next-track'); 
    const progressBar = document.getElementById('progress-bar'); 
    const currentTimeUI = document.getElementById('current-time'); 
    const totalDurationUI = document.getElementById('total-duration'); 
    const volumeSlider = document.getElementById('volume-slider'); 

    // --- Store for API credentials ---
    let currentConfig = {
        serverUrl: '',
        username: '',
        password: '' // Note: Password is kept in memory, not localStorage
    };

    // --- Application State ---
    let libraryData = {
        genres: [],
        artists: [],
        albums: [],
        songs: [] 
    };
    let currentSelections = { 
        genre: ALL_ITEMS_IDENTIFIER,
        artist: ALL_ITEMS_IDENTIFIER,
        album: ALL_ITEMS_IDENTIFIER
    };
    let currentPlaylist = {  // To manage the current list of songs for playback
        songs: [],
        currentIndex: -1 
    };
    // Variables to hold the last fully fetched (but not necessarily displayed) lists for client-side filtering
    let lastFetchedGenres = [];
    let lastFetchedArtists = [];
    let lastFetchedAlbums = [];
    let lastFetchedSongs = [];

    let songSortState = {
        column: 'track', // Default sort: track number
        direction: 'ASC'   // 'ASC' or 'DESC'
    };

    // --- IndexedDB Functions ---
    async function initDB() {
        if (db) return Promise.resolve(db); // If db is already initialized, return it
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                console.log(`Upgrading database from version ${event.oldVersion} to ${event.newVersion}`);

                // Genres Store - updating keyPath from 'name' to 'value'
                if (event.oldVersion < 2) { // Apply this change if upgrading from a version before 2
                    if (db.objectStoreNames.contains(GENRES_STORE_NAME)) {
                        db.deleteObjectStore(GENRES_STORE_NAME);
                        console.log(`Object store ${GENRES_STORE_NAME} deleted for keyPath update.`);
                    }
                }
                if (!db.objectStoreNames.contains(GENRES_STORE_NAME)) {
                    const genresStore = db.createObjectStore(GENRES_STORE_NAME, { keyPath: 'value' }); // Correct keyPath for Navidrome genre objects
                    // genresStore.createIndex('value', 'value', { unique: true }); // If an index on genre name is needed later
                    console.log(`Object store ${GENRES_STORE_NAME} created/updated with keyPath 'value'.`);
                }

                // Artists Store
                if (!db.objectStoreNames.contains(ARTISTS_STORE_NAME)) {
                    const artistsStore = db.createObjectStore(ARTISTS_STORE_NAME, { keyPath: 'id' });
                    artistsStore.createIndex('name', 'name', { unique: false });
                    console.log(`Object store ${ARTISTS_STORE_NAME} created.`);
                }

                // Albums Store
                if (!db.objectStoreNames.contains(ALBUMS_STORE_NAME)) {
                    const albumsStore = db.createObjectStore(ALBUMS_STORE_NAME, { keyPath: 'id' });
                    albumsStore.createIndex('name', 'name', { unique: false });
                    albumsStore.createIndex('artistId', 'artistId', { unique: false });
                    albumsStore.createIndex('genre', 'genre', { unique: false });
                    console.log(`Object store ${ALBUMS_STORE_NAME} created.`);
                }

                // Songs Store (basic structure for now)
                if (!db.objectStoreNames.contains(SONGS_STORE_NAME)) {
                    const songsStore = db.createObjectStore(SONGS_STORE_NAME, { keyPath: 'id' });
                    songsStore.createIndex('title', 'title', { unique: false });
                    songsStore.createIndex('albumId', 'albumId', { unique: false });
                    songsStore.createIndex('artistId', 'artistId', { unique: false });
                    // songsStore.createIndex('genre', 'genre', { unique: false }); // If songs have direct genre info
                    console.log(`Object store ${SONGS_STORE_NAME} created.`);
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log(`Database ${DB_NAME} version ${DB_VERSION} opened successfully.`);
                resolve(db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    async function clearObjectStore(storeName) {
        if (!db) {
            console.error('DB not initialized for clearing store.');
            return Promise.reject('DB not initialized');
        }
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => {
                console.log(`Store ${storeName} cleared.`);
                resolve();
            };
            request.onerror = (event) => {
                console.error(`Error clearing store ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async function addDataToDB(storeName, data) {
        if (!db) {
            console.error('DB not initialized for adding data.');
            return Promise.reject('DB not initialized');
        }
        if (!data || data.length === 0) {
            console.log(`No data to add to ${storeName} because input data array is empty.`); // More specific log
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            let itemsAdded = 0;
            let itemsSkipped = 0;

            data.forEach(item => {
                let itemToAdd = item;
                let keyPathValue;

                // Determine the keyPath based on the storeName and check its existence
                if (storeName === GENRES_STORE_NAME) {
                    keyPathValue = itemToAdd?.value; // Corrected to use 'value' for genres
                    if (typeof keyPathValue !== 'string' || keyPathValue.trim() === '') {
                        console.warn(`Skipping genre item due to missing or invalid 'value' (keyPath):`, itemToAdd);
                        itemsSkipped++;
                        return; // Skip this item
                    }
                } else if (storeName === ARTISTS_STORE_NAME || storeName === ALBUMS_STORE_NAME || storeName === SONGS_STORE_NAME) {
                    keyPathValue = itemToAdd?.id;
                    if (typeof keyPathValue === 'undefined' || keyPathValue === null || String(keyPathValue).trim() === '') {
                        console.warn(`Skipping item in ${storeName} due to missing or invalid 'id' (keyPath):`, itemToAdd);
                        itemsSkipped++;
                        return; // Skip this item
                    }
                } else {
                    console.warn(`Unknown store name ${storeName} in addDataToDB. Cannot validate keyPath.`);
                    itemsSkipped++;
                    return; // Skip this item
                }
                
                // The specific check for GENRES_STORE_NAME and typeof item === 'string' seems to be a leftover from an earlier assumption
                // and is unlikely to be hit given Navidrome's response structure. Kept for safety but commented out its internal logic.
                /*
                if (storeName === GENRES_STORE_NAME && typeof item === 'string') { 
                     // This case might not be needed if getGenres.view returns objects with a name property
                }
                */

                const request = store.put(itemToAdd);
                request.onsuccess = () => {
                    itemsAdded++;
                };
                request.onerror = (event) => {
                    console.error(`Error adding item to ${storeName}:`, event.target.error, itemToAdd);
                    itemsSkipped++; // Also count as skipped if individual put fails
                };
            });

            transaction.oncomplete = () => {
                console.log(`${itemsAdded} items successfully added to ${storeName}. ${itemsSkipped} items skipped.`);
                resolve();
            };

            transaction.onerror = (event) => {
                console.error(`Transaction error adding data to ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async function cacheLibraryData() {
        if (!db) {
            console.error('Database not initialized. Cannot cache data.');
            return;
        }
        showLoading('Caching library data locally...');
        try {
            // Clear existing data first
            await clearObjectStore(GENRES_STORE_NAME);
            await clearObjectStore(ARTISTS_STORE_NAME);
            await clearObjectStore(ALBUMS_STORE_NAME);
            await clearObjectStore(SONGS_STORE_NAME); // Clear songs store

            // De-duplicate albums before adding to DB
            const seenAlbums = new Set();
            const uniqueAlbums = [];
            if (libraryData.albums && Array.isArray(libraryData.albums)) {
                const originalAlbumCount = libraryData.albums.length;
                libraryData.albums.forEach(album => {
                    const albumKey = album.id; // De-duplicate by album.id for true uniqueness
                    if (!seenAlbums.has(albumKey)) {
                        seenAlbums.add(albumKey);
                        uniqueAlbums.push(album);
                    } else {
                        console.log(`Duplicate album (based on album.id '${albumKey}') skipped during caching. Original entry details: ID ${album.id}, Name: '${album.name}', Artist: '${album.artist}', ArtistID: ${album.artistId}`);
                    }
                });
                if (originalAlbumCount > uniqueAlbums.length) {
                    console.log(`De-duplicated albums: Original count: ${originalAlbumCount}, Unique count after de-duplication: ${uniqueAlbums.length}`);
                }
                libraryData.albums = uniqueAlbums; 
            }

            // Add new data
            await Promise.all([
                addDataToDB(GENRES_STORE_NAME, libraryData.genres),
                addDataToDB(ARTISTS_STORE_NAME, libraryData.artists),
                addDataToDB(ALBUMS_STORE_NAME, libraryData.albums),
                addDataToDB(SONGS_STORE_NAME, libraryData.songs) // Add songs to DB
            ]);
            console.log('Library data cached in IndexedDB.');
            updateConnectionStatus('Library data cached locally!');
            await populateGenresUI();
            await populateArtistsUI(currentSelections.genre); 
            await populateAlbumsUI(currentSelections.genre, currentSelections.artist);
            await populateSongsUI(currentSelections.genre, currentSelections.artist, currentSelections.album); // Initial song population
        } catch (error) {
            console.error('Error caching library data:', error);
            updateConnectionStatus('Error caching data locally.', true);
        } finally {
            hideLoading();
        }
    }

    // --- UI Population Functions ---
    async function getAllDataFromStore(storeName) {
        if (!db) {
            console.error('DB not initialized for getting data.');
            return Promise.reject('DB not initialized');
        }
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            request.onerror = (event) => {
                console.error(`Error fetching all data from ${storeName}:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    function setSelectedListItem(listElement, selectedLi) {
        if (!listElement) return;
        listElement.querySelectorAll('li.selected').forEach(el => el.classList.remove('selected'));
        if (selectedLi) {
            selectedLi.classList.add('selected');
        }
    }

    function displayGenres(genresToDisplay) {
        genresListUI.innerHTML = ''; 
        const allGenresLi = document.createElement('li');
        allGenresLi.textContent = 'All Genres';
        allGenresLi.dataset.genreName = ALL_ITEMS_IDENTIFIER;
        allGenresLi.addEventListener('click', async () => {
            console.log('All Genres clicked');
            currentSelections.genre = ALL_ITEMS_IDENTIFIER;
            currentSelections.artist = ALL_ITEMS_IDENTIFIER;
            currentSelections.album = ALL_ITEMS_IDENTIFIER;

            if (genreSearchInput) {
                genreSearchInput.value = '';
                genreSearchInput.dispatchEvent(new Event('input'));
            } else {
                applyGenreSearchAndDisplay();
            }

            await populateArtistsUI(ALL_ITEMS_IDENTIFIER);
            await populateAlbumsUI(ALL_ITEMS_IDENTIFIER, ALL_ITEMS_IDENTIFIER);
            songsListUI.innerHTML = ''; // Clear songs list
            songsHeaderTitleUI.textContent = 'Songs';
            document.getElementById('total-songs-count').textContent = '(0)';
        });
        genresListUI.appendChild(allGenresLi);

        if (!genresToDisplay || genresToDisplay.length === 0) {
            if (genreSearchInput && genreSearchInput.value.trim() !== '') {
                allGenresLi.insertAdjacentHTML('afterend', `<li style="font-style: italic;">No genres match '${genreSearchInput.value.trim()}'.</li>`);
            }
        } else {
            const sortedGenres = genreSearchInput.value.trim() === '' ? 
                                 [...genresToDisplay].sort((a, b) => a.value.localeCompare(b.value)) :
                                 genresToDisplay;
            sortedGenres.forEach(genre => {
                const li = document.createElement('li');
                li.textContent = genre.value; 
                li.dataset.genreName = genre.value; 
                li.title = `${genre.value} (${genre.songCount} songs, ${genre.albumCount} albums)`;

                li.addEventListener('click', async () => {
                    console.log(`Genre clicked:`, genre);
                    setSelectedListItem(genresListUI, li);
                    currentSelections.genre = genre.value;
                    currentSelections.artist = ALL_ITEMS_IDENTIFIER;
                    currentSelections.album = ALL_ITEMS_IDENTIFIER;
                    
                    artistsListUI.innerHTML = '<li>Loading artists...</li>'; 
                    albumsListUI.innerHTML = ''; 
                    songsListUI.innerHTML = ''; 
                    songsHeaderTitleUI.textContent = 'Songs'; 
                    document.getElementById('total-songs-count').textContent = '(0)';
                    await populateArtistsUI(genre.value);
                    await populateAlbumsUI(genre.value, ALL_ITEMS_IDENTIFIER);
                });
                genresListUI.appendChild(li);
            });
        }
        console.log('Genres UI populated.');
        // Set "All Genres" as selected by default if it's the current state
        if (currentSelections.genre === ALL_ITEMS_IDENTIFIER && genresListUI.firstChild) {
            setSelectedListItem(genresListUI, genresListUI.firstChild);
        } else {
            // If a specific genre was previously selected, try to reselect it
            const previouslySelectedGenreLi = genresListUI.querySelector(`li[data-genre-name="${currentSelections.genre}"]`);
            if (previouslySelectedGenreLi) setSelectedListItem(genresListUI, previouslySelectedGenreLi);
            else if (genresListUI.firstChild) setSelectedListItem(genresListUI, genresListUI.firstChild); // Fallback to All
        }
    }

    async function populateGenresUI() {
        try {
            lastFetchedGenres = await getAllDataFromStore(GENRES_STORE_NAME); // Store full list
            applyGenreSearchAndDisplay(); // Apply current search (if any) and display
        } catch (error) {
            console.error('Failed to populate genres UI:', error);
            genresListUI.innerHTML = '<li>Error loading genres.</li>';
        } finally {
            // hideLoading(); // Removed
        }
    }

    function applyGenreSearchAndDisplay() {
        const searchTerm = genreSearchInput ? genreSearchInput.value.toLowerCase().trim() : '';
        let genresToDisplay = lastFetchedGenres;
        if (searchTerm && lastFetchedGenres) {
            genresToDisplay = lastFetchedGenres.filter(genre => 
                genre.value.toLowerCase().includes(searchTerm)
            ).sort((a,b) => a.value.localeCompare(b.value)); // Sort here after filtering
        } else if (lastFetchedGenres) {
             // If no search term, display all (but still sort them)
            genresToDisplay = [...lastFetchedGenres].sort((a,b) => a.value.localeCompare(b.value));
        }
        displayGenres(genresToDisplay || []); // Pass the (filtered and sorted) list to displayGenres
    }

    async function getMultipleItemsFromStoreByIds(storeName, ids) {
        if (!db) {
            console.error('DB not initialized for getting items by IDs.');
            return Promise.reject('DB not initialized');
        }
        if (!ids || ids.length === 0) {
            return Promise.resolve([]);
        }

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const results = [];
            let processedCount = 0;

            ids.forEach(id => {
                const request = store.get(id);
                request.onsuccess = () => {
                    if (request.result) {
                        results.push(request.result);
                    }
                    processedCount++;
                    if (processedCount === ids.length) {
                        resolve(results);
                    }
                };
                request.onerror = (event) => {
                    console.error(`Error fetching item with id ${id} from ${storeName}:`, event.target.error);
                    processedCount++; // Still count as processed to not hang the promise
                    if (processedCount === ids.length) {
                        resolve(results); // Resolve with what we have so far
                    }
                };
            });
             // Handle empty ids array immediately
            if (ids.length === 0) {
                resolve([]);
            }
        });
    }

    function displayArtists(artistsToDisplay, selectedGenreName) {
        artistsListUI.innerHTML = ''; 
        albumsListUI.innerHTML = ''; 
        songsListUI.innerHTML = '';
        songsHeaderTitleUI.textContent = 'Songs';
        document.getElementById('total-songs-count').textContent = '(0)';

        const allArtistsLi = document.createElement('li');
        allArtistsLi.textContent = 'All Artists';
        allArtistsLi.dataset.artistId = ALL_ITEMS_IDENTIFIER;
        allArtistsLi.addEventListener('click', async () => {
            console.log('All Artists clicked. Selected genre:', currentSelections.genre);
            currentSelections.artist = ALL_ITEMS_IDENTIFIER;
            currentSelections.album = ALL_ITEMS_IDENTIFIER;

            if (artistSearchInput) {
                artistSearchInput.value = '';
                artistSearchInput.dispatchEvent(new Event('input'));
            } else {
                applyArtistSearchAndDisplay(currentSelections.genre);
            }

            await populateAlbumsUI(currentSelections.genre, ALL_ITEMS_IDENTIFIER);
            await populateSongsUI(currentSelections.genre, ALL_ITEMS_IDENTIFIER, ALL_ITEMS_IDENTIFIER);
        });
        artistsListUI.appendChild(allArtistsLi);

        if (!artistsToDisplay || artistsToDisplay.length === 0) {
            if (artistSearchInput && artistSearchInput.value.trim() !== '') {
                allArtistsLi.insertAdjacentHTML('afterend', `<li style="font-style: italic;">No artists match '${artistSearchInput.value.trim()}'.</li>`);
            } else if (selectedGenreName && selectedGenreName !== ALL_ITEMS_IDENTIFIER) {
                allArtistsLi.insertAdjacentHTML('afterend', '<li style="font-style: italic;">No artists found for this genre.</li>');
            }
        } else {
            const sortedArtists = artistSearchInput.value.trim() === '' ? 
                                 [...artistsToDisplay].sort((a, b) => a.name.localeCompare(b.name)) :
                                 artistsToDisplay;
            sortedArtists.forEach(artist => {
                const li = document.createElement('li');
                li.textContent = artist.name;
                li.dataset.artistId = artist.id;
                li.dataset.artistName = artist.name; 
                li.title = artist.name; 

                li.addEventListener('click', async () => {
                    console.log(`Artist clicked:`, artist, `(Genre: ${currentSelections.genre})`);
                    setSelectedListItem(artistsListUI, li);
                    currentSelections.artist = artist.id;
                    currentSelections.album = ALL_ITEMS_IDENTIFIER;
                    await populateAlbumsUI(currentSelections.genre, artist.id);
                    await populateSongsUI(currentSelections.genre, currentSelections.artist, ALL_ITEMS_IDENTIFIER);
                });
                artistsListUI.appendChild(li);
            });
        }
        console.log('Artists UI populated for genre:', selectedGenreName || 'All');
        // Set "All Artists" as selected by default if it's the current state for this column
        if (currentSelections.artist === ALL_ITEMS_IDENTIFIER && artistsListUI.firstChild) {
            setSelectedListItem(artistsListUI, artistsListUI.firstChild);
        } else {
            const previouslySelectedArtistLi = artistsListUI.querySelector(`li[data-artist-id="${currentSelections.artist}"]`);
            if (previouslySelectedArtistLi) setSelectedListItem(artistsListUI, previouslySelectedArtistLi);
            else if (artistsListUI.firstChild) setSelectedListItem(artistsListUI, artistsListUI.firstChild); // Fallback to All
        }
    }

    async function populateArtistsUI(selectedGenreName) {
        let artistsForGenre = [];
        try {
            if (!selectedGenreName || selectedGenreName === ALL_ITEMS_IDENTIFIER) {
                artistsForGenre = await getAllDataFromStore(ARTISTS_STORE_NAME);
                currentSelections.genre = ALL_ITEMS_IDENTIFIER; 
            } else {
                const allAlbums = await getAllDataFromStore(ALBUMS_STORE_NAME);
                const artistIdsForGenre = new Set();
                allAlbums.forEach(album => {
                    if (album.genre && typeof album.genre === 'string' && 
                        album.genre.toLowerCase() === selectedGenreName.toLowerCase()) {
                        artistIdsForGenre.add(album.artistId);
                    }
                });
                if (artistIdsForGenre.size > 0) {
                    artistsForGenre = await getMultipleItemsFromStoreByIds(ARTISTS_STORE_NAME, Array.from(artistIdsForGenre));
                } else {
                    artistsForGenre = []; 
                }
            }
            lastFetchedArtists = artistsForGenre; // Store the fully fetched list for this context
            applyArtistSearchAndDisplay(selectedGenreName); // Apply search and display
        } catch (error) {
            console.error(`Failed to populate artists UI for genre ${selectedGenreName || 'All'}:`, error);
            artistsListUI.innerHTML = `<li>Error loading artists for ${selectedGenreName || 'All'}.</li>`;
        }
    }

    function applyArtistSearchAndDisplay(selectedGenreNameContext) {
        const searchTerm = artistSearchInput ? artistSearchInput.value.toLowerCase().trim() : '';
        let artistsToDisplay = lastFetchedArtists;

        if (searchTerm && lastFetchedArtists) {
            artistsToDisplay = lastFetchedArtists.filter(artist => 
                artist.name.toLowerCase().includes(searchTerm)
            ).sort((a,b) => a.name.localeCompare(b.name)); // Sort after filtering
        } else if (lastFetchedArtists) {
            artistsToDisplay = [...lastFetchedArtists].sort((a,b) => a.name.localeCompare(b.name)); // Sort full list if no search
        }
        displayArtists(artistsToDisplay || [], selectedGenreNameContext); // Pass to display
    }

    function displayAlbums(albumsToDisplay, context) {
        albumsListUI.innerHTML = '';
        songsListUI.innerHTML = ''; 
        songsHeaderTitleUI.textContent = 'Songs';
        document.getElementById('total-songs-count').textContent = '(0)';

        const allAlbumsLi = document.createElement('li');
        allAlbumsLi.textContent = 'All Albums';
        allAlbumsLi.dataset.albumId = ALL_ITEMS_IDENTIFIER;
        allAlbumsLi.addEventListener('click', async () => {
            currentSelections.album = ALL_ITEMS_IDENTIFIER;

            if (albumSearchInput) {
                albumSearchInput.value = '';
                albumSearchInput.dispatchEvent(new Event('input'));
            } else {
                applyAlbumSearchAndDisplay(context);
            }

            await populateSongsUI(currentSelections.genre, currentSelections.artist, ALL_ITEMS_IDENTIFIER);
        });
        albumsListUI.appendChild(allAlbumsLi);

        if (albumsToDisplay && albumsToDisplay.length > 0) {
            // albumsToDisplay is now always sorted by applyAlbumSearchAndDisplay
            const sortedAlbums = albumsToDisplay; 

            // De-duplicate for display purposes based on album name ONLY
            const deduplicatedAlbumsForDisplay = [];
            const seenAlbumNames = new Set(); // Changed Set name
            if (Array.isArray(sortedAlbums)) { // sortedAlbums is the input, already sorted by album name then artist
                sortedAlbums.forEach(album => {
                    const albumNameKey = (album.name || 'Unknown Album').toLowerCase(); // Key is now just the album name
                    if (!seenAlbumNames.has(albumNameKey)) {
                        seenAlbumNames.add(albumNameKey);
                        deduplicatedAlbumsForDisplay.push(album); // Add the first encountered album object for this name
                    }
                });
            }

            deduplicatedAlbumsForDisplay.forEach(album => {
                const li = document.createElement('li');
                li.textContent = album.name || 'Unknown Album';
                li.dataset.albumId = album.id;
                li.title = `${album.name} by ${album.artist} (Genre: ${album.genre || 'N/A'})`;
                li.addEventListener('click', async () => {
                    setSelectedListItem(albumsListUI, li);
                    currentSelections.album = album.id;
                    await populateSongsUI(currentSelections.genre, currentSelections.artist, album.id);
                });
                albumsListUI.appendChild(li);
            });
        } else {
            let noAlbumsMsg = 'No albums found.';
            if(context && context.genre !== ALL_ITEMS_IDENTIFIER && context.artist !== ALL_ITEMS_IDENTIFIER) {
                noAlbumsMsg = `No albums by this artist in the selected genre.`
            } else if (context && context.genre !== ALL_ITEMS_IDENTIFIER) {
                noAlbumsMsg = `No albums found for the selected genre.`
            } else if (context && context.artist !== ALL_ITEMS_IDENTIFIER) {
                 noAlbumsMsg = 'No albums found for this artist.';
            }
             allAlbumsLi.insertAdjacentHTML('afterend', `<li style="font-style: italic;">${noAlbumsMsg}</li>`);
        }
        const targetLi = albumsListUI.querySelector(`li[data-album-id="${currentSelections.album}"]`) || allAlbumsLi;
        setSelectedListItem(albumsListUI, targetLi);
        console.log('Albums UI populated.');
    }

    async function populateAlbumsUI(selectedGenre, selectedArtistId) {
        const context = { genre: selectedGenre, artist: selectedArtistId }; 
        let albumsForContext = [];
        try {
            let allAlbumsFromDB = await getAllDataFromStore(ALBUMS_STORE_NAME);

            if (selectedGenre !== ALL_ITEMS_IDENTIFIER) {
                allAlbumsFromDB = allAlbumsFromDB.filter(album => 
                    album.genre && typeof album.genre === 'string' && 
                    album.genre.toLowerCase() === selectedGenre.toLowerCase()
                );
            }
            if (selectedArtistId !== ALL_ITEMS_IDENTIFIER) {
                allAlbumsFromDB = allAlbumsFromDB.filter(album => album.artistId === selectedArtistId);
            }
            albumsForContext = allAlbumsFromDB;
            lastFetchedAlbums = albumsForContext; // Store for client-side search
            applyAlbumSearchAndDisplay(context); // Apply search and display
        } catch (error) {
            console.error('Failed to populate albums UI:', error);
            albumsListUI.innerHTML = '<li>Error loading albums.</li>';
        }
    }

    function applyAlbumSearchAndDisplay(context) {
        const searchTerm = albumSearchInput ? albumSearchInput.value.toLowerCase().trim() : '';
        let albumsToDisplay = lastFetchedAlbums;

        const sortByNameThenArtist = (a, b) => {
            const albumNameA = (a.name || '').toLowerCase();
            const albumNameB = (b.name || '').toLowerCase();
            const artistNameA = (a.artist || '').toLowerCase();
            const artistNameB = (b.artist || '').toLowerCase();

            if (albumNameA < albumNameB) return -1;
            if (albumNameA > albumNameB) return 1;
            // Album names are the same, sort by artist
            if (artistNameA < artistNameB) return -1;
            if (artistNameA > artistNameB) return 1;
            return 0;
        };

        if (searchTerm && lastFetchedAlbums) {
            albumsToDisplay = lastFetchedAlbums.filter(album => 
                (album.name && album.name.toLowerCase().includes(searchTerm)) ||
                (album.artist && album.artist.toLowerCase().includes(searchTerm))
            ).sort(sortByNameThenArtist); // Sort using the new function
        } else if (lastFetchedAlbums) {
            // If no search term, display all (but still sort them using the new function)
            albumsToDisplay = [...lastFetchedAlbums].sort(sortByNameThenArtist);
        }
        displayAlbums(albumsToDisplay || [], context);
    }

    function displaySongs(songsToDisplay, context) {
        songsListUI.innerHTML = ''; // Clear previous songs (expecting songsListUI to be a tbody)
        const songCountSpan = document.getElementById('total-songs-count');

        let headerText = 'Songs'; // This might be less relevant with a full table display
        // Contextual header updates can remain if desired, or be simplified.
        if (context) {
            if (context.albumName && context.albumName !== ALL_ITEMS_IDENTIFIER) {
                headerText = `Songs in '${context.albumName}'`;
            } else if (context.artistName && context.artistName !== ALL_ITEMS_IDENTIFIER) {
                headerText = `Songs by '${context.artistName}'`;
                if (context.genreName && context.genreName !== ALL_ITEMS_IDENTIFIER) {
                    headerText += ` (Genre: ${context.genreName})`;
                }
            } else if (context.genreName && context.genreName !== ALL_ITEMS_IDENTIFIER) {
                headerText = `Songs in Genre: '${context.genreName}'`;
            }
        }
        // songsHeaderTitleUI.textContent = headerText; // Keep or remove based on table header preference

        if (!songsToDisplay || songsToDisplay.length === 0) {
            const message = (songSearchInput && songSearchInput.value.trim() !== '') ? 
                `No songs match '${songSearchInput.value.trim()}'.` : 
                'No songs found for this selection.';
            const tr = songsListUI.insertRow();
            const td = tr.insertCell();
            td.colSpan = 7; // Number of columns
            td.textContent = message;
            td.style.fontStyle = 'italic';
            songCountSpan.textContent = '(0)';
            currentPlaylist.songs = [];
            currentPlaylist.currentIndex = -1;
            return;
        }

        songCountSpan.textContent = `(${songsToDisplay.length})`;
        currentPlaylist.songs = [...songsToDisplay]; 

        const playingSongId = audioPlayer.dataset.playingSongId;
        currentPlaylist.currentIndex = playingSongId ? songsToDisplay.findIndex(s => s.id === playingSongId) : -1;

        songsToDisplay.forEach(song => {
            const tr = songsListUI.insertRow();
            tr.dataset.songId = song.id;

            // Create cells for each piece of data
            const cellTrack = tr.insertCell();
            cellTrack.textContent = song.track || '-';

            const cellTitle = tr.insertCell();
            cellTitle.textContent = song.title || 'Untitled Song';
            cellTitle.style.cursor = 'pointer'; // Indicate title is clickable for play

            const cellArtist = tr.insertCell();
            cellArtist.textContent = song.artist || 'Unknown Artist';

            const cellAlbum = tr.insertCell();
            cellAlbum.textContent = song.album || 'Unknown Album';

            const cellYear = tr.insertCell();
            cellYear.textContent = song.year || '-';

            const cellGenre = tr.insertCell();
            cellGenre.textContent = song.genre || '-'; 

            const cellLength = tr.insertCell();
            cellLength.textContent = song.duration ? formatTime(song.duration) : '-';

            tr.addEventListener('click', () => {
                playSong(song);
            });

            if (song.id === playingSongId) {
                tr.classList.add('song-playing');
            }
        });
        console.log(`Songs UI (table) populated for context:`, context, `Count: ${songsToDisplay.length}`);
    }

    async function populateSongsUI(selectedGenre, selectedArtistId, selectedAlbumId) {
        const context = { genreName: selectedGenre, artistId: selectedArtistId, albumId: selectedAlbumId }; 
        let songsForContext = [];
        try {
            const allSongsFromDB = await getAllDataFromStore(SONGS_STORE_NAME);
            if (!allSongsFromDB || allSongsFromDB.length === 0) {
                console.log('No songs found in local cache.');
                lastFetchedSongs = []; // Clear last fetched if nothing in DB
                applySongSearchAndDisplay({ ...context, albumName: selectedAlbumId === ALL_ITEMS_IDENTIFIER ? 'All' : selectedAlbumId });
                return;
            }

            if (selectedAlbumId !== ALL_ITEMS_IDENTIFIER) {
                const albumData = await getMultipleItemsFromStoreByIds(ALBUMS_STORE_NAME, [selectedAlbumId]);
                if (albumData.length > 0) context.albumName = albumData[0].name;
                songsForContext = allSongsFromDB.filter(song => (song.albumId !== undefined && String(song.albumId) === String(selectedAlbumId)) || (song.parent !== undefined && String(song.parent) === String(selectedAlbumId)));
            } else if (selectedArtistId !== ALL_ITEMS_IDENTIFIER) {
                const artistDataArray = await getMultipleItemsFromStoreByIds(ARTISTS_STORE_NAME, [selectedArtistId]);
                if (artistDataArray.length > 0) context.artistName = artistDataArray[0].name;
                songsForContext = allSongsFromDB.filter(song => song.artistId === selectedArtistId);
            } else if (selectedGenre !== ALL_ITEMS_IDENTIFIER) {
                const allAlbums = await getAllDataFromStore(ALBUMS_STORE_NAME);
                const albumsInGenre = allAlbums.filter(album => album.genre && album.genre.toLowerCase() === selectedGenre.toLowerCase());
                const albumIdsInGenre = albumsInGenre.map(album => album.id);
                if (albumIdsInGenre.length > 0) {
                    const albumIdSet = new Set(albumIdsInGenre);
                    songsForContext = allSongsFromDB.filter(song => albumIdSet.has(song.albumId) || albumIdSet.has(song.parent));
                } else {
                    songsForContext = [];
                }
            } else {
                songsForContext = allSongsFromDB; 
                context.genreName = 'All Genres';
                context.artistName = 'All Artists';
                context.albumName = 'All Albums';
            }
            lastFetchedSongs = songsForContext; // Store for client-side search
            applySongSearchAndDisplay(context); // Apply search and display
        } catch (error) {
            console.error('Failed to populate songs UI:', error);
            songsListUI.innerHTML = '<li>Error loading songs.</li>';
            document.getElementById('total-songs-count').textContent = '(0)';
        }
    }

    function applySongSearchAndDisplay(context) {
        const searchTerm = songSearchInput ? songSearchInput.value.toLowerCase().trim() : '';
        let songsToDisplay = lastFetchedSongs;

        if (searchTerm && lastFetchedSongs) {
            songsToDisplay = lastFetchedSongs.filter(song => 
                (song.title && song.title.toLowerCase().includes(searchTerm)) ||
                (song.artist && song.artist.toLowerCase().includes(searchTerm)) ||
                (song.album && song.album.toLowerCase().includes(searchTerm)) ||
                (song.genre && song.genre.toLowerCase().includes(searchTerm)) || // Added genre to search
                (String(song.year) && String(song.year).includes(searchTerm)) // Added year to search
            );
        } else if (!lastFetchedSongs) {
            songsToDisplay = [];
        }

        // Sorting logic
        if (songsToDisplay && songsToDisplay.length > 0) {
            songsToDisplay.sort((a, b) => {
                let valA = a[songSortState.column];
                let valB = b[songSortState.column];

                // Type-specific handling for sorting
                switch (songSortState.column) {
                    case 'track':
                    case 'year':
                    case 'duration': // duration is already numeric seconds
                        valA = parseFloat(valA) || 0;
                        valB = parseFloat(valB) || 0;
                        break;
                    case 'title':
                    case 'artist':
                    case 'album':
                    case 'genre':
                        valA = (String(valA) || '').toLowerCase();
                        valB = (String(valB) || '').toLowerCase();
                        break;
                    default:
                        // Fallback for unknown columns, treat as string
                        valA = (String(valA) || '').toLowerCase();
                        valB = (String(valB) || '').toLowerCase();
                        break;
                }

                let comparison = 0;
                if (valA > valB) {
                    comparison = 1;
                } else if (valA < valB) {
                    comparison = -1;
                }
                
                // Handle secondary sort for track number if primary is not track
                if (comparison === 0 && songSortState.column !== 'track') {
                    const trackA = parseFloat(a.track) || 0;
                    const trackB = parseFloat(b.track) || 0;
                    if (trackA > trackB) comparison = 1;
                    else if (trackA < trackB) comparison = -1;
                }

                return songSortState.direction === 'DESC' ? (comparison * -1) : comparison;
            });
        }
        updateSongSortHeadersUI();
        displaySongs(songsToDisplay || [], context);
    }

    // --- Player Helper Functions ---
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // --- Player Functions ---
    function playSong(song) {
        if (!currentConfig.serverUrl || !currentConfig.username) {
            alert('Server configuration (URL and Username) is missing. Please configure and connect.');
            if (serverConfigDetails) serverConfigDetails.open = true;
            return;
        }
        if (!currentConfig.password) {
            alert('Password is required to play songs. Please enter your password in the Server Configuration and click Connect & Sync.');
            if (serverConfigDetails) serverConfigDetails.open = true;
            if (passwordInput) passwordInput.focus();
            return;
        }

        if (!song || !song.id) {
            console.error('Cannot play song: Invalid song object provided.', song);
            return;
        }
        console.log('Playing song:', song);

        // Update current playlist index
        currentPlaylist.currentIndex = currentPlaylist.songs.findIndex(s => s.id === song.id);
        audioPlayer.dataset.playingSongId = String(song.id); // Store playing song ID on player, ensure string

        // Highlight the currently playing song in the list
        if (songsListUI) {
            const previouslyPlaying = songsListUI.querySelector('tr.song-playing');
            if (previouslyPlaying) {
                previouslyPlaying.classList.remove('song-playing');
            }
            const currentSongRow = songsListUI.querySelector(`tr[data-song-id="${String(song.id)}"]`);
            if (currentSongRow) {
                currentSongRow.classList.add('song-playing');
            } else {
                console.warn('Could not find song row to highlight in playSong:', song.id);
            }
        }

        // Construct stream URL
        const streamUrl = buildApiUrl(currentConfig.serverUrl, `stream.view?id=${song.id}`);
        console.log('Attempting to play stream URL:', streamUrl); // Log the generated URL
        audioPlayer.src = streamUrl;
        
        audioPlayer.load(); // Important to load new source
        audioPlayer.play().then(() => {
            playPauseButton.textContent = '⏸'; // Pause symbol
            console.log(`Started playing: ${song.title}`);
        }).catch(error => {
            console.error('Error playing song:', error);
            playPauseButton.textContent = '▶'; // Play symbol if error
            updateConnectionStatus(`Error playing ${song.title}: ${error.message}`, true);
        });

        // Update track info
        currentSongTitleUI.textContent = song.title || 'Unknown Title';
        currentSongArtistUI.textContent = song.artist || 'Unknown Artist';
        currentSongAlbumUI.textContent = song.album || 'Unknown Album';

        // Update Album Art
        if (song.coverArt) {
            const albumArtUrl = buildApiUrl(currentConfig.serverUrl, `getCoverArt.view?id=${song.coverArt}&size=200`); // Request a reasonable size
            albumArtUI.src = albumArtUrl;
            albumArtUI.alt = song.album || 'Album Art';
        } else {
            albumArtUI.src = '#'; // Clear album art if not available
            albumArtUI.alt = 'No Album Art';
        }
    }

    function playNextSong() {
        if (!currentPlaylist.songs || currentPlaylist.songs.length === 0) {
            console.log('No songs in current playlist to play next.');
            return;
        }
        let nextIndex = currentPlaylist.currentIndex + 1;
        if (nextIndex >= currentPlaylist.songs.length) {
            nextIndex = 0; // Loop to the beginning
        }
        if (currentPlaylist.songs[nextIndex]) {
            playSong(currentPlaylist.songs[nextIndex]);
        } else {
            console.error('Could not find next song at index:', nextIndex);
        }
    }

    function playPreviousSong() {
        if (!currentPlaylist.songs || currentPlaylist.songs.length === 0) {
            console.log('No songs in current playlist to play previous.');
            return;
        }
        let prevIndex = currentPlaylist.currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = currentPlaylist.songs.length - 1; // Loop to the end
        }
        if (currentPlaylist.songs[prevIndex]) {
            playSong(currentPlaylist.songs[prevIndex]);
        } else {
            console.error('Could not find previous song at index:', prevIndex);
        }
    }

    function togglePlayPause() {
        if (audioPlayer.paused || audioPlayer.ended) {
            if (!audioPlayer.src || audioPlayer.src === window.location.href) { // Check if src is not set or is base URL
                console.log('No song loaded to play.');
                // Optionally, play the first song in the current list or do nothing
                return;
            }
            audioPlayer.play().catch(error => console.error('Error trying to play audio:', error));
        } else {
            audioPlayer.pause();
        }
    }

    // --- Helper Functions (existing) ---
    function showLoading(message = 'Loading...') {
        document.getElementById('loading-message').textContent = message;
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    function updateConnectionStatus(message, isError = false) {
        connectionStatus.textContent = `Status: ${message}`;
        connectionStatus.style.color = isError ? 'red' : 'green';
    }

    function buildApiUrl(baseUrl, endpoint, params = {}) {
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = new URL(`${cleanBaseUrl}/rest/${endpoint}`);
        url.searchParams.append('u', currentConfig.username);
        url.searchParams.append('p', currentConfig.password);
        url.searchParams.append('v', API_VERSION);
        url.searchParams.append('c', CLIENT_NAME);
        url.searchParams.append('f', RESPONSE_FORMAT);

        for (const key in params) {
            url.searchParams.append(key, params[key]);
        }
        return url.toString();
    }

    async function makeApiRequest(endpoint, params = {}, loadingMessage = 'Fetching data...') {
        if (!currentConfig.serverUrl || !currentConfig.username || !currentConfig.password) {
            updateConnectionStatus('API request failed: Missing server URL, username, or password.', true);
            throw new Error('Missing server configuration for API request');
        }
    
        const apiUrl = buildApiUrl(currentConfig.serverUrl, endpoint, params);
        showLoading(loadingMessage);
    
        let response; // Declare response outside try to inspect in case of non-network error
        try {
            response = await fetch(apiUrl); // Perform the fetch
    
            if (!response.ok) {
                // Handle HTTP errors (like 401, 404, 500, etc.)
                const errorText = await response.text(); // Try to get more details
                console.error(`HTTP error ${response.status} for ${endpoint}:`, errorText);
                throw new Error(`HTTP error! status: ${response.status} for ${endpoint}. Server said: ${errorText.substring(0, 100)}`);
            }
    
            const data = await response.json(); // Parse JSON
    
            // Check Subsonic API specific status
            if (data['subsonic-response'] && data['subsonic-response'].status === 'ok') {
                return data['subsonic-response']; // Successful API call
            } else {
                // Subsonic API returned status 'failed' or other non-'ok' status
                const subsonicError = data['subsonic-response']?.error;
                const errorMessage = subsonicError?.message || `API Error for ${endpoint} (Subsonic status: ${data['subsonic-response']?.status})`;
                console.error('Subsonic API error:', subsonicError || data['subsonic-response']);
                throw new Error(errorMessage);
            }
    
        } catch (error) { // Catches network errors from fetch, JSON parsing errors, and explicitly thrown errors
            console.error(`Error during makeApiRequest for ${endpoint}:`, error);
            // Ensure status is updated even if the error was thrown before our specific status updates
            updateConnectionStatus(`Request failed: ${error.message}`, true);
            throw error; // Re-throw to be handled by the caller, ensuring it propagates
        }
        // Note: hideLoading() is intentionally NOT called here.
        // It's the responsibility of the higher-level function that initiated the sequence of API calls
        // (e.g., fetchInitialLibraryData, pingServer) to manage the overall loading state.
    }

    // --- Navidrome API Interaction (existing) ---
    async function pingServer() {
        if (!currentConfig.serverUrl || !currentConfig.username || !currentConfig.password) {
            updateConnectionStatus('Missing server URL, username, or password.', true);
            return false;
        }
        showLoading('Pinging server...');
        try {
            // const data = await makeApiRequest('ping.view', {}, 'Pinging server...'); // data not used from ping
            await makeApiRequest('ping.view', {}, 'Pinging server...');
            updateConnectionStatus('Connected successfully!');
            // console.log('Ping successful:', data); // data not used from ping
            serverConfigDetails.open = false; 
            saveConfig(); 
            return true;
        } catch (error) {
            return false;
        } finally {
            hideLoading(); 
        }
    }

    async function fetchInitialLibraryData() {
        showLoading('Fetching library metadata...');
        try {
            console.log('Fetching Genres...');
            const genresResponse = await makeApiRequest('getGenres.view', {}, 'Fetching genres...');
            let fetchedGenres = [];
            if (genresResponse.genres && genresResponse.genres.genre) {
                if (Array.isArray(genresResponse.genres.genre)) {
                    fetchedGenres = genresResponse.genres.genre;
                } else {
                    fetchedGenres = [genresResponse.genres.genre]; 
                }
            }
            libraryData.genres = fetchedGenres;
            console.log('Genres fetched:', libraryData.genres.length);

            console.log('Fetching Artists...');
            const artistsResponse = await makeApiRequest('getArtists.view', {}, 'Fetching artists...');
            libraryData.artists = (artistsResponse.artists?.index || []).flatMap(idx => idx.artist || []);
            console.log('Artists fetched:', libraryData.artists.length);

            console.log('Fetching All Albums (paginated)...');
            libraryData.albums = [];
            let albumOffset = 0;
            const albumBatchSize = 500; // Fetch 500 albums per request
            let moreAlbums = true;
            while (moreAlbums) {
                showLoading(`Fetching albums... (batch starting at ${albumOffset})`);
                const albumsResponse = await makeApiRequest('getAlbumList2.view', { 
                    type: 'alphabeticalByName', 
                    size: albumBatchSize, 
                    offset: albumOffset 
                }, `Fetching albums (offset ${albumOffset})...`);
                
                const fetchedBatch = albumsResponse.albumList2?.album || [];
                if (fetchedBatch.length > 0) {
                    libraryData.albums = libraryData.albums.concat(fetchedBatch);
                    console.log(`Fetched ${fetchedBatch.length} albums (offset ${albumOffset}). Total albums so far: ${libraryData.albums.length}`);
                    albumOffset += albumBatchSize;
                } else {
                    moreAlbums = false;
                    console.log('No more albums found. Finished fetching albums.');
                }
                // Safety break for very large libraries or unexpected API behavior, though ideally server handles empty list correctly
                if (albumOffset > 20000 && fetchedBatch.length === 0) { // Arbitrary limit, e.g. ~40 requests
                    console.warn('Exiting album fetch loop due to large offset and no new albums. Check server or increase limit if needed.');
                    moreAlbums = false;
                }
            }
            console.log('Total albums fetched after pagination:', libraryData.albums.length);

            console.log('Fetching All Songs (paginated)...');
            libraryData.songs = [];
            let songOffset = 0;
            const songBatchSize = 500; // Fetch 500 songs per request
            let moreSongs = true;
            while (moreSongs) {
                showLoading(`Fetching songs... (batch starting at ${songOffset})`);
                const songsResponse = await makeApiRequest('search3.view', { 
                    query: '', 
                    songCount: songBatchSize, 
                    artistCount: 0, 
                    albumCount: 0,
                    songOffset: songOffset 
                }, `Fetching songs (offset ${songOffset})...`);
                
                let fetchedBatch = [];
                if (songsResponse && songsResponse.searchResult3 && songsResponse.searchResult3.song) {
                    if (Array.isArray(songsResponse.searchResult3.song)) {
                        fetchedBatch = songsResponse.searchResult3.song;
                    } else {
                        fetchedBatch = [songsResponse.searchResult3.song]; 
                    }
                }

                if (fetchedBatch.length > 0) {
                    libraryData.songs = libraryData.songs.concat(fetchedBatch);
                    console.log(`Fetched ${fetchedBatch.length} songs (offset ${songOffset}). Total songs so far: ${libraryData.songs.length}`);
                    songOffset += songBatchSize;
                } else {
                    moreSongs = false;
                    console.log('No more songs found. Finished fetching songs.');
                }
                 // Safety break for very large libraries
                if (songOffset > 50000 && fetchedBatch.length === 0) { // Arbitrary limit, e.g. ~100 requests
                    console.warn('Exiting song fetch loop due to large offset and no new songs. Check server or increase limit if needed.');
                    moreSongs = false;
                }
            }
            console.log(`Total songs fetched after pagination: ${libraryData.songs.length} songs. Is Array: ${Array.isArray(libraryData.songs)}`);
            
            updateConnectionStatus('Library metadata fetched! Caching...');
            await cacheLibraryData(); 

        } catch (error) {
            console.error('Failed to fetch initial library data:', error);
            updateConnectionStatus(`Error fetching library: ${error.message}`, true);
            hideLoading(); // Ensure loading is hidden on fetch error that prevents caching
        } 
        // hideLoading() is called by cacheLibraryData if successful, or above if fetch itself fails.
    }


    // --- Configuration Management (existing) ---
    function saveConfig() {
        localStorage.setItem('navidromeUrl', currentConfig.serverUrl);
        localStorage.setItem('navidromeUsername', currentConfig.username);
        console.log('Configuration saved (URL and Username).');
    }

    function loadConfig() {
        const storedUrl = localStorage.getItem('navidromeUrl');
        const storedUsername = localStorage.getItem('navidromeUsername');

        if (storedUrl) {
            navidromeUrlInput.value = storedUrl;
            currentConfig.serverUrl = storedUrl;
        }
        if (storedUsername) {
            usernameInput.value = storedUsername;
            currentConfig.username = storedUsername;
        }

        if (storedUrl && storedUsername) {
            updateConnectionStatus('Configuration loaded. Enter password and connect to sync.');
        } else {
            updateConnectionStatus('Ready to configure server.');
        }
    }

    // --- Event Listeners (existing) ---
    connectButton.addEventListener('click', async () => {
        currentConfig.serverUrl = navidromeUrlInput.value.trim();
        currentConfig.username = usernameInput.value.trim();
        currentConfig.password = passwordInput.value; 

        if (!currentConfig.serverUrl.startsWith('http://') && !currentConfig.serverUrl.startsWith('https://')) {
            alert('Please enter a valid URL starting with http:// or https://');
            return;
        }

        try {
            // Ensure DB is initialized before proceeding
            const database = await initDB();
            if (!database) {
                updateConnectionStatus("Failed to initialize local database. Cannot proceed.", true);
                return;
            }
            db = database; // Ensure the global db variable is set from this path too

            const connected = await pingServer();
            if (connected) {
                await fetchInitialLibraryData();
            }
        } catch (error) {
            console.error("Error during connection or initial data fetch:", error);
            updateConnectionStatus(`Connection error: ${error.message}`, true);
            // hideLoading() might be needed here if error occurs before pingServer or fetchInitialLibraryData manages it
        }
    });

    // --- Initialization ---
    async function initializeApp() {
        loadConfig(); 
        if (!navidromeUrlInput.value && '192.168.1.157:4533') {
            let providedUrl = '192.168.1.157:4533';
            if (!providedUrl.startsWith('http://') && !providedUrl.startsWith('https://')) {
                providedUrl = 'http://' + providedUrl;
            }
            navidromeUrlInput.value = providedUrl;
        }
        try {
            db = await initDB(); 
            await populateGenresUI();
            await populateArtistsUI(currentSelections.genre);
            await populateAlbumsUI(currentSelections.genre, currentSelections.artist);
            await populateSongsUI(currentSelections.genre, currentSelections.artist, currentSelections.album); 
        } catch (error) {
            console.error("Failed to initialize database:", error);
            updateConnectionStatus("Error: Could not initialize local database.", true);
        }

        // Player event listeners
        playPauseButton.addEventListener('click', togglePlayPause);
        audioPlayer.addEventListener('play', () => {
            playPauseButton.textContent = '⏸'; // Pause symbol
        });
        audioPlayer.addEventListener('pause', () => {
            playPauseButton.textContent = '▶'; // Play symbol
        });
        audioPlayer.addEventListener('ended', () => {
            playPauseButton.textContent = '▶'; // Play symbol
            console.log('Song ended. Playing next...');
            playNextSong(); // Auto-play next song
        });
        audioPlayer.addEventListener('loadedmetadata', () => {
            if (audioPlayer.duration && isFinite(audioPlayer.duration)) {
                totalDurationUI.textContent = formatTime(audioPlayer.duration);
                progressBar.max = audioPlayer.duration;
            } else {
                totalDurationUI.textContent = '--:--'; 
                progressBar.max = 0;
            }
        });
        audioPlayer.addEventListener('timeupdate', () => {
            if (audioPlayer.duration && isFinite(audioPlayer.duration)) {
                currentTimeUI.textContent = formatTime(audioPlayer.currentTime);
                progressBar.value = audioPlayer.currentTime;
            } else {
                currentTimeUI.textContent = '--:--';
                progressBar.value = 0;
            }
        });

        progressBar.addEventListener('input', () => {
            if (audioPlayer.duration && isFinite(audioPlayer.duration)) {
                audioPlayer.currentTime = progressBar.value;
            }
        });

        if (volumeSlider) {
            audioPlayer.volume = 0.75; 
            volumeSlider.value = audioPlayer.volume;
            volumeSlider.addEventListener('input', () => {
                audioPlayer.volume = volumeSlider.value;
            });
        } else {
            console.warn('Volume slider element not found.');
        }

        if (nextTrackButton) {
            nextTrackButton.addEventListener('click', playNextSong);
        } else {
            console.warn('Next track button not found.');
        }
        if (prevTrackButton) {
            prevTrackButton.addEventListener('click', playPreviousSong);
        } else {
            console.warn('Previous track button not found.');
        }

        // Search input listeners - Initialized ONCE here
        if (genreSearchInput) {
            if (!genreSearchInput.dataset.listenerAttached) {
                genreSearchInput.addEventListener('input', () => {
                    applyGenreSearchAndDisplay();
                    if (clearGenreSearchBtn) clearGenreSearchBtn.style.display = genreSearchInput.value ? 'inline' : 'none';
                });
                genreSearchInput.dataset.listenerAttached = 'true';
            }
            if (clearGenreSearchBtn) {
                clearGenreSearchBtn.addEventListener('click', () => {
                    genreSearchInput.value = '';
                    genreSearchInput.dispatchEvent(new Event('input'));
                    genreSearchInput.focus();
                });
            }
        } else {
            console.warn('Genre search input not found in initializeApp.');
        }

        if (artistSearchInput) {
            if (!artistSearchInput.dataset.listenerAttached) {
                artistSearchInput.addEventListener('input', () => {
                    applyArtistSearchAndDisplay(currentSelections.genre);
                    if (clearArtistSearchBtn) clearArtistSearchBtn.style.display = artistSearchInput.value ? 'inline' : 'none';
                });
                artistSearchInput.dataset.listenerAttached = 'true';
            }
            if (clearArtistSearchBtn) {
                clearArtistSearchBtn.addEventListener('click', () => {
                    artistSearchInput.value = '';
                    artistSearchInput.dispatchEvent(new Event('input'));
                    artistSearchInput.focus();
                });
            }
        } else {
            console.warn('Artist search input not found in initializeApp.');
        }

        if (albumSearchInput) {
            if (!albumSearchInput.dataset.listenerAttached) {
                albumSearchInput.addEventListener('input', () => {
                    applyAlbumSearchAndDisplay({ genre: currentSelections.genre, artist: currentSelections.artist });
                    if (clearAlbumSearchBtn) clearAlbumSearchBtn.style.display = albumSearchInput.value ? 'inline' : 'none';
                });
                albumSearchInput.dataset.listenerAttached = 'true';
            }
            if (clearAlbumSearchBtn) {
                clearAlbumSearchBtn.addEventListener('click', () => {
                    albumSearchInput.value = '';
                    albumSearchInput.dispatchEvent(new Event('input'));
                    albumSearchInput.focus();
                });
            }
        } else {
            console.warn('Album search input not found in initializeApp.');
        }

        if (songSearchInput) {
            if (!songSearchInput.dataset.listenerAttached) { 
                songSearchInput.addEventListener('input', () => {
                    populateSongsUI(currentSelections.genre, currentSelections.artist, currentSelections.album);
                    if (clearSongFilterBtn) clearSongFilterBtn.style.display = songSearchInput.value ? 'inline' : 'none';
                });
                songSearchInput.dataset.listenerAttached = 'true';
            }
            if (clearSongFilterBtn) {
                clearSongFilterBtn.addEventListener('click', () => {
                    songSearchInput.value = '';
                    songSearchInput.dispatchEvent(new Event('input'));
                    songSearchInput.focus();
                });
            }
        } else { 
            console.warn('Song search input (song-filter-input) not found in initializeApp.');
        }

        // Song table header sort listeners
        const songTableHeaders = document.querySelectorAll('#songs-table thead th');
        songTableHeaders.forEach(th => {
            const sortKey = th.dataset.sortKey;
            if (sortKey) {
                th.style.cursor = 'pointer'; // Make it obvious they are clickable
                th.addEventListener('click', () => {
                    if (songSortState.column === sortKey) {
                        songSortState.direction = songSortState.direction === 'ASC' ? 'DESC' : 'ASC';
                    } else {
                        songSortState.column = sortKey;
                        songSortState.direction = 'ASC';
                    }
                    // Re-apply search and sort, then display
                    applySongSearchAndDisplay({ 
                        genreName: currentSelections.genre, 
                        artistId: currentSelections.artist, 
                        albumId: currentSelections.album 
                    }); 
                });
            }
        });
    }

    function updateSongSortHeadersUI() {
        const songTableHeaders = document.querySelectorAll('#songs-table thead th');
        songTableHeaders.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sortKey === songSortState.column) {
                th.classList.add(songSortState.direction === 'ASC' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    initializeApp();

    // TODO: UI population for artists, albums, songs, player logic etc.
}); 