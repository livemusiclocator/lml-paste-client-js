document.addEventListener('DOMContentLoaded', function () {
console.log('DOM fully loaded and parsed'); // Debugging statement
const searchButton = document.getElementById('search-form');
const toggleFBTextButton = document.getElementById('toggle-fb-text');
const floatingContainer = document.getElementById('floating-container');
const filtersContainer = document.getElementById('filters-container');
const resultsContainer = document.getElementById('results-container');
const closeButton = document.getElementById('close-float');

    document.getElementById('toggle-fb-text').addEventListener('click', () => {
        console.log('Floating button clicked'); // Debugging statement
        const button = document.getElementById('toggle-fb-text');
        const container = document.getElementById('floating-container');

        console.log('Button before hide:', button); // Debugging statement
        console.log('Container before show:', container); // Debugging statement

        button.style.display = 'none';
        container.style.display = 'block';

        console.log('Button after hide:', button); // Debugging statement
        console.log('Container after show:', container); // Debugging statement
    });

    document.getElementById('copy-text').addEventListener('click', function () {
        const textArea = document.getElementById('facebook-text');
        textArea.select();
        document.execCommand('copy');
    });
    

    document.getElementById('close-float').addEventListener('click', () => {

        // Existing debugging statement
        console.log('Close button clicked'); 

        const button = document.getElementById('toggle-fb-text');
        const container = document.getElementById('floating-container');

        console.log('Container before hide:', container); // Debugging statement
        console.log('Button before show:', button); // Debugging statement

        container.style.display = 'none';
        button.style.display = 'block';

        console.log('Container after hide:', container); // Debugging statement
        console.log('Button after show:', button); // Debugging statement
    });

    document.getElementById('search-form').addEventListener('submit', async function (event) {
        event.preventDefault();
        console.log('submit pressed'); // Debugging statement
        toggleFBTextButton.style.display = 'block';
        resultsContainer.style.display = 'flex';
        filtersContainer.style.display = 'flex';

        const dateFrom = document.getElementById('date_from').value;
        const dateTo = document.getElementById('date_to').value;
        const elements = Array.from(document.querySelectorAll('input[name="elements"]:checked')).map(el => el.value);

        const url = `https://api.lml.live/gigs/query?location=melbourne&date_from=${dateFrom}&date_to=${dateTo}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const gigs = await response.json();
            console.log('API Response:', gigs);

            // Get postcodes, venues, and genres present in the results
            const postcodes = {};
            const venues = new Set();
            const genres = new Set();
            gigs.forEach(gig => {
                const venue = gig.venue || {};
                const venueAddress = venue.address || '';
                const venuePostcode = venue.postcode || venueAddress.split(' ').pop();
                if (!isNaN(venuePostcode)) {
                    postcodes[venuePostcode] = 'Unknown Suburb'; // default value until we get the actual suburb name
                }
                venues.add(venue.name || 'Unknown Venue');
                if (gig.genre_tags) {
                    gig.genre_tags.forEach(genre => genres.add(genre));
                }
            });

            // Load suburb names from local file
            const postcodesCsv = await fetch('vic_postcodes.csv').then(response => response.text());
            const lines = postcodesCsv.split('\n');
            lines.forEach(line => {
                const [postcode, suburb] = line.split(',');
                if (postcodes[postcode]) {
                    postcodes[postcode] = suburb;
                }
            });

            // Update the filter dropdown
            const filterLocation = document.getElementById('filter-location');
            filterLocation.innerHTML = '<option value="All">All Locations</option>';
            Object.keys(postcodes).forEach(postcode => {
                filterLocation.innerHTML += `<option value="${postcode}">${postcode} - ${postcodes[postcode]}</option>`;
            });
            venues.forEach(venue => {
                filterLocation.innerHTML += `<option value="${venue}">${venue}</option>`;
            });

            const filterGenre = document.getElementById('filter-genre');
            filterGenre.innerHTML = '<option value="All">All Genres</option>';
            genres.forEach(genre => {
                filterGenre.innerHTML += `<option value="${genre}">${genre}</option>`;
            });

            // Display the filters container and results container
            document.getElementById('filters-container').style.display = 'flex';
            document.getElementById('results-container').style.display = 'flex';
            document.getElementById('facebook-container').style.display = 'flex';
            // Comment out or remove this line if not needed
            // document.getElementById('date-range').innerText = `Gigs for ${dateFrom} to ${dateTo}`;

            // Display gigs
            displayGigs(gigs, elements);
        } catch (error) {
            console.error('Failed to load gigs:', error);
            alert('Failed to load gigs. Please try again later.');
        }
    });

    window.filterGigs = function () {
        const filterLocationValue = document.getElementById('filter-location').value;
        const filterGenreValue = document.getElementById('filter-genre').value;
        const gigs = document.querySelectorAll('.gig');

        gigs.forEach(gig => {
            const locationMatch = filterLocationValue === 'All' || gig.dataset.location.includes(filterLocationValue);
            const genreMatch = filterGenreValue === 'All' || gig.dataset.genres.includes(filterGenreValue);

            if (locationMatch && genreMatch) {
                gig.style.display = 'block';
            } else {
                gig.style.display = 'none';
            }
        });

        updateVisibleDates();
        formatForFacebook();
    };

    function displayGigs(gigs, elements) {
        const gigList = document.getElementById('gig-list');
        const facebookText = document.getElementById('facebook-text');
        gigList.innerHTML = '';
        facebookText.value = '';

        const groupedGigs = gigs.reduce((acc, gig) => {
            const date = gig.date;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(gig);
            return acc;
        }, {});

        for (const [date, gigs] of Object.entries(groupedGigs)) {
            const dateHeader = document.createElement('h2');
            dateHeader.className = 'date-header';
            dateHeader.dataset.date = date;
            dateHeader.textContent = new Date(date).toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'long' });
            gigList.appendChild(dateHeader);

            gigs.forEach(gig => {
                const gigDiv = document.createElement('div');
                gigDiv.className = 'gig';
                gigDiv.dataset.date = date;
                gigDiv.dataset.location = `${gig.venue.name} (${gig.venue.postcode})`;
                gigDiv.dataset.genres = gig.genre_tags.join(',');

                const name = elements.includes('name') ? `<div class="gig-name">${gig.name}</div>` : '';
                const venueName = elements.includes('venue') ? `<div class="gig-venue"><a href="${gig.venue.location_url}">${gig.venue.name}</a></div>` : '';
                const address = elements.includes('address') ? `<div class="gig-address">${gig.venue.address}</div>` : '';
                const time = gig.start_time && elements.includes('time') ? `<div class="gig-time">${gig.start_time}</div>` : '';

                gigDiv.innerHTML = `${name}${venueName}${address}${time}`;
                gigList.appendChild(gigDiv);
            });
        }

        updateVisibleDates();
        formatForFacebook();
    }

    function updateVisibleDates() {
        const gigList = document.getElementById('gig-list');
        const dateHeaders = gigList.querySelectorAll('.date-header');

        dateHeaders.forEach(header => {
            let nextElement = header.nextElementSibling;
            let hasVisibleGig = false;

            while (nextElement && nextElement.classList.contains('gig')) {
                if (nextElement.style.display !== 'none') {
                    hasVisibleGig = true;
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }

            header.style.display = hasVisibleGig ? 'block' : 'none';
        });
    }

    function formatForFacebook() {
        const gigs = document.querySelectorAll('.gig');
        const facebookText = document.getElementById('facebook-text');
        facebookText.value = '';

        let currentHeader = '';
        gigs.forEach(gig => {
            if (gig.style.display !== 'none') {
                const dateHeader = gig.previousElementSibling;
                if (dateHeader && dateHeader.classList.contains('date-header')) {
                    currentHeader = dateHeader.textContent;
                    facebookText.value += `\n${currentHeader}\n`;
                }
                facebookText.value += `${gig.querySelector('.gig-name').textContent} at ${gig.querySelector('.gig-venue a').textContent}\n`;
            }
        });
    }
});
