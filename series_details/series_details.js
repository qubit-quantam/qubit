// Global variables for IMDb ID and embed URLs
let imdbId;
let embedSources = [];

// Helper: get URL parameter by name
function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Helper: switch the embed source by updating the iframe's src
function switchEmbed(embedUrl) {
  console.log("Switching embed to:", embedUrl);
  const iframe = document.getElementById('seriesIframe');
  iframe.src = embedUrl;
}

document.addEventListener("DOMContentLoaded", function() {
  // Get series ID and API key(s)
  const seriesId = getParameterByName('id'); // This is the TMDB ID
  const apiKey = '7b4b8af2d885777c1c603011ee871be6';
  const tmdbDetailsUrl = `https://api.themoviedb.org/3/tv/${seriesId}?api_key=${apiKey}`;
  const castUrl = `https://api.themoviedb.org/3/tv/${seriesId}/credits?api_key=${apiKey}`;

  // Elements for season and episode selection
  const seasonSelect = document.getElementById('Sno');
  const episodeSelect = document.getElementById('epNo');

  // Fetch series details and populate details/cast/seasons
  fetch(tmdbDetailsUrl)
    .then(response => response.json())
    .then(data => {
      // Populate series details (poster, title, description)
      const poster = document.getElementById('poster');
      const title = document.getElementById('title');
      const description = document.getElementById('description');
      poster.src = `https://image.tmdb.org/t/p/w780${data.backdrop_path}`;
      title.textContent = data.name;
      description.textContent = data.overview;
      
      // Populate cast details
      fetchCastDetails();
      
      // Populate season select (skip season 0 if present)
      data.seasons.filter(season => season.season_number !== 0).forEach(season => {
        const option = document.createElement('option');
        option.value = season.season_number;
        option.textContent = `Season ${season.season_number}`;
        seasonSelect.appendChild(option);
      });
      
      // Trigger change to load episodes for the first season
      seasonSelect.dispatchEvent(new Event('change'));
      
      // Fetch external IDs (for IMDb) for embed URL building
      getAndSetImdbId();
    })
    .catch(error => console.error('Error fetching series details:', error));
  
  // Fetch cast details
  function fetchCastDetails() {
    fetch(castUrl)
      .then(response => response.json())
      .then(data => {
        const castList = document.getElementById('castList');
        data.cast.slice(0, 5).forEach(actor => {
          const listItem = document.createElement('div');
          listItem.style.cssText = 'width: fit-content; display: flex; flex-direction: column; padding-right: 20px; font-family: Poppins; font-size: 1vw;';
          
          const actorName = document.createElement('span');
          const actorImage = document.createElement('img');
          actorName.textContent = actor.name;
          actorImage.src = `https://image.tmdb.org/t/p/w185${actor.profile_path}`;
          actorImage.alt = actor.name;
          actorImage.style.borderRadius = "1.2rem";
          
          listItem.appendChild(actorImage);
          listItem.appendChild(actorName);
          castList.appendChild(listItem);
        });
      })
      .catch(error => console.error('Error fetching cast details:', error));
  }
  
  // Fetch episodes for the selected season and populate the episode select dropdown
  seasonSelect.addEventListener('change', function() {
    const seasonNumber = this.value;
    // Clear episode dropdown
    episodeSelect.innerHTML = '';
    fetchEpisodesForSeason(seasonNumber);
  });
  
  function fetchEpisodesForSeason(seasonNumber) {
    const episodesUrl = `https://api.themoviedb.org/3/tv/${seriesId}/season/${seasonNumber}?api_key=${apiKey}`;
    fetch(episodesUrl)
      .then(response => response.json())
      .then(data => {
        data.episodes.forEach(episode => {
          const option = document.createElement('option');
          option.value = episode.episode_number;
          option.textContent = `Episode ${episode.episode_number}`;
          episodeSelect.appendChild(option);
        });
        // Once episodes are loaded, update the embed sources using current season and episode
        updateEmbedSources();
      })
      .catch(error => console.error('Error fetching episodes:', error));
  }
  
  // When the episode selection changes, update the embed URLs
  episodeSelect.addEventListener('change', function() {
    updateEmbedSources();
  });
  
  // Fetch external IDs for the series (to get IMDb ID) and update embed sources
  async function getAndSetImdbId() {
    const extIdsUrl = `https://api.themoviedb.org/3/tv/${seriesId}/external_ids?api_key=${apiKey}`;
    try {
      const response = await fetch(extIdsUrl);
      const data = await response.json();
      imdbId = data.imdb_id;
      console.log("Fetched IMDb ID:", imdbId);
      updateEmbedSources();
    } catch (error) {
      console.error("Error fetching external IDs:", error);
    }
  }
  
  // Build the embedSources array based on current IDs, season, and episode.
  // Server order (new order):
  // 1: Vidlink.pro (default)
  // 2: watch.streamflix.one
  // 3: embed.su
  // 4: 2embed.stream
  // 5: 2embed.cc
  // 6: Videasy
  // 7: Autoembed.cc
  // 8: MoviesAPI.club
  function updateEmbedSources() {
    // Ensure we have the required IDs (tmdb via seriesId always exists; imdbId is used by some providers)
    if (!seriesId || !imdbId) return;
    
    const seasonNumber = seasonSelect.value;
    const episodeNumber = episodeSelect.value;
    
    // Build URLs using the correct ID type:
    const server1Url = `https://vidlink.pro/tv/${seriesId}/${seasonNumber}/${episodeNumber}`;
    const server2Url = `https://watch.streamflix.one/tv/${seriesId}/watch?server=1${seasonNumber && episodeNumber ? `&season=${seasonNumber}&episode=${episodeNumber}` : ''}`;
    const server3Url = `https://embed.su/embed/tv/${seriesId}/${seasonNumber}/${episodeNumber}`;
    const server4Url = `https://www.2embed.stream/embed/tv/${imdbId}/${seasonNumber}/${episodeNumber}`;
    const server5Url = `https://www.2embed.cc/embedtv/${imdbId}&s=${seasonNumber}&e=${episodeNumber}`;
    const server6Url = `https://player.videasy.net/tv/${seriesId}/${seasonNumber}/${episodeNumber}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&color=8B5CF6`;
    const server7Url = `https://player.autoembed.cc/embed/tv/${seriesId}/${seasonNumber}/${episodeNumber}`;
    const server8Url = `https://moviesapi.club/tv/${seriesId}-${seasonNumber}-${episodeNumber}`;
    
    embedSources = [
      server1Url, // Vidlink.pro (default)
      server2Url, // watch.streamflix.one
      server3Url, // embed.su
      server4Url, // 2embed.stream
      server5Url, // 2embed.cc
      server6Url, // Videasy
      server7Url, // Autoembed.cc
      server8Url  // MoviesAPI.club
    ];
    
    console.log("Updated embed sources:", embedSources);
    
    // Immediately load the default embed (Vidlink.pro)
    switchEmbed(embedSources[0]);
  }
  
  // Server switcher buttons: these let users override the default if needed.
  const serverButtons = document.querySelectorAll('.server-btn');
  serverButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      if (embedSources.length > index) {
        switchEmbed(embedSources[index]);
      }
    });
  });
});

// Sidebar logic (unchanged)
let sidebar = document.querySelector(".sidebar");
let closeBtn = document.querySelector("#btn");
let searchBtn = document.querySelector(".bx-search");
closeBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  menuBtnChange();
});
searchBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  menuBtnChange();
});
function menuBtnChange() {
  if (sidebar.classList.contains("open")) {
    closeBtn.classList.replace("bx-menu", "bx-menu-alt-right");
  } else {
    closeBtn.classList.replace("bx-menu-alt-right", "bx-menu");
  }
}
function searchSeries() {
  const query = document.getElementById('searchInput').value;
  if (query.length < 3) {
    alert("Please enter at least 3 characters for search.");
    return;
  }
  window.location.href = `../results/results.html?query=${query}`;
}
