(function(ext){
	MathUtils = {};
	ext.MathUtils = MathUtils;
	MathUtils.transformPoint=function(matrix, x, y, doTranslate){
	    var result = new ext.Point(
	        (x*matrix.a)+(y*matrix.c),
	        (x*matrix.b)+(y*matrix.d)
	    );
	    if(doTranslate==null || doTranslate){
	    	result.x += matrix.tx;
	    	result.y += matrix.ty;
	    }

	    return result;
	}
})(extensible)
