document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed'); // Debugging statement
    const searchButton = document.getElementById('search-form');
    const toggleFBTextButton = document.getElementById('toggle-fb-text');
    const floatingContainer = document.getElementById('floating-container');
    const filtersContainer = document.getElementById('filters-container');
    const resultsContainer = document.getElementById('results-container');
    const floatingButtonsContainer = document.getElementById('floating-buttons-container'); // Add this line
    const elementsContainer = document.querySelector('fieldset[name="elements-container"]');

    document.getElementById('toggle-fb-text').addEventListener('click', () => {
        console.log('Floating button clicked'); // Debugging statement
        const button = document.getElementById('toggle-fb-text');
        const container = document.getElementById('floating-container');

        button.style.display = 'none';
        container.style.display = 'block';
    });

    document.getElementById('copy-text').addEventListener('click', function () {
        const textArea = document.getElementById('facebook-text');
        textArea.select();
        document.execCommand('copy');
    });

    document.getElementById('close-float').addEventListener('click', () => {
        const button = document.getElementById('toggle-fb-text');
        const container = document.getElementById('floating-container');

        container.style.display = 'none';
        button.style.display = 'block';
    });

    // Function to format the date and time for iCal
function formatDateTimeForiCal(date, time) {
    const dateTime = new Date(`${date}T${time}`);
    return dateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Function to create an iCal event
function createICalEvent(gig) {
    const startDateTime = formatDateTimeForiCal(gig.date, gig.start_time || '00:00:00');
    const endDateTime = formatDateTimeForiCal(gig.date, gig.end_time || gig.start_time || '00:00:00');
    return `
BEGIN:VEVENT
SUMMARY:${gig.name}
DTSTART:${startDateTime}
DTEND:${endDateTime}
LOCATION:${gig.venue.name}, ${gig.venue.address}
DESCRIPTION:${gig.genre_tags.join(', ')}
END:VEVENT
    `.trim();
}

// Function to download iCal file
document.getElementById('download-ical').addEventListener('click', () => {
    const icalEvents = gigs.map(createICalEvent).join('\n');
    const icalContent = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Live Music Locator//EN
${icalEvents}
END:VCALENDAR
    `.trim();

    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gigs.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});


    document.getElementById('search-form').addEventListener('submit', async function (event) {
        event.preventDefault();
        console.log('submit pressed'); 
        toggleFBTextButton.style.display = 'block';
        resultsContainer.style.display = 'flex';
        filtersContainer.style.display = 'flex';
        elementsContainer.style.display = 'block'; 

        const dateFrom = document.getElementById('date_from').value;
        const dateTo = document.getElementById('date_to').value;

        const url = `https://api.lml.live/gigs/query?location=melbourne&date_from=${dateFrom}&date_to=${dateTo}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            gigs = await response.json();
            console.log('API Response:', gigs);

            const postcodes = {};
            const venues = new Set();
            const genres = new Set();
            gigs.forEach(gig => {
                const venue = gig.venue || {};
                const venueAddress = venue.address || '';
                const venuePostcode = venue.postcode || venueAddress.split(' ').pop();
                if (!isNaN(venuePostcode)) {
                    postcodes[venuePostcode] = 'Unknown Suburb'; 
                }
                venues.add(venue.name || 'Unknown Venue');
                if (gig.genre_tags) {
                    gig.genre_tags.forEach(genre => genres.add(genre));
                }
            });

            const postcodesCsv = await fetch('vic_postcodes.csv').then(response => response.text());
            const lines = postcodesCsv.split('\n');
            lines.forEach(line => {
                const [postcode, suburb] = line.split(',');
                if (postcodes[postcode]) {
                    postcodes[postcode] = suburb;
                }
            });

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

            document.getElementById('filters-container').style.display = 'flex';
            document.getElementById('results-container').style.display = 'flex';
            document.getElementById('facebook-container').style.display = 'flex';

            displayGigs(gigs);

            floatingButtonsContainer.style.display = 'flex'; 
        } catch (error) {
            console.error('Failed to load gigs:', error);
            alert('Failed to load gigs. Please try again later.');
        }
    });

    // Add event listeners to checkboxes
    const checkboxes = document.querySelectorAll('input[name="elements"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            displayGigs(gigs);
        });
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

    function displayGigs(gigs) {
        const elements = Array.from(document.querySelectorAll('input[name="elements"]:checked')).map(el => el.value);
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
                const time = gig.start_time && elements.includes('time') ? `<div class="gig-time">${formatTime(gig.start_time)}</div>` : '';

                gigDiv.innerHTML = `${name}${venueName}${address}${time}`;
                gigList.appendChild(gigDiv);
            });
        }

        // Add footer once
        const footer = document.createElement('div');
        footer.className = 'gig-footer';
        footer.textContent = 'Data courtesy of Live Music Locator';
        gigList.appendChild(footer);

        updateVisibleDates();
        formatForFacebook();
    }

    function formatTime(timeString) {
        const [hour, minute] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hour));
        date.setMinutes(parseInt(minute));
        const options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Australia/Sydney' };
        return date.toLocaleTimeString('en-AU', options);
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
                    if (currentHeader !== dateHeader.textContent) {
                        currentHeader = dateHeader.textContent;
                        facebookText.value += `${boldText(currentHeader)}\n\n`;
                    }
                }

                const name = gig.querySelector('.gig-name') ? gig.querySelector('.gig-name').textContent : '';
                const venueName = gig.querySelector('.gig-venue') ? gig.querySelector('.gig-venue').textContent : '';
                const address = gig.querySelector('.gig-address') ? gig.querySelector('.gig-address').textContent : '';
                const time = gig.querySelector('.gig-time') ? gig.querySelector('.gig-time').textContent : '';

                facebookText.value += `${boldText(name)}\n${venueName}\n${address}\n${time}\n\n`;
            }
        });

        // Add footer once
        facebookText.value += 'Data courtesy of Live Music Locator';
    }

    function boldText(text) {
        const boldMap = {
            'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟',
            'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫',
            'Y': '𝗬', 'Z': '𝗭', 'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
            'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃',
            'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇'
        };
        return text.split('').map(char => boldMap[char] || char).join('');
    }

    // Download buttons event listeners
    document.getElementById('download-json').addEventListener('click', () => {
        const dataStr = JSON.stringify(gigs, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gigs.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    document.getElementById('download-csv').addEventListener('click', () => {
        const csvData = gigs.map(gig => ({
            Date: gig.date,
            Name: gig.name,
            Venue: gig.venue.name,
            Address: gig.venue.address,
            Time: gig.start_time
        }));
        const csvHeaders = 'Date,Name,Venue,Address,Time\n'; // Add this line
        const csv = csvHeaders + csvData.map(row => Object.values(row).join(',')).join('\n'); // Modify this line
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gigs.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    document.getElementById('download-excel').addEventListener('click', () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(gigs.map(gig => ({
            Date: gig.date,
            Name: gig.name,
            Venue: gig.venue.name,
            Address: gig.venue.address,
            Time: gig.start_time
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Gigs');
        XLSX.writeFile(wb, 'gigs.xlsx');
    });
});

