require('eventsource-polyfill');

require('webpack-hot-middleware/client?reload=true').subscribe((event) => {
    switch (event.action) {
        case 'reloadData':
            location.reloadData();
            break;
    }
});
