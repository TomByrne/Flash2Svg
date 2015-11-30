(function(ext){

    var Geom = {};

    Geom.POSITIVE_INFINITY = 100000000000000000000000000000000;

    
    // Project point
    Geom.projectPoint = function(rads, dist, fromX, fromY)
    {
        var ret = {x:(fromX==null ? 0 : fromX), y:(fromY==null ? 0 : fromY)};
        ret.x += Math.sin(rads) * dist;
        ret.y += Math.cos(rads) * dist;
        return ret;
    }
     

    // Given three colinear points p, q, r, the function checks if
    // point q lies on line segment 'pr'
    Geom.onSegment = function(p, q, r)
    {
        if (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
                q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y))
            return true;
        return false;
    }
     
    // To find orientation of ordered triplet (p, q, r).
    // The function returns following values
    // 0 --> p, q and r are colinear
    // 1 --> Clockwise
    // 2 --> Counterclockwise
    Geom.orientation = function(p, q, r)
    {
        var val = (q.y - p.y) * (r.x - q.x) -
                  (q.x - p.x) * (r.y - q.y);
     
        if (val == 0) return 0;  // colinear
        return (val > 0)? 1: 2; // clock or counterclock wise
    }
     
    // The function that returns true if line segment 'p1q1'
    // and 'p2q2' intersect.
    Geom.doIntersect = function(p1, q1, p2, q2, acceptEndsMeet)
    {
        if(acceptEndsMeet===undefined)acceptEndsMeet = true;

        // Find the four orientations needed for general and
        // special cases
        var o1 = Geom.orientation(p1, q1, p2);
        var o2 = Geom.orientation(p1, q1, q2);
        var o3 = Geom.orientation(p2, q2, p1);
        var o4 = Geom.orientation(p2, q2, q1);
     
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
        if (o1 == 0 && Geom.onSegment(p1, p2, q1))return true;
     
        // p1, q1 and p2 are colinear and q2 lies on segment p1q1
        if (o2 == 0 && Geom.onSegment(p1, q2, q1))return true;
     
        // p2, q2 and p1 are colinear and p1 lies on segment p2q2
        if (o3 == 0 && Geom.onSegment(p2, p1, q2))return true;
     
         // p2, q2 and q1 are colinear and q1 lies on segment p2q2
        if (o4 == 0 && Geom.onSegment(p2, q1, q2))return true;
        
        return false; // Doesn't fall in any of the above cases
    }
     
    // Returns true if the point p lies inside the polygon[] with n vertices
    Geom.isInside = function(polygon, p)
    {
        var n = polygon.length;

        // There must be at least 3 vertices in polygon[]
        if (n < 3)  return false;
     
        // Create a point for line segment from p to infinite
        var extreme = {x:Math.POSITIVE_INFINITY, y:p.y};
     
        // Count intersections of the above line with sides of polygon
        var count = 0, i = 0;
        do
        {
            var next = (i+1)%n;
     
            // Check if the line segment from 'p' to 'extreme' intersects
            // with the line segment from 'polygon[i]' to 'polygon[next]'
            if (Geom.doIntersect(polygon[i], polygon[next], p, extreme))
            {
                // If the point 'p' is colinear with line segment 'i-next',
                // then check if it lies on segment. If it lies, return true,
                // otherwise false
                if (Geom.orientation(polygon[i], p, polygon[next]) == 0)
                   return Geom.onSegment(polygon[i], p, polygon[next]);
     
                count++;
            }
            i = next;
        } while (i != 0);
     
        // Return true if count is odd, false otherwise
        return count&1;  // Same as (count%2 == 1)
    }

    /*
    To know whether two polygons intersect, check two things:
    - If any segments intersect then polys intersect
    - If a random point from one poly falls inside the other poly (tests for one poly being completely inside the other)
    */
    Geom.intersects = function(polygon1, polygon2)
    {
        var n1 = polygon1.length;
        var n2 = polygon2.length;

        // There must be at least 3 vertices in polygon[]
        if (n1 < 3 || n2 < 3)  return false;

        // pick any point from one polygon to see whether it is inside the other polygon
        var p1 = polygon1[0];
        var p2 = polygon2[0];
     
        // Create a point for line segment from p to infinite
        var extreme1 = {x:Geom.POSITIVE_INFINITY, y:p1.y};
        var extreme2 = {x:Geom.POSITIVE_INFINITY, y:p2.y};
     
        // Count intersections of the above line with sides of polygon
        var count1 = 0, i = 0, onEdge1 = false, lastY1 = null;
        do
        {
            var next1 = (i+1)%n1;

            var p1s = polygon1[i];
            var p1e = polygon1[next1];
     
            // Check if the line segment from 'p' to 'extreme' intersects
            // with the line segment from 'polygon[i]' to 'polygon[next1]'
            /*fl.trace("inter: "+p1s.x+" "+p1s.y+" "+p1e.x+" "+p1e.y);
            fl.trace("\t"+p2.x+" "+p2.y+" "+extreme2.x+" "+extreme2.y);
            fl.trace("\t"+Geom.doIntersect(p1s, p1e, p2, extreme2));*/
            if (p1s.y!=lastY1 && Geom.doIntersect(p1s, p1e, p2, extreme2))
            {
                var ignorePoint = false;
                var onStart = (p1s.y==p2.y);
                var onEnd = (p1e.y==p2.y);
                if(onStart || onEnd){
                    // point is on one end of line
                    var nextNext = onStart ? (i==0? n1-1 : i-1) : (i+2)%n1;
                    var next = polygon1[nextNext];

                    if( (onStart && (p1e.y<p2.y)==(next.y<p2.y)) ||
                        (onEnd && (p1s.y<p2.y)==(next.y<p2.y))){

                        ignorePoint = true;
                    }
                }
                if(!ignorePoint){
                    // If the point 'p' is colinear with line segment 'i-next1',
                    // then check if it lies on segment. If it lies, return true,
                    // otherwise false
                    if (Geom.orientation(p1s, p2, p1e) == 0 && Geom.onSegment(p1s, p2, p1e))
                       onEdge1 = true;
                    
                    count1++;
                    lastY1 = p2.y==p1e.y ? p1e.y : p1s.y;
                }
            }

            var count2 = 0, k = 0, onEdge2 = false, lastY2 = null;
            do
            {
                var next2 = (k+1)%n2;

                var p2s = polygon2[k];
                var p2e = polygon2[next2];
     
                // The same sort of point test for the other poly
                if (p2s.y!=lastY2 && Geom.doIntersect(p2s, p2e, p1, extreme1))
                {
                    var ignorePoint = false;
                    var onStart = (p2s.y==p1.y);
                    var onEnd = (p2e.y==p1.y);
                    if(onStart || onEnd){
                        // point is on one end of line
                        var nextNext = onStart ? (k==0? n2-1 : k-1) : (k+2)%n2;
                        var next = polygon2[nextNext];
                        if( (onStart && (p2e.y<p1.y)==(next.y<p1.y)) ||
                            (onEnd && (p2s.y<p1.y)==(next.y<p1.y))){

                            ignorePoint = true;
                        }
                    }
                    if(!ignorePoint){
                        if (Geom.orientation(p2s, p1, p2e) == 0 && Geom.onSegment(p2s, p1, p2e))
                           onEdge2 = true;
             
                        count2++;
                        lastY2 = p1.y==p2e.y ? p2e.y : p2s.y;
                    }
                }
                
                // Test if two segments intersect, if so then the polygons intersect
                if(Geom.doIntersect(p1s, p1e, p2s, p2e, false)){
                    return true;
                }

                k = next2;
            } while (k != 0);

            if(count2&1 && (!onEdge2 || count2>1)){
                return true;
            }

            i = next1;
        } while (i != 0);
        
        // Return true if count is odd, false otherwise
        return count1&1 && (!onEdge1 || count1>1);  // Same as (count%2 == 1)
    }
    ext.extend({Geom:Geom});
})(extensible);
