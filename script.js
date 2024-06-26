document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('search-form').addEventListener('submit', async function (event) {
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
            const postcodesCsv = await fetch('vic_postcodes.csv').then(response => response.text());
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
            if (facebookFormat) {
                facebookText.value += `${boldText(new Date(date).toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'long' }))}\n\n`;
            } else {
                const dateHeader = document.createElement('h2');
                dateHeader.textContent = new Date(date).toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'long' });
                gigList.appendChild(dateHeader);
            }

            gigs.forEach(gig => {
                if (facebookFormat) {
                    facebookText.value += `${boldText(gig.name)}\n${gig.venue.name}\n${gig.venue.address}\n${gig.start_time ? new Date(gig.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}\n\n`;
                } else {
                    const gigDiv = document.createElement('div');
                    gigDiv.className = 'gig';

                    const name = elements.includes('name') ? `<div class="gig-name">${gig.name}</div>` : '';
                    const venueName = elements.includes('venue') ? `<div class="gig-venue"><a href="${gig.venue.location_url}">${gig.venue.name}</a></div>` : '';
                    const address = elements.includes('address') ? `<div class="gig-address">${gig.venue.address}</div>` : '';
                    const time = gig.start_time && elements.includes('time') ? `<div class="gig-time">${new Date(gig.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>` : '';

                    gigDiv.innerHTML = `${name}${venueName}${address}${time}`;
                    gigList.appendChild(gigDiv);
                }
            });

            if (facebookFormat) {
                facebookText.value += `\n`;
            }
        }

        if (facebookFormat) {
            document.getElementById('facebook-container').style.display = 'block';
        } else {
            document.getElementById('facebook-container').style.display = 'none';
        }
    }

    function boldText(text) {
        const boldMap = {
            'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟',
            'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫',
            'Y': '𝗬', 'Z': '𝗭', 'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
            'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '
