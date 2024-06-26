document.getElementById('search-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const dateFrom = document.getElementById('date_from').value;
    const dateTo = document.getElementById('date_to').value;
    const facebookFormat = document.getElementById('facebook_format').checked;
    const timezone = document.getElementById('timezone').value;
    const elements = Array.from(document.querySelectorAll('input[name="elements"]:checked')).map(el => el.value);

    const url = `https://api.lml.live/gigs/query?location=melbourne&date_from=${dateFrom}&date_to=${dateTo}`;

    try {
        const response = await fetch(url);
        const gigs = await response.json();

        // Get postcodes and venues present in the results
        const postcodes = {};
        const venues = new Set();
        gigs.forEach(gig => {
            const venue = gig.venue || {};
            const venueAddress = venue.address || '';
            const venuePostcode = venueAddress.split(' ').pop();
            if (!isNaN(venuePostcode)) {
                postcodes[venuePostcode] = 'Unknown Suburb'; // default value until we get the actual suburb name
            }
            venues.add(venue.name || 'Unknown Venue');
        });

        // Load suburb names from local file
        const postcodesCsv = await fetch('public/vic_postcodes.csv').then(response => response.text());
        const lines = postcodesCsv.split('\n');
        lines.forEach(line => {
            const [postcode, suburb] = line.split(',');
            if (postcodes[postcode]) {
                postcodes[postcode] = suburb;
            }
        });

        // Update the filter dropdown
        const filter = document.getElementById('filter');
        filter.innerHTML = '<option value="All">All</option>';
        Object.keys(postcodes).forEach(postcode => {
            filter.innerHTML += `<option value="${postcode}">${postcode} - ${postcodes[postcode]}</option>`;
        });
        venues.forEach(venue => {
            filter.innerHTML += `<option value="${venue}">${venue}</option>`;
        });

        // Display the results container
        document.getElementById('results-container').style.display = 'block';
        document.getElementById('date-range').innerText = `Gigs for ${dateFrom} to ${dateTo}`;

        // Display gigs
        displayGigs(gigs, elements, facebookFormat, timezone);
    } catch (error) {
        console.error('Failed to load gigs:', error);
    }
});

function displayGigs(gigs, elements, facebookFormat, timezone) {
    const gigList = document.getElementById('gig-list');
    gigList.innerHTML = '';

    const groupedGigs = gigs.reduce((acc, gig) => {
        const date = gig.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(gig);
        return acc;
    }, {});

    for (const [date, gigs] of Object.entries(groupedGigs)) {
        if (facebookFormat) {
            gigList.innerHTML += `<b>${new Date(date).toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'long' })}</b><br><br>`;
        } else {
            const dateHeader = document.createElement('h2');
            dateHeader.textContent = new Date(date).toLocaleDateString('en-AU', {
                weekday: 'long',
                day: '2-digit',
                month: 'long'
            });
            gigList.appendChild(dateHeader);
        }

        gigs.forEach(gig => {
            if (facebookFormat) {
                gigList.innerHTML += `<b>${gig.name}</b><br>${gig.venue.name}<br>${gig.venue.address}<br>${gig.start_time ? new Date(gig.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}<br><br>`;
            } else {
                const gigDiv = document.createElement('div');
                gigDiv.className = 'gig';

                const name = elements.includes('name') ? `<div class="gig-name">${gig.name}</div>` : '';
                const venueName = elements.includes('venue') ? `<div class="gig-venue"><a href="${gig.venue.location_url}">${gig.venue.name}</a></div>` : '';
                const address = elements.includes('address') ? `<div class="gig-address">${gig.venue.address}</div>` : '';
                const time = gig.start_time && elements.includes('time') ? `<div class="gig-time">${new Date(gig.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>` : '';
                const description = elements.includes('description') ? `<div class="gig-description">${gig.description}</div>` : '';

                gigDiv.innerHTML = `${name}${venueName}${address}${time}${description}`;
                gigList.appendChild(gigDiv);
            }
        });

        if (facebookFormat) {
            gigList.innerHTML += `<br><br>`;
        }
    }
}

function filterGigs() {
    const filterValue = document.getElementById('filter').value;
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('filter_value', filterValue);
    window.location.search = urlParams.toString();
}
