/*global d3, crossfilter, barChart, points */

// partially adapted from crossfilter's example

var map;
var markers = [];

var filter;
var val1Dimension;
var val1Grouping;
var val2Dimension;
var val2Grouping;
var charts;
var domCharts;

var latDimension;
var lngDimension;
var idDimension;
var idGrouping;

var acidentes = [];

function init1() {
    d3.csv("acidentes-2016-less.csv", function (d) {
        acidentes = d;
        init();
    });
}

function init() {
    initMap();
    initCrossfilter();

    // bind map bounds to lat/lng filter dimensions
    latDimension = filter.dimension(function (p) {
        return p.LATITUDE;
    });
    lngDimension = filter.dimension(function (p) {
        return p.LONGITUDE;
    });

    google.maps.event.addListener(map, 'bounds_changed', function () {
        var bounds = this.getBounds();
        var northEast = bounds.getNorthEast();
        var southWest = bounds.getSouthWest();

        // NOTE: need to be careful with the dateline here
        lngDimension.filterRange([southWest.lng(), northEast.lng()]);
        latDimension.filterRange([southWest.lat(), northEast.lat()]);

        // NOTE: may want to debounce here, perhaps on requestAnimationFrame
        updateCharts();
    });

    // dimension and group for looking up currently selected markers
    idDimension = filter.dimension(function (p, i) {
        return i;
    });
    idGrouping = idDimension.group(function (id) {
        return id;
    });

    renderAll();
}

function initMap() {
    google.maps.visualRefresh = true;

    //var myLatlng = new google.maps.LatLng(38.1, -96.24);
    var myLatlng = new google.maps.LatLng(-30.085209, -51.233864);
    var mapOptions = {
        zoom: 12,
        center: myLatlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        panControl: false
    };
    map = new google.maps.Map(document.getElementById('map-div'), mapOptions);

    var opt = {
        "styles": [
            {textColor: "black", textSize: 15, height: 60, width: 60},
            {textColor: "black", textSize: 15, height: 70, width: 70},
            {textColor: "black", textSize: 15, height: 80, width: 80},
            {textColor: "black", textSize: 15, height: 90, width: 90},
            {textColor: "black", textSize: 15, height: 100, width: 100}
        ],

        "legend": {
            "Fatal": "#FF0066",
            "Very serious injuries": "#FF9933",
            "Serious injuries": "#FFFF00",
            "Minor injuries": "#99FF99",
            "No injuries": "#66CCFF",
            "Not recorded": "#A5A5A5"
        }
    };

    // create array of markers from points and add them to the map
    for (var i = 0; i < acidentes.length; i++) {
        var point = acidentes[i];
        var accident_injuries = acidentes[i].FERIDOS;
        var accident_title = "";
        //var accident_lnglat = acidentes[i].geometry["coordinates"];
        switch (Number(accident_injuries)) {
            case 1:
                accident_title = "Fatal";
                break;
            case 3:
                accident_title = "Serious injuries";
                break;
            case 2:
                accident_title = "Very serious injuries";
                break;
            case 5:
                accident_title = "No injuries";
                break;
            case 4:
                accident_title = "Minor injuries";
                break;
            case 6:
                accident_title = "Not recorded";
                break;
        }
        markers[i] = new google.maps.Marker({
            //position: new google.maps.LatLng(point.lat, point.lng),
            position: new google.maps.LatLng(point.LATITUDE, point.LONGITUDE),
            map: map,
            title: accident_title
        });
    }

    console.log("map: " , map);
    console.log("markers: " , markers);
    console.log("opt: " , opt);

    var markerCluster = new MarkerClusterer(map, markers, opt);

    //google.load("visualization", "1", {packages: ["corechart"]});
    //google.setOnLoadCallback(init);
}

function initCrossfilter() {
    filter = crossfilter(acidentes);

    // simple dimensions and groupings for major variables
    val1Dimension = filter.dimension(
        function (p) {
            //return p.val1;
            return p.FERIDOS;
        });
    val1Grouping = val1Dimension.group(
        function (v) {
            return Math.floor(v);
        });

    val2Dimension = filter.dimension(
        function (p) {
            //return p.val2;
            return p.MORTES;
        });
    val2Grouping = val2Dimension.group(
        function (v) {
            return Math.floor(v / 25) * 25;
        });

    // initialize charts (helper function in chart.js)
    // taken directly from crossfilter's example
    charts = [
        barChart()
            .dimension(val1Dimension)
            .group(val1Grouping)
            .x(d3.scale.linear()
                .domain([0, 10])
                .rangeRound([0, 10 * 10])),

        barChart()
            .dimension(val2Dimension)
            .group(val2Grouping)
            .x(d3.scale.linear()
                .domain([0, 1000])
                .rangeRound([0, 40 * 10]))
            .filter([75, 700])
    ];

    // bind charts to dom
    domCharts = d3.selectAll(".chart")
        .data(charts)
        .each(function (chart) {
            chart.on("brush", renderAll).on("brushend", renderAll);
        });
}

// Renders the specified chart
function render(method) {
    d3.select(this).call(method);
}

// Renders all of the charts
function updateCharts() {
    domCharts.each(render);
}

// set visibility of markers based on crossfilter
function updateMarkers() {
    var pointIds = idGrouping.all();
    for (var i = 0; i < pointIds.length; i++) {
        var pointId = pointIds[i];
        markers[pointId.key].setVisible(pointId.value > 0);
    }
}

// Whenever the brush moves, re-render charts and map markers
function renderAll() {
    updateMarkers();
    updateCharts();
}

// Reset a particular histogram
window.reset = function (i) {
    charts[i].filter(null);
    renderAll();
};