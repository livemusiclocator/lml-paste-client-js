document.getElementById('searchForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const date_from = document.getElementById('date_from').value;
    const date_to = document.getElementById('date_to').value;
    const style = document.getElementById('style').value;
    const timezone = document.getElementById('timezone').value;
    const elements = Array.from(document.querySelectorAll('input[name="elements"]:checked')).map(el => el.value);

    const url = `https://api.lml.live/gigs/query?location=melbourne&date_from=${date_from}&date_to=${date_to}`;
    const response = await fetch(url);
    const gigs = await response.json();

    const postcodes = await loadPostcodes();

    displayGigs(gigs, elements, style, postcodes);
    populateFilters(postcodes, gigs);
});

async function loadPostcodes() {
    const response = await fetch('https://raw.githubusercontent.com/Elkfox/Australian-Postcode-Data/master/au_postcodes.csv');
    const data = await response.text();
    const lines = data.split('\n');
    const postcodes = {};

    for (let i = 1; i < lines.length; i++) {
        const [postcode, suburb, state, ,] = lines[i].split(',');
        if (state === 'VIC') {
            postcodes[postcode] = suburb;
        }
    }

    return postcodes;
}

function displayGigs(gigs, elements, style, postcodes) {
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
        gigList.innerHTML += `<h2>${new Date(date).toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'long' })}</h2>`;
        for (const gig of gigs) {
            const time = gig.start_time && elements.includes('time') ? new Date(gig.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const address = gig.venue.address;
            const postcode = address.split(' ').pop();
            const suburb = postcodes[postcode] ? `${postcode} - ${postcodes[postcode]}` : 'Unknown Suburb';
            gigList.innerHTML += `
                <div class="gig">
                    ${elements.includes('name') ? `<div class="gig-name">${gig.name}</div>` : ''}
                    ${elements.includes('venue') ? `<div class="gig-venue"><a href="${gig.venue.location_url}">${gig.venue.name}</a></div>` : ''}
                    ${elements.includes('address') ? `<div class="gig-address">${address} (${suburb})</div>` : ''}
                    ${time ? `<div class="gig-time">${time}</div>` : ''}
                    ${elements.includes('description') ? `<div class="gig-description">${gig.description}</div>` : ''}
                </div>
            `;
        }
    }
}

function populateFilters(postcodes, gigs) {
    const filterSelect = document.getElementById('filter');
    filterSelect.innerHTML = '<option value="All">All</option>';
    for (const [postcode, suburb] of Object.entries(postcodes)) {
        filterSelect.innerHTML += `<option value="${postcode}">${postcode} - ${suburb}</option>`;
    }
    const venues = [...new Set(gigs.map(gig => gig.venue.name))];
    for (const venue of venues) {
        filterSelect.innerHTML += `<option value="${venue}">${venue}</option>`;
    }
}

document.getElementById('filter').addEventListener('change', function() {
    const filterValue = this.value;
    const gigs = JSON.parse(sessionStorage.getItem('gigs'));
    const elements = JSON.parse(sessionStorage.getItem('elements'));
    const style = sessionStorage.getItem('style');
    const postcodes = JSON.parse(sessionStorage.getItem('postcodes'));
    const filteredGigs = gigs.filter(gig => {
        const address = gig.venue.address;
        const postcode = address.split(' ').pop();
        return filterValue === 'All' || postcode === filterValue || gig.venue.name === filterValue;
    });
    displayGigs(filteredGigs, elements, style, postcodes);
});
