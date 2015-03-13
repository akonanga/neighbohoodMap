'use strict';
/**
 * Created by vidaluson on 3/2/15.
 */

var ViewModel = function () {
    var self = this;

    var map;
    var infoWindow;
    var service;
    var markers = [];
    var markersInfoWindow = [];                         //infowindow for the markers (aka venues)

    var numOfVenues = 0;                                //number of foursquare venues to cache; if 0 then cache all

    var cachedPOIList = [];                             //untouched json array from foursquare api for filter purposes
    self.displayPOIList = ko.observableArray([]);       //poi list displayed

    self.isPOIDetailsVisible =  ko.observable(false);

    self.is4SquareIssueVisible = ko.observable(false);

    var client_id = 'C4KJ2R33H3VRWV4PGTJWPL1H4Q2YZ1KZMYAASDDJ5PV2JZPY';         //foursquare credentials
    var client_secret = '3HVIXSPYGDXRUSGQSYUVSIA3QWHQJ3YMQQESLYKZKB2RVIQ5';     //foursquare credentials

    var current_animatedMarker;         //current animated marker;
    self.currentPOI = ko.observable();  //current clicked POI;

    var myDefaultNeighborhood = {
        name: 'San Ramon',
        lat: 37.766064,
        lng: -121.963439
    };

    var map_currentNeighborhood = function(thisNeighborhoodName) {
        //get google map of a given city
        //https://developers.google.com/maps/documentation/javascript/places
        var request = {
            query: thisNeighborhoodName
        };
        service = new google.maps.places.PlacesService(map);
        service.textSearch(request, callback);  //callback method to textSearch(), to handle the results object and google.maps.places.PlacesServiceStatus response.
    };

    var callback = function(results, status) {
        // callback is the callback function when service.textSearch() is done (see service.textSearch() statement immediately above)
        // Checks that the PlacesServiceStatus is OK, and adds a marker
        // using the place ID and location from the PlacesService.
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            var lat = results[0].geometry.location.lat();
            var lng = results[0].geometry.location.lng();
            var newCenter = new google.maps.LatLng(lat, lng);
            map.setCenter(newCenter);
            var image = 'images/beachflag.png';
            var marker = new google.maps.Marker({
                map: map,
                icon: image,
                title: results[0].name,
                position: results[0].geometry.location
            });
            markers.push(marker);
            myDefaultNeighborhood = results[0];
            google.maps.event.addListener(marker, 'click', function() {
                if (marker.getAnimation() != null) {
                    marker.setAnimation(null);

                } else {
                    if (typeof current_animatedMarker === 'object') {
                        current_animatedMarker.setAnimation(null);
                    }
                    marker.setAnimation(google.maps.Animation.BOUNCE);
                    current_animatedMarker = marker;
                }
                map.panTo(marker.getPosition());
                infoWindow.setContent(
                    "<div id='infoWindowHook'>" +
                    "<h6>" + myDefaultNeighborhood.formatted_address + "</h6>" +
                    "</div>"
                );
                infoWindow.open(map, marker);
                self.currentPOI(null);
            });
            get_infoFrom4Square(results[0].geometry.location.lat(), results[0].geometry.location.lng());
        } else {
            console.log('Google API for Places has an issue');
            self.isGoogleIssueVisible(true);
        }
    };

    var get_infoFrom4Square = function (lat, lng) {
        //get venues from foursquare by coordinates
        var today = new Date();
        var v = today.getFullYear().toString() + ("0" + (today.getMonth() + 1)).slice(-2) + ("0" + (today.getDate())).slice(-2);
        var foursquareURL = 'https://api.foursquare.com/v2/venues/explore?ll=' + lat + ',' + lng + '&client_id=' + client_id + '&client_secret=' + client_secret + '&v=' + v;
        $.getJSON(foursquareURL, function (data) {
            var i = 0;
            var dataItems = data.response.groups[0].items;
            do{
                cachedPOIList.push(dataItems[i]);
                create_markers(dataItems[i], i);
                ++i;
            }while((numOfVenues === 0 || i < numOfVenues) && i < dataItems.length);
            if($.trim(self.currentFilter()).length === 0) {
                filter_POI(self.currentFilter());
            } else {
                self.currentFilter('');
            }
            google.maps.event.trigger(markers[0], 'click');
        }).error(function (evt) {
            //foursquare issue
            self.is4SquareIssueVisible(true);
        });
    };

    var delete_markers = function (isRetain0ndx) {
        //deletes google map markers
        for (var i = 0; i < markers.length; i++) {
            if(isRetain0ndx && i === 0) {
            } else {
                markers[i].setMap(null);
            }
        }
        //markers = [];
        markers.length = (isRetain0ndx) ? 1 : 0;
        markersInfoWindow = [];
    };

    var create_markers = function (dataItems, i) {
        //creates google map markers
        var dataAddlText = {
            venue: dataItems.venue.name,
            address: dataItems.venue.location.formattedAddress,
            telephone: (typeof dataItems.venue.contact.formattedPhone === 'undefined') ? 'none' : dataItems.venue.contact.formattedPhone,
            tip: dataItems.tips[0].text,
            url: dataItems.venue.url,
            lat: dataItems.venue.location.lat,
            lng: dataItems.venue.location.lng
        };
        markersInfoWindow[i] = dataAddlText;
        // Create a marker for each place.
        var completeAddr = dataAddlText.address.join('\n');
        var marker = new google.maps.Marker({
            map: map,
            title: dataAddlText.venue + '\n' + completeAddr + '\n' + dataAddlText.telephone,
            position: new google.maps.LatLng(dataAddlText.lat, dataAddlText.lng)
        });
        markers.push(marker);
        google.maps.event.addListener(marker, "click", (function(marker, i) {
            return function() {
                if (marker.getAnimation() != null) {
                    marker.setAnimation(null);

                } else {
                    if (typeof current_animatedMarker === 'object') {
                        current_animatedMarker.setAnimation(null);
                    }
                    marker.setAnimation(google.maps.Animation.BOUNCE);
                    current_animatedMarker = marker;
                }
                map.panTo(marker.getPosition());
                var tempURL = (typeof dataItems.venue.url !== 'undefined')
                            ? "<a href='" + dataItems.venue.url + "' target='_blank'><h5>" + markersInfoWindow[i].venue + "</h5></a>"
                            : "<h5>" + markersInfoWindow[i].venue + "</h5>";
                infoWindow.setContent(
                    "<div id='infoWindowHook'>" +
                    tempURL +
                    "<p>" + markersInfoWindow[i].address.join(' ') +
                    "<br><span style='font-weight:bold;'>" + markersInfoWindow[i].telephone + "</span></p>" +
                    "<p id='infoWindowHook_tip'><span style='font-weight:bold;'>Tip: </span>" + markersInfoWindow[i].tip + "</p>" +
                    "</div>"
                );
                infoWindow.open(map, marker);
                self.currentPOI(i);
                window.location.hash = 'poi_' + dataItems.venue.id;
            };
        })(marker, i));
    };

    var filter_POI = function (thisFilter) {
        //filter the list of POIs and show the corresponding markers
        thisFilter = $.trim(thisFilter);
        if(thisFilter.length === 0) {
            self.displayPOIList([]);
            self.displayPOIList(cachedPOIList);
        } else {
            var tempArray =[];
            for (var i = 0; i < cachedPOIList.length; i++) {
                var obj = cachedPOIList[i];
                if(obj.venue.name.search(new RegExp(thisFilter, 'i')) >= 0
                    || obj.venue.location.formattedAddress.join(' ').search(new RegExp(thisFilter, 'i')) >= 0
                    || (typeof obj.venue.contact.formattedPhone !== 'undefined' && obj.venue.contact.formattedPhone.search(new RegExp(thisFilter, 'i')) >= 0)
                    || (typeof obj.venue.contact.phone !== 'undefined' && obj.venue.contact.phone.search(new RegExp(thisFilter, 'i')) >= 0)
                    || obj.tips[0].text.search(new RegExp(thisFilter, 'i')) >= 0
                ) {
                    tempArray.push(cachedPOIList[i]);
                }
            }
            self.displayPOIList([]);
            self.displayPOIList(tempArray);
        }
        delete_markers(true);
        for (var i = 0; i < self.displayPOIList().length; i++) {
            create_markers(self.displayPOIList()[i], i);
        }
        self.currentPOI(null);
    };

    self.isGoogleIssueVisible = ko.observable(false);
    if(typeof google === 'undefined') {
        self.isGoogleIssueVisible(true);
    } else {
        //init google map BEGIN
        var mapOptions = {
            center: new google.maps.LatLng(myDefaultNeighborhood.lat, myDefaultNeighborhood.lng),
            zoom: 13,
            disableDefaultUI: true
        };
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        infoWindow = new google.maps.InfoWindow();

        google.maps.event.addListener(infoWindow,'closeclick',function(){
            if (typeof current_animatedMarker === 'object') {
                current_animatedMarker.setAnimation(null);
            }
            self.currentPOI(null);
        });

        //init google map END

        self.currentNeighborhood = ko.observable(myDefaultNeighborhood);
        self.currentNeighborhoodName = ko.observable(myDefaultNeighborhood.name);
        map_currentNeighborhood(self.currentNeighborhoodName());

        self.currentNeighborhoodName.subscribe(function () {
            cachedPOIList = [];
            delete_markers(false);
            self.isPOIDetailsVisible(false);
            map_currentNeighborhood(self.currentNeighborhoodName());
        });

        self.currentFilter = ko.observable();
        self.currentFilter.subscribe(function () {
            filter_POI(self.currentFilter());
        });

        self.isRestTextVisible = ko.observable(true);
        self.toggleRestText = function () {
            self.isRestTextVisible(!self.isRestTextVisible());
        };

        self.isPOIListVisible = ko.observable(true);
        self.togglePOIList = function () {
            self.isPOIListVisible(!self.isPOIListVisible());
            self.isPOIDetailsVisible(false);
        };

        self.displayPOIDetails = ko.observableArray();
        self.getPOIDetails = function (data, evt) {
            map.panTo(new google.maps.LatLng(this.venue.location.lat, this.venue.location.lng));
            //map.setZoom(15);
            var isFound = false;
            var i = 0;
            do{
                if(this.venue.id === self.displayPOIList()[i].venue.id) {
                    isFound = true;
                } else {
                    ++i;
                }
            }while(!isFound && i < self.displayPOIList().length);
            google.maps.event.trigger(markers[++i], 'click');
            var parts = evt.target.id.split('_');
            self.currentPOI(parseInt(parts[parts.length - 1],10));
        };

        self.hidePOIDetails = function () {
            self.isPOIDetailsVisible(false);
        };
    }
};


ko.applyBindings(new ViewModel());

