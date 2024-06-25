document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const gigList = document.getElementById('gig-list');
    const filter = document.getElementById('filter');
    const dateRangeHeader = document.getElementById('date-range-header');

    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(searchForm);
        const dateFrom = formData.get('date_from');
        const dateTo = formData.get('date_to');
        const timezone = formData.get('timezone');
        const style = formData.get('style');
        const elements = formData.getAll('elements');

        const url = `https://api.lml.live/gigs/query?location=melbourne&date_from=${dateFrom}&date_to=${dateTo}`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            renderGigs(data, elements, style, timezone);
            populateFilterOptions(data);
            dateRangeHeader.textContent = `Gigs for ${dateFrom} to ${dateTo}`;
        } else {
            gigList.innerHTML = `<p>Error: ${data.error}</p>`;
        }
    });

    filter.addEventListener('change', () => {
        const filterValue = filter.value;
        const gigs = document.querySelectorAll('.gig');
        gigs.forEach(gig => {
            if (filterValue === 'All' || gig.dataset.postcode === filterValue || gig.dataset.venue === filterValue) {
                gig.style.display = 'block';
            } else {
                gig.style.display = 'none';
            }
        });
    });

    function renderGigs(data, elements, style, timezone) {
        gigList.innerHTML = '';
        let currentDate = null;
        const gigsByDate = {};

        data.forEach(gig => {
            const gigDate = gig.date;
            if (!gigsByDate[gigDate]) {
                gigsByDate[gigDate] = [];
            }
            gigsByDate[gigDate].push(gig);
        });

        Object.keys(gigsByDate).forEach(date => {
            const gigs = gigsByDate[date];
            if (!gigs.length) {
                return;
            }

            const dateHeader = document.createElement('h2');
            dateHeader.textContent = new Date(date).toLocaleDateString('en-GB', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            gigList.appendChild(dateHeader);

            gigs.forEach(gig => {
                const gigElement = document.createElement('div');
                gigElement.className = 'gig';
                const venue = gig.venue || {};
                const venueAddress = venue.address || '';
                const venuePostcode = venueAddress.split(' ').pop();
                const venueName = venue.name || 'No venue';

                gigElement.dataset.postcode = venuePostcode;
                gigElement.dataset.venue = venueName;

                let time = gig.start_time || 'No time';
                if (time && time !== 'No time') {
                    try {
                        const utcTime = new Date(time);
                        const localTime = utcTime.toLocaleTimeString('en-GB', {
                            timeZone: timezone,
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });
                        time = localTime;
                    } catch (e) {
                        time = `Error formatting time: ${e}`;
                    }
                }

                let gigContent = '';
                if (style === 'facebook') {
                    gigContent = `
                        <b>${gig.name}</b><br>
                        <a href="${venue.location_url}">${venueName}</a><br>
                        ${venueAddress}<br>
                        ${time}<br>
                        ${gig.description || 'No description'}<br><br>
                    `;
                } else {
                    gigContent = `
                        <div class="gig-name">${gig.name}</div>
                        <div class="gig-venue"><a href="${venue.location_url}">${venueName}</a></div>
                        <div class="gig-address">${venueAddress}</div>
                        <div class="gig-time">${time}</div>
                        <div class="gig-description">${gig.description || 'No description'}</div>
                    `;
                }

                gigElement.innerHTML = gigContent;
                gigList.appendChild(gigElement);
            });
        });
    }

    function populateFilterOptions(data) {
        filter.innerHTML = '<option value="All">All</option>';
        const postcodes = new Set();
        const venues = new Set();

        data.forEach(gig => {
            const venue = gig.venue || {};
            const venueAddress = venue.address || '';
            const venuePostcode = venueAddress.split(' ').pop();
            const venueName = venue.name || 'No venue';

            if (venuePostcode) {
                postcodes.add(venuePostcode);
            }
            if (venueName) {
                venues.add(venueName);
            }
        });

        postcodes.forEach(postcode => {
            const option = document.createElement('option');
            option.value = postcode;
            option.textContent = postcode;
            filter.appendChild(option);
        });

        venues.forEach(venue => {
            const option = document.createElement('option');
            option.value = venue;
            option.textContent = venue;
            filter.appendChild(option);
        });
    }
});
