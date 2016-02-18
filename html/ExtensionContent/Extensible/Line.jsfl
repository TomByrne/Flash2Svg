
(function(ext) {

  var Line = function(points) {
    if(arguments.length > 1){
      this.p1 = arguments[0];
      this.p2 = arguments[1];
      this.points = [this.p1, this.p2];
    }else{
      this.p1 = points[0];
      this.p2 = points[1];
      this.points = points;
    }
  };
  /*
    Line.fromSVG = function(svgString) {
    };
  */
  Line.linesEqual = function(line1, line2)
  {
    if(line1.points.length != line2.points.length) return false;

    for(var i=0; i<line1.points.length; i++){
      var p1 = line1.points[i];
      var p2 = line2.points[i];
      if(p1.x != p2.x || p1.y != p2.y){
        return false;
      }
    }
    return true;
  }
     
  // The function that returns true if line segment 'p1q1'
  // and 'p2q2' intersect.
  Line.lineDoesIntersect = function(p1, q1, p2, q2, acceptEndsMeet)
  {
      if(acceptEndsMeet===undefined)acceptEndsMeet = true;

      // Find the four orientations needed for general and
      // special cases
      var o1 = ext.Geom.orientation(p1, q1, p2);
      var o2 = ext.Geom.orientation(p1, q1, q2);
      var o3 = ext.Geom.orientation(p2, q2, p1);
      var o4 = ext.Geom.orientation(p2, q2, q1);
   
      var e1 = p1.x==p2.x && p1.y==p2.y;
      var e2 = p1.x==q2.x && p1.y==q2.y;
      var e3 = q1.x==p2.x && q1.y==p2.y;
      var e4 = q1.x==q2.x && q1.y==q2.y;

      // General case
      if (o1 != o2 && o3 != o4 && (acceptEndsMeet || (o1 && o2 && o3 && o4))){
          return true;
      }
      if(!acceptEndsMeet)return false;

      // Special Cases
      // p1, q1 and p2 are colinear and p2 lies on segment p1q1
      if (o1 == 0 && ext.Geom.onSegment(p1, p2, q1))return true;
   
      // p1, q1 and p2 are colinear and q2 lies on segment p1q1
      if (o2 == 0 && ext.Geom.onSegment(p1, q2, q1))return true;
   
      // p2, q2 and p1 are colinear and p1 lies on segment p2q2
      if (o3 == 0 && ext.Geom.onSegment(p2, p1, q2))return true;
   
       // p2, q2 and q1 are colinear and q1 lies on segment p2q2
      if (o4 == 0 && ext.Geom.onSegment(p2, q1, q2))return true;
      
      return false; // Doesn't fall in any of the above cases
  }
  Line.doesIntersect = function(line1, line2, acceptEndsMeet)
  {
      if(!line1 || !line2) return false;
      if(line1 instanceof ext.Bezier){
        return line1.doesIntersect(line2, acceptEndsMeet);
      }
      if(line2 instanceof ext.Bezier){
        return line2.doesIntersect(line1, acceptEndsMeet);
      }

      var p1s;
      var p1e;
      if(line1.p1 && line1.p2) {
        p1s = line1.p1;
        p1e = line1.p2;
      }
      if(line1 instanceof Array && line1.length > 1) {
        p1s = line1[0];
        p1e = line1[line1.length-1];
      }
      var p2s;
      var p2e;
      if(line2.p1 && line2.p2) {
        p2s = line2.p1;
        p2e = line2.p2;
      }
      if(line2 instanceof Array && line2.length > 1) {
        p2s = line2[0];
        p2e = line2[line2.length-1];
      }
      if(p1s && p1e && p2s && p2e) return Line.lineDoesIntersect(p1s, p1e, p2s, p2e, acceptEndsMeet);
      return false;
  }

  var utils = ext.BezierUtils;

  Line.prototype = {
    doesIntersect: function(line) {
      return Line.intersects(this, line);
    },

    bbox:function(){
      var minX,maxX,minY,maxY;

      if(this.p1.x < this.p2.x){
        minX = this.p1.x;
        maxX = this.p2.x;
      }else{
        minX = this.p2.x;
        maxX = this.p1.x;
      }

      if(this.p1.y < this.p2.y){
        minY = this.p1.y;
        maxY = this.p2.y;
      }else{
        minY = this.p2.y;
        maxY = this.p1.y;
      }

      return {
          x:{ min:minX, mid:(minX+maxX)/2, max:maxX, size:maxX-minX },
          y:{ min:minY, mid:(minY+maxY)/2, max:maxY, size:maxY-minY }
        };
    },
    toString: function() {
      return utils.pointsToString(this.points);
    }
  };

  ext.extend({Line:Line});
})(extensible);