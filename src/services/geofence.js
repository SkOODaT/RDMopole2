'use strict';

const fs = require('fs');
const path = require('path');
//const turf = require('@turf/turf');//@turf/boolean-point-in-polygon');
//const geo = require('geolocation-utils');
//const inside = require('point-in-polygon');
//const classifyPoint = require("robust-point-in-polygon");
const geofencesDir = path.resolve(__dirname, '../../geofences');

/** References
 * https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon / https://stackoverflow.com/a/55076837
 * https://www.npmjs.com/package/point-in-polygon
 * https://www.npmjs.com/package/robust-point-in-polygon
 * https://www.npmjs.com/package/geolocation-utils
 * https://github.com/Turfjs/turf/tree/master/packages/turf-boolean-point-in-polygon
 * 
*/

class Geofence {
    constructor(name, polygon) {
        this.name = name;
        this.polygon = polygon;
    }
}

class GeofenceService {
    constructor() {
        this.geofences = [];
        if (!fs.existsSync(geofencesDir)) {
            fs.mkdirSync(geofencesDir);
        }
        this.loadGeofences();
    }
    loadGeofences() {
        var files = fs.readdirSync(geofencesDir);
        if (files) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (file !== '.' && file !== '..') {
                    var filepath = path.resolve(geofencesDir, file);
                    var geofence = this.loadGeofence(filepath);
                    if (geofence) {
                        this.geofences.push(geofence);
                    }
                }
            }
        }
        return this.geofences;
    }
    loadGeofence(file) {
        var data = fs.readFileSync(file, 'UTF-8');
        var lines = data.split(/\r?\n/);
        var name = "Unknown";
        if (lines.length > 0 && lines[0].indexOf('[', 0) === 0) {
            name = lines[0].replace('[', '');
            name = name.replace(']', '');
        }
  
        var geofence = new Geofence();
        geofence.name = name;
        geofence.polygon = this.buildPolygon(lines.slice(1));
        return geofence;
    }
    buildPolygon(lines) {
        var latlngs = [];
        var first = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.indexOf('[', 0) === 0)
                continue;
	  	  	  
            var parts = line.split(',');
            var lat = parseFloat(parts[0]);
            var lon = parseFloat(parts[1]);
            if (i === 0) {
                first = [lon, lat];
            }
            latlngs.push([lon, lat]);
        }
        latlngs.push(first);
        return latlngs;
    }
    inGeofence(geofence, lat, lon) {
        //var result = geo.insidePolygon([lon, lat], geofence.polygon);
        //var result = checkcheck(lat, lon, geofence.polygon.filter(x => x[1]), geofence.polygon.filter(x => x[0]));
        //var result = classifyPoint(geofence.polygon, [lon, lat]);
        //var result = matchPointAndPolygon([lon, lat], geofence.polygon);
        var result = isLatLngInZone(geofence, lat, lon);
        //console.log("Result:", result);
        //return result === -1 || result === 0;
        return result;
    }
    contains(geofence, lat, lon) {
        var polygon = geofence.polygon;
        var numOfPoints = polygon.length;
        var lats = polygon.map(x => x[1]);
        var lngs = polygon.map(x => x[0]);
        var polygonContainsPoint = false;
        for (var node = 0, altNode = (numOfPoints - 1); node < numOfPoints; altNode = node++) {
            if ((lngs[node] > lon !== (lngs[altNode] > lon))
                && (lat < (lats[altNode] - lats[node])
                        * (lon - lngs[node])
                        / (lngs[altNode] - lngs[node])
                        + lats[node]
                )   
            )
            {
                polygonContainsPoint = !polygonContainsPoint;
            }
        }
        return polygonContainsPoint;
    }
    getGeofence(lat, lon) {
        var geofences = this.geofences;
        for (var i = 0; i < geofences.length; i++) {
            var geofence = geofences[i];
            if (this.inGeofence(geofence, parseFloat(lat), parseFloat(lon))) {
                return geofence;
            }
        }
        return null;
    }
}

function isLatLngInZone(geofence, lat, lng){
    var latLngs = geofence.polygon;
    var lngs = []; // TODO: .filter
    var lats = [];
    var polygonContainsPoint = 0;
    for (var i = 0; i < latLngs.length; i++) {
        lngs.push(latLngs[i][1]);
        lats.push(latLngs[i][0]);
    }
    var numOfPoints = lats.length;
    var point = 0;
    for (var node = 0, altNode = numOfPoints; node < numOfPoints; altNode = node++) {
        point = node;
        if (point === numOfPoints) {
            point = 0;
        }
        if (((lngs[point] > lat !== (lngs[altNode] > lat)) 
                && (lng < (lats[altNode] - lats[point])
                 * (lat - lngs[point])
                 / (lngs[altNode] - lngs[point])
                 + lats[point]))) {
            polygonContainsPoint = !polygonContainsPoint;
        }
    }
    return polygonContainsPoint;
}

/*
function checkcheck(x, y, cornersX, cornersY) {
    var i, j=cornersX.length-1 ;
    var odd = false;
    var pX = cornersX;
    var pY = cornersY;
    for (i=0; i<cornersX.length; i++) {
        if ((pY[i]< y && pY[j]>=y ||  pY[j]< y && pY[i]>=y)
            && (pX[i]<=x || pX[j]<=x)) {
              odd ^= (pX[i] + (y-pY[i])*(pX[j]-pX[i])/(pY[j]-pY[i])) < x; 
        }
        j=i; 
    }
    return odd;
}

function matchPointAndPolygon(point,polygon) {
    const bbox = poly => poly.reduce((b,[x,y]) =>
     ({"miX":Math.min(x,b.miX),"maX":Math.max(x,b.maX),"miY":Math.min(y,b.miY),"maY":Math.max(y,b.maY)}),
     {"miX":poly[0][0],"maX":poly[0][0], "miY":poly[0][1],"maY":poly[0][1]});
    const inBBox = ([x,y], box) => !(x < box.miX || x > box.maX || y < box.miY || y > box.maY);
    const intersect = (xi,yi, xj,yj, u,v) =>
     ((yi > v) != (yj > v)) && (u < (xj - xi) * (v - yi) / (yj - yi) + xi);
    const nex = (i,t) => i===0? t.length-1 : i-1;
    const insideWN = ([x,y], vs) => !!(vs.reduce((s,p,i,t) =>
      s + intersect(p[0],p[1], t[nex(i,t)][0],t[nex(i,t)][1], x,y), 0));
    return inBBox(point, bbox(polygon)) && insideWN(point, polygon);
}
*/

module.exports = {
    Geofence,
    GeofenceService
};