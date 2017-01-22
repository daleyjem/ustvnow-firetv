document.addEventListener('deviceready', onReady);

function onReady(){
    var GUIDE_URL               = 'http://m-api.ustvnow.com/gtv/1/live/channelguidehtml?token=';
    var GUIDE_URL_APPEND        = '&tz=' + (new Date().getTimezoneOffset() * -1);
    var LISTING_ITEM_SELECTOR   = 'td.chnl a.play';
    var RESOLUTIONS             = 3;

    var browser = cordova.InAppBrowser;
    var state = 'guide';
    var timer = 0;
    var token = '';
    var updateOnMin = parseInt( moment().format('m') ) >= 30 ? 0 : 30;
    var currIndex;

    var $currItem;
    var $prevItem;
    var $iframe = $('iframe');
    var $iframeDoc;
    var $iframeBody;
    var $infoContainer;
    var $clock;
    var $window = $(window);
    
    // Wait till this initially loads to do anything
    $iframe.on('load', onIframeLoaded);

    function init(){
        // If we're not logged in... 
        // which we're probably not on the first run
        if (!checkLoggedIn( $iframe.contents() )){
            login();
        } else {
            $iframeDoc = $iframe.contents();
            $iframeDoc.on('keydown', onKeydown);
            injectCSS($iframeDoc, 'inject/iframe.css');
            injectDescriptionContainer();
            listenForGuide();
            startClock();
        }
    }

    function finalize(){
        $iframeBody = $iframeDoc.find('body');        
        $iframe.css('visibility', 'visible');

        processGuide();

        getToken();
        startClockListeners();
    }

    function processGuide(){
        // let's decide what the $currItem should be
        var lastIndex = window.localStorage.getItem('lastIndex');
        // if there's nothing last stored
        if (lastIndex === null) {
            setCurrent( $iframeBody.find('#guide tr:first-child td.chnl a.play') );
        }
        // else our $currItem should be the last index
        else {
            lastIndex = parseInt( lastIndex );
            setCurrent( $iframeBody.find('#guide tr:nth-child(' + (lastIndex + 1) + ') td.chnl a.play') );
        }

        editFocusable();
        makeClickable();

        $clock = $iframeBody.find('#guide_time th:first-child');
    }

    /**
     * Open the login window and wait for a response to refresh the iframe
     */
    function login(){
        var loginWin = browser.open('https://watch.ustvnow.com/account/signin', '_blank', 'location=no');
        loginWin.addEventListener('loadstop', onLoginWindowStop);
        loginWin.addEventListener('loadstart', onLoginWindowStart);

        function onLoginWindowStop(evt){
            // if it's NOT the guide page
            if (evt.url.indexOf('watch.ustvnow.com/guide') === -1) {
                // inject some css
                $.get('inject/login.css', function(css){
                    loginWin.insertCSS( {code: css} );
                });
            }
        }

        function onLoginWindowStart(evt){
            // if it's the guide page, we should be logged in now
            if (evt.url.indexOf('watch.ustvnow.com/guide') > -1) {
                loginWin.removeEventListener('loadstop', onLoginWindowStop);
                loginWin.removeEventListener('loadstart', onLoginWindowStart);
                loginWin.close();
                $iframe[0].contentWindow.location.reload();
            }
        }
    }

    /**
     * Check the given DocumentDOM to see if there's an account dropdown options box
     * @param  {jQuery} $document A jQuery DocumentDOM
     * @return {bool}
     */
    function checkLoggedIn($document){
        // There should be one of these if we're logged in...
        var $acctBox = $document.find('.menu-btn-login .dropdown-menu');
        return $acctBox.length > 0;
    }

    /**
     * Injects CSS into a document
     * @param  {jQuery} $target  The DOMDocument
     * @param  {string} cssPath File path to CSS file
     */
    function injectCSS($target, cssPath){
        $.get(cssPath, function(data){
            var $style = $('<style>' + data + '</style>');
            $target.find( 'body' ).append( $style );
        });
    }

    /**
     * Listen for a DOM element that tells us the guide has loaded
     * @return {[type]} [description]
     */
    function listenForGuide(){
        var i = window.setInterval(function(){
            if ($iframeDoc.find( LISTING_ITEM_SELECTOR ).length > 0) {
                window.clearInterval( i );
                finalize();
            }
        }, 100);
    }

    /**
     * This will start a timer to update the guide and also display TOD
     */
    function startClock(){
        timer = window.setInterval(function(){
            $window.trigger('clockTick');
        }, 30000);
    }

    /**
     * Sets listeners to clock 'trigger' for updating UI at intervals
     */
    function startClockListeners(){
        setTod();

        $window.on('clockTick', function(){
            // update current Tod on guide
            setTod();

            // See if the guide needs updated
            var mins = parseInt( moment().format('m') );
            if (mins === updateOnMin) {
                updateOnMin = mins >= 30 ? 0 : 30;
                window.updateGuide();
            }
            
            // TODO: See if the info container needs updated
        });
    }

    function setTod(){
        var tod = moment().format('h:mmA');
        $clock.html( tod );
    }

    /**
     * Injects a <div> for displaying the currently playing item
     */
    function injectDescriptionContainer(){
        var containerHTML = 
            '<div class="injected-info-container">' +
                '<div class="injected-network"></div>' +
                '<div class="injected-title"></div>' +
                '<div class="injected-description"></div>' +
            '</div>';

        $infoContainer = $( containerHTML );
        $iframeDoc.find('body').append( $infoContainer );
    }

    /**
     * Makes everything unfocusable, but then makes whole table cells focusable
     */
    function editFocusable(){
        $iframeDoc.find('*').attr('tabindex', '-1');

        var $items = $iframeDoc.find( LISTING_ITEM_SELECTOR );
        $items.attr('tabindex', '1');

        $items.on('focus', function(){
            $(this).closest('td').addClass('focus');
        });

        $items.on('blur', function(){
            $(this).closest('td').removeClass('focus');
        });

        // $currItem should always exist at this point
        $currItem.focus();
    }

    /**
     * Makes the listing item <td>'s propagate clicks through to <a>'s
     */
    function makeClickable(){
        $iframeDoc.find( LISTING_ITEM_SELECTOR ).on('click', onListingItemClick);
    }

    /**
     * Get the user token from the inline JS
     * @return {string} The token that was parsed from the DOM script
     */
    function getToken(){
        var reg = new RegExp("var token[^=]*=[^\"]*\"([^\"]+)\";", "gi");
        $iframeDoc.find('script:not([src])').each(function(i, el){
            // if it has the JS that we need
            var source = el.innerHTML;
            if (source.indexOf('var baseUrlSecure') > -1) {
                var match = reg.exec( source );
                if (match.length > 1) {
                    token = match[1];
                    return false;
                }
            }
        });
    }

    /**
     * Update the info container with this program info and logo
     * @param  {jQuery} $item The currently playing item selected
     */
    function updateInfoContainer($item){
        var $tr         = $item.closest('tr');
        var $td         = $tr.find('.innertb td[data-callsign]').first();
        var $logo       = $item.find('img');
        var $logoClone  = $logo.clone();
        
        var title       = $td.data('title');
        var description = $td.data('description');

        $infoContainer.find('.injected-network').html( $logoClone );
        $infoContainer.find('.injected-title').html( title );
        $infoContainer.find('.injected-description').html( description );
    }

    window.updateGuide = function(){
        $.get(GUIDE_URL + token + GUIDE_URL_APPEND, function(data){
            $iframeBody.find('#guide').html( data );
            processGuide();
            setTod();
            updateInfoContainer($currItem);
        });
    };

    function setCurrent($item){
        $prevItem = $currItem;
        $currItem = $item;
        currIndex = $currItem.closest('tr').index();
        window.localStorage.setItem('lastIndex', currIndex);
    }

    function plauseVideo(){
        var vid = $iframeBody.find('video')[0];
        if (vid.paused) {
            vid.play();
        } else {
            vid.pause();
        }
    }

    function downGrade(){
        var $video      = $iframeBody.find('video');
        var src         = $video.attr('src');
        var reg         = new RegExp("[a-z0-9]+:[^\\/]+");
        var m           = src.match( reg )[0];
        var protocol    = m.split(':')[0];
        var post        = m.split(':')[1];
        
        if (protocol === 'smil') {
            // goto high-res mp4
            src = src.split( m ).join('mp4:' + post + RESOLUTIONS);
        } 
        // if (protocol === 'mp4')
        else {
            // what's the last digit
            var digit   = parseInt( post.substr(-1) );
            var rep     = '';

            if (digit === 1) {
                // go back to smil
                rep = 'smil:' + post.substr(0, post.length - 1);
            } else {
                digit--;
                rep = m.substr(0, m.length - 1) + digit;
            }

            src = src.split( m ).join( rep );
        }

        $video[0].src = src;
        $video[0].play();
    }


    /******************************
     * Events
     ******************************/


    function onIframeLoaded(){
        init();
    }

    function onListingItemClick(evt){
        window.scrollTo(0, 0);
        setCurrent( $(this) );
        updateInfoContainer( $currItem );
    }

    function onKeydown(evt){
        switch(evt.which) {
            // D-pad up arrow
            case 38:
                if (state === 'video')
                    //$iframeBody.find('video').focus();
                break;
            // D-pad center button
            case 13:

                break;
            // Play/pause button
            case 179:
                plauseVideo();
                break;
            // << RWD ... Cycle down through quality
            case 227:
                downGrade();
                break;
            // FWD >> ... Toggle video preview mode
            case 228:
                $iframeBody.toggleClass('collapsed');
                state = $iframeBody.hasClass('collapsed') ? 'guide' : 'video';

                evt.preventDefault();
                evt.stopPropagation();
                break;

        }
    }

}


